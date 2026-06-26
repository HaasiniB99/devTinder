const { GoogleGenerativeAI } = require("@google/generative-ai");
const ConnectionRequest = require("../models/connectionRequest");
const RightNowMatch = require("../models/rightNowMatch");
const User = require("../models/user");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_WINDOW_MS = 30 * 1000;
const SAFE_USER_FIELDS =
  "firstName lastName photoUrl about skills currentlyWorkingOn availableFor age gender";

const formatMatch = (match, user) => ({
  userId: user._id,
  matchReason: match.matchReason,
  relevanceScore: match.relevanceScore,
  user: {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    about: user.about,
    skills: user.skills,
    currentlyWorkingOn: user.currentlyWorkingOn,
    availableFor: user.availableFor,
    age: user.age,
    gender: user.gender,
  },
});

const getCachedResult = async (userId, query) => {
  const cachedMatch = await RightNowMatch.findOne({
    userId,
    query,
    queriedAt: { $gte: new Date(Date.now() - CACHE_WINDOW_MS) },
  })
    .sort({ queriedAt: -1 })
    .populate("matches.userId", SAFE_USER_FIELDS);

  if (!cachedMatch) return null;

  const matches = cachedMatch.matches
    .filter((match) => match.userId)
    .map((match) => formatMatch(match, match.userId));

  return {
    query: cachedMatch.query,
    matches,
    totalCount: matches.length,
    servedFromCache: true,
  };
};

const buildPrompt = (query, candidates) => ({
  system: `You are an open developer discovery engine. The user's search query is the sole matching intent: do not require it to relate to the searching user's skills, current work, availability, or profile. Interpret what the user is actually trying to accomplish, and match candidates based on that underlying intent rather than literal keyword overlap alone. For example, "people who know React to review my project" means the user wants someone who can help with React-related work, so prioritize candidates whose skills, current work, availability, or bio genuinely indicate React expertise or the ability to support that task. Exact or near-exact keyword matches to the query, such as a query mentioning React and a candidate listing React, are strong high-priority matches and should receive the highest relevance when supported by the profile. Also count synonyms, related technologies, and implied skills as valid matches even when the exact query keyword is absent; for a React query, Next.js, Redux, or React Native can imply relevant React knowledge, though these usually rank slightly below exact matches unless the profile makes their relevance especially strong. Reason about the query's underlying need, such as review, collaboration, mentorship, hiring, learning together, or developer interest, and weigh candidates by whether their shared profile information demonstrates the ability to fulfill that need, not just broad topical overlap. The candidate does not need to literally describe the requested role, such as "reviewer"; strong relevant experience is sufficient when it supports the user's need. Overall ranking priority is exact keyword or skill matches first, then strongly related or implied skills, then weaker topical relevance; use relevanceScore to reflect this ordering. Give practical suggestions only when their profile supports the suggestion. Each match reason must be one specific sentence explaining why that candidate fits the query; never use generic phrases such as "similar interests" or "both are developers". Return valid JSON only with no surrounding explanation.`,
  user: `Search query:
${query}

Candidates:
${JSON.stringify(candidates)}

Return a JSON array of at most 5 objects in this exact shape:
[{"userId":"candidate id","matchReason":"one specific sentence explaining why they fit the search query","relevanceScore":0}]

Only include relevanceScore values above 45. Order results by relevanceScore descending.`,
});

const getAiMatches = async (currentUser, query, candidates) => {
  const prompt = buildPrompt(query, candidates);
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fullPrompt = `${prompt.system}\n\n${prompt.user}`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
      const cleanedText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleanedText);

      if (!Array.isArray(parsed)) {
        throw new Error("AI response was not an array");
      }

      return parsed;
    } catch (err) {
      lastError = err;
    }
  }

  console.error("Right Now match generation failed", {
    userId: currentUser._id.toString(),
    error: lastError?.message,
  });
  return [];
};

const findRightNowMatches = async (currentUser, query) => {
  const cachedResult = await getCachedResult(currentUser._id, query);
  if (cachedResult) return cachedResult;

  const connections = await ConnectionRequest.find({
    status: "accepted",
    $or: [
      { fromUserId: currentUser._id },
      { toUserId: currentUser._id },
    ],
  }).select("fromUserId toUserId");

  const excludedUserIds = new Set([currentUser._id.toString()]);
  connections.forEach((connection) => {
    excludedUserIds.add(connection.fromUserId.toString());
    excludedUserIds.add(connection.toUserId.toString());
  });

  const candidates = await User.find({
    _id: { $nin: Array.from(excludedUserIds) },
    lastActiveAt: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) },
  })
    .select(`_id ${SAFE_USER_FIELDS}`)
    .sort({ lastActiveAt: -1 })
    .limit(50);

  if (candidates.length === 0) {
    return {
      query,
      matches: [],
      totalCount: 0,
      servedFromCache: false,
    };
  }

  const aiCandidates = candidates.map((candidate) => ({
    userId: candidate._id.toString(),
    firstName: candidate.firstName,
    skills: candidate.skills || [],
    currentlyWorkingOn: (candidate.currentlyWorkingOn || "").slice(0, 150),
    availableFor: candidate.availableFor || [],
    about: (candidate.about || "").slice(0, 100),
  }));
  const aiMatches = await getAiMatches(currentUser, query, aiCandidates);
  const candidateById = new Map(
    candidates.map((candidate) => [candidate._id.toString(), candidate])
  );
  const matches = aiMatches
    .filter(
      (match) =>
        match?.userId &&
        typeof match.matchReason === "string" &&
        candidateById.has(match.userId.toString()) &&
        Number(match.relevanceScore) > 45
    )
    .map((match) => ({
      userId: match.userId.toString(),
      matchReason: match.matchReason.trim(),
      relevanceScore: Math.min(100, Math.max(0, Number(match.relevanceScore))),
    }))
    .sort((first, second) => second.relevanceScore - first.relevanceScore)
    .slice(0, 5);

  const existingCount = await RightNowMatch.countDocuments({
    userId: currentUser._id,
  });
  if (existingCount >= 10) {
    const oldestMatch = await RightNowMatch.findOne({ userId: currentUser._id })
      .sort({ queriedAt: 1 })
      .select("_id");
    if (oldestMatch) await RightNowMatch.deleteOne({ _id: oldestMatch._id });
  }

  await RightNowMatch.create({
    userId: currentUser._id,
    query,
    matches,
    servedFromCache: false,
  });

  const enrichedMatches = matches.map((match) =>
    formatMatch(match, candidateById.get(match.userId))
  );

  return {
    query,
    matches: enrichedMatches,
    totalCount: enrichedMatches.length,
    servedFromCache: false,
  };
};

module.exports = { findRightNowMatches };
