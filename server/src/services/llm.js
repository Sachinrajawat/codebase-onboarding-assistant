const OpenAI = require("openai");
const env = require("../config/env");

let _client = null;
function client() {
  if (!_client) {
    if (!env.openai.apiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    _client = new OpenAI({
      apiKey: env.openai.apiKey,
      baseURL: env.openai.baseURL,
    });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are a senior engineer helping someone understand a codebase.
Use ONLY the provided code chunks (RETRIEVED CONTEXT) as the source of truth.
When you reference specific code, cite it inline with the format [<filePath>:<startLine>-<endLine>], using ONLY paths and line numbers that appear in the RETRIEVED CONTEXT headers.
Never invent file names, function names, or line numbers; if the answer isn't in the retrieved chunks, say "I don't see that in the indexed code" instead of guessing.
Be concise. Prefer short paragraphs and bullet points over long prose.`;

function formatChunksAsContext(chunks) {
  return chunks
    .map((c, i) => {
      const m = c.payload || c.metadata || {};
      const header = `[#${i + 1}] ${m.filePath || "unknown"}:${m.startLine || "?"}-${m.endLine || "?"} (${m.type || "code"}${m.name ? ` ${m.name}` : ""})`;
      const body = (c.payload && c.payload.content) || c.content || "";
      return `${header}\n\`\`\`${m.language || ""}\n${body}\n\`\`\``;
    })
    .join("\n\n");
}

// Build messages for a chat completion. `history` is an array of
// { role, content } pairs (the user's previous turns); we keep it bounded.
function buildChatMessages({ chunks, history, userQuestion }) {
  const context = formatChunksAsContext(chunks);
  const trimmedHistory = (history || []).slice(-6);

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `RETRIEVED CONTEXT:\n\n${context || "(no chunks retrieved)"}`,
    },
    ...trimmedHistory,
    { role: "user", content: userQuestion },
  ];
}

// Stream chat tokens. Calls `onToken(text)` for each delta and resolves when
// done. Returns the full assembled answer.
async function streamChat({ chunks, history, userQuestion, onToken }) {
  const messages = buildChatMessages({ chunks, history, userQuestion });
  const stream = await client().chat.completions.create({
    model: env.openai.chatModel,
    messages,
    stream: true,
    temperature: 0.2,
    max_tokens: 700,
  });

  let full = "";
  for await (const part of stream) {
    const delta = part.choices?.[0]?.delta?.content;
    if (delta) {
      full += delta;
      if (onToken) onToken(delta);
    }
  }
  return full;
}

// One-shot non-streamed completion, used for the architecture overview.
async function generateArchitectureSummary({ repoName, topChunks }) {
  const context = formatChunksAsContext(topChunks.slice(0, 12));
  const resp = await client().chat.completions.create({
    model: env.openai.chatModel,
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content:
          "You are a staff engineer summarizing a codebase architecture for a new contributor. Produce a tight overview: (1) what the project does (best guess), (2) major modules/folders and their roles, (3) the request/data flow if discernible. Be honest about uncertainty. Reference file paths in backticks.",
      },
      {
        role: "user",
        content: `Repo: ${repoName}\n\nRepresentative code chunks:\n\n${context}\n\nWrite the overview.`,
      },
    ],
  });
  return resp.choices?.[0]?.message?.content?.trim() || "";
}

module.exports = {
  streamChat,
  generateArchitectureSummary,
  formatChunksAsContext,
  SYSTEM_PROMPT,
};
