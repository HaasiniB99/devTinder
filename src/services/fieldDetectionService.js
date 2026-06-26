const OpenAI = require("openai");
const FieldMatch = require("../models/fieldMatch");
const User = require("../models/user");

let client;

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
};

const FIELD_CACHE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MATCH_CACHE_WINDOW_MS = 30 * 1000;
const SAFE_USER_FIELDS =
  "firstName lastName photoUrl skills about age gender primaryField relatedFields";

const isFieldFresh = (user) =>
  user.primaryField &&
  user.fieldLastAnalyzed &&
  new Date(user.fieldLastAnalyzed).getTime() >= Date.now() - FIELD_CACHE_WINDOW_MS;

const extractJsonText = (response) =>
  response.choices?.[0]?.message?.content?.trim() || "";

const parseJsonResponse = (text) => {
  const cleanedText = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleanedText);
};

const normalizeRelatedFields = (relatedFields) =>
  Array.isArray(relatedFields)
    ? relatedFields
        .filter((field) => typeof field === "string" && field.trim())
        .map((field) => field.trim())
        .slice(0, 4)
    : [];

const parseFieldDetection = (text) => {
  const parsed = parseJsonResponse(text);
  if (
    !parsed ||
    typeof parsed.primaryField !== "string" ||
    !Array.isArray(parsed.relatedFields)
  ) {
    throw new Error("AI response did not include the required field keys");
  }

  return {
    primaryField: parsed.primaryField.trim(),
    relatedFields: normalizeRelatedFields(parsed.relatedFields),
  };
};

const detectUserField = async (user, force = false) => {
  if (!force && isFieldFresh(user)) {
    return {
      primaryField: user.primaryField,
      relatedFields: user.relatedFields || [],
    };
  }

  const skills = Array.isArray(user.skills) ? user.skills : [];
  const about = (user.about || "").slice(0, 200);

  if (skills.length < 3 && about.length < 20) {
    return null;
  }

  const systemPrompt = `You are a software engineering career analyst. Your job is to read a developer's profile and determine their primary field of work and up to 4 closely related fields. Understand context, not just keywords: someone who lists React, Node.js, MongoDB, and Express is a Full Stack developer even if they did not write that phrase anywhere. Someone who lists TensorFlow, PyTorch, Python, and Pandas is a Machine Learning engineer. Return valid JSON only with no explanation text around it.`;
  const userPrompt = `Developer profile:
Skills: ${skills.join(", ")}
Bio: ${about}
Existing detected primary field: ${user.primaryField || ""}

Return a JSON object with exactly two keys:
{
  "primaryField": "single software development field",
  "relatedFields": ["up to 4 closely related fields"]
}`;

  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await getClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      });
      const detectedFields = parseFieldDetection(extractJsonText(response));

      if (!detectedFields.primaryField) {
        throw new Error("AI response primaryField was empty");
      }

      await User.findByIdAndUpdate(user._id, {
        primaryField: detectedFields.primaryField,
        relatedFields: detectedFields.relatedFields,
        fieldLastAnalyzed: new Date(),
      });

      user.primaryField = detectedFields.primaryField;
      user.relatedFields = detectedFields.relatedFields;
      user.fieldLastAnalyzed = new Date();

      return detectedFields;
    } catch (err) {
      lastError = err;
    }
  }

  console.error("Field detection failed", {
    userId: user._id.toString(),
    error: lastError?.message,
  });
  return null;
};

const normalizeField = (field) => field.toLowerCase().trim();

const hasField = (fields, field) =>
  fields.map(normalizeField).includes(normalizeField(field));

const scoreCandidate = (currentUser, candidate) => {
  const currentPrimaryField = currentUser.primaryField || "";
  const currentRelatedFields = currentUser.relatedFields || [];
  const candidatePrimaryField = candidate.primaryField || "";
  const candidateRelatedFields = candidate.relatedFields || [];

  if (!currentPrimaryField || !candidatePrimaryField) return 0;

  if (normalizeField(candidatePrimaryField) === normalizeField(currentPrimaryField)) {
    return 95;
  }

  if (hasField(currentRelatedFields, candidatePrimaryField)) {
    return 82;
  }

  if (hasField(candidateRelatedFields, currentPrimaryField)) {
    return 62;
  }

  const currentRelatedSet = new Set(currentRelatedFields.map(normalizeField));
  const hasRelatedOverlap = candidateRelatedFields
    .map(normalizeField)
    .some((field) => currentRelatedSet.has(field));

  return hasRelatedOverlap ? 42 : 0;
};

const fallbackReason = (currentUser, candidate) =>
  `${candidate.firstName} works in ${candidate.primaryField}, which connects with your ${currentUser.primaryField} focus through related fields like ${(candidate.relatedFields || [])
    .slice(0, 2)
    .join(", ") || "shared software interests"}.`;

