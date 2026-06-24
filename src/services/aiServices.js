const OpenAI = require("openai");

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

const generateDrafts = async ({
  myProfile,
  targetProfile,
  chatHistory,
  tone,
}) => {
  const mySkills = myProfile?.skills || [];
  const targetSkills = targetProfile?.skills || [];

  const prompt = `
You are helping a user communicate naturally in a developer networking app.

Context:
- My skills: ${mySkills.join(", ")}
- Other person skills: ${targetSkills.join(", ")}
- Chat so far: "${chatHistory}"
- Tone: ${tone}

Generate 3 short, human-like replies.
Keep each under 2 lines.

Return only valid JSON in this format:
{
  "drafts": ["...", "...", "..."]
}
`;

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content);
};

module.exports = { generateDrafts };
