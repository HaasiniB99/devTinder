const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic(); // uses process.env.ANTHROPIC_API_KEY

const messageBuffers = new Map(); // roomId → [{ senderName, text }]
const idleTimers     = new Map(); // roomId → timeout

const SUMMARY_THRESHOLD = 10;   // trigger after 10 messages
const IDLE_TIMEOUT_MS   = 8000; // or after 8s of silence

function handleMessageForSummary(io, roomId, message) {
  if (!messageBuffers.has(roomId)) messageBuffers.set(roomId, []);

  const buffer = messageBuffers.get(roomId);
  buffer.push(message);

  // Reset idle timer on every new message
  clearTimeout(idleTimers.get(roomId));
  idleTimers.set(
    roomId,
    setTimeout(() => {
      if (buffer.length >= 3) triggerSummary(io, roomId);
    }, IDLE_TIMEOUT_MS)
  );

  // Count-based trigger
  if (buffer.length >= SUMMARY_THRESHOLD) {
    clearTimeout(idleTimers.get(roomId));
    triggerSummary(io, roomId);
  }
}

async function triggerSummary(io, roomId) {
  const buffer = messageBuffers.get(roomId);
  if (!buffer?.length) return;

  const snapshot = [...buffer];    // copy before clearing
  messageBuffers.set(roomId, []); // clear so next batch is fresh

  io.to(roomId).emit("summary:start");

  const formatted = snapshot
    .map((m) => `${m.senderName}: ${m.text}`)
    .join("\n");

  const prompt = `You are summarizing a private developer networking chat.
Be concise and specific. Do not use bullet points.

Conversation:
${formatted}

Write 2-3 sentences covering: main topic, any decisions made, and open questions.
Start directly with the content — no preamble.`;

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        io.to(roomId).emit("summary:token", { token: chunk.delta.text });
      }
    }

    io.to(roomId).emit("summary:done");
  } catch (err) {
    console.error("[summarizer] stream error:", err.message);
    io.to(roomId).emit("summary:error", {
      message: "Could not generate summary.",
    });
  }
}

module.exports = { handleMessageForSummary };