const generateMatchReasons = async (currentUser, candidates) => {
  if (candidates.length === 0) return new Map();

  const systemPrompt = `You are writing brief match explanations for a developer networking app. Each explanation must be one specific sentence that tells the user exactly why this other developer is relevant to their work. Reference both people's fields specifically. Never use generic phrases. Return a JSON array only.`;
  const userPrompt = `Current user:
Primary field: ${currentUser.primaryField}
Related fields: ${(currentUser.relatedFields || []).join(", ")}

Candidates:
${JSON.stringify(
  candidates.map((candidate) => ({
    userId: candidate._id.toString(),
    primaryField: candidate.primaryField,
    relatedFields: candidate.relatedFields || [],
    skills: candidate.skills || [],
  }))
)}

Return a JSON array where each item has the candidate ID and a one-sentence matchReason string:
[{"userId":"candidate id","matchReason":"one specific sentence"}]`;

  try {
    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    });
    const parsed = parseJsonResponse(extractJsonText(response));
    if (!Array.isArray(parsed)) {
      throw new Error("AI response was not an array");
    }

    return new Map(
      parsed
        .filter(
          (item) =>
            item?.userId &&
            typeof item.matchReason === "string" &&
            item.matchReason.trim()
        )
        .map((item) => [item.userId.toString(), item.matchReason.trim()])
    );
  } catch (err) {
    console.error("Field match reason generation failed", {
      userId: currentUser._id.toString(),
      error: err.message,
    });
    return new Map();
  }
};

const formatUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  photoUrl: user.photoUrl,
  skills: user.skills || [],
  about: user.about,
  age: user.age,
  gender: user.gender,
  primaryField: user.primaryField,
  relatedFields: user.relatedFields || [],
});

const getCachedMatches = async (userId) => {
  const cachedMatch = await FieldMatch.findOne({
    userId,
    computedAt: { $gte: new Date(Date.now() - MATCH_CACHE_WINDOW_MS) },
  })
    .sort({ computedAt: -1 })
    .populate("matches.userId", SAFE_USER_FIELDS);

  if (!cachedMatch) return null;

  const matches = cachedMatch.matches
    .filter((match) => match.userId)
    .map((match) => ({
      user: formatUser(match.userId),
      detectedField: match.detectedField,
      relevanceScore: match.relevanceScore,
      matchReason: match.matchReason,
    }));

  return {
    matches,
    totalCount: matches.length,
    servedFromCache: true,
  };
};

const findFieldMatches = async (currentUser) => {
  const currentField = await detectUserField(currentUser);
  if (!currentField) {
    return {
      matches: [],
      totalCount: 0,
      incompleteProfile: true,
      message: "Add more skills and a bio to your profile so we can detect your field",
    };
  }

  const cachedMatches = await getCachedMatches(currentUser._id);
  if (cachedMatches) return cachedMatches;

  const candidates = await User.find({
    _id: { $ne: currentUser._id },
  }).select(`_id ${SAFE_USER_FIELDS}`);

  const candidatesNeedingDetection = candidates
    .filter(
      (candidate) =>
        !candidate.primaryField &&
        Array.isArray(candidate.skills) &&
        candidate.skills.length >= 3
    )
    .sort((first, second) => second.skills.length - first.skills.length)
    .slice(0, 20);

  for (const candidate of candidatesNeedingDetection) {
    await detectUserField(candidate);
  }

  const scoredCandidates = candidates
    .filter((candidate) => candidate.primaryField)
    .map((candidate) => ({
      candidate,
      relevanceScore: scoreCandidate(currentUser, candidate),
    }))
    .filter((match) => match.relevanceScore > 0)
    .sort((first, second) => second.relevanceScore - first.relevanceScore);

  const topCandidatesForReasons = scoredCandidates
    .slice(0, 10)
    .map((match) => match.candidate);
  const reasonsByUserId = await generateMatchReasons(
    currentUser,
    topCandidatesForReasons
  );

  const matches = scoredCandidates.slice(0, 20).map(({ candidate, relevanceScore }) => ({
    user: formatUser(candidate),
    detectedField: candidate.primaryField,
    relevanceScore,
    matchReason:
      reasonsByUserId.get(candidate._id.toString()) ||
      fallbackReason(currentUser, candidate),
  }));

  await FieldMatch.create({
    userId: currentUser._id,
    matches: matches.map((match) => ({
      userId: match.user._id,
      detectedField: match.detectedField,
      relevanceScore: match.relevanceScore,
      matchReason: match.matchReason,
    })),
    isCached: false,
  });

  return {
    matches,
    totalCount: matches.length,
    servedFromCache: false,
  };
};

module.exports = { detectUserField, findFieldMatches };
