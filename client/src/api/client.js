import axios from "axios";

// Vite proxy forwards /api -> http://localhost:5000 in dev.
// In production set VITE_API_BASE to the deployed backend URL.
const baseURL = import.meta.env.VITE_API_BASE || "/api";

export const api = axios.create({
  baseURL,
  timeout: 0, // indexing can take a while; let the server decide
});

export async function analyzeRepo(repoUrl, { force = false } = {}) {
  const { data } = await api.post("/repos/analyze", { repoUrl, force });
  return data.repo;
}

export async function getRepo(repoId) {
  const { data } = await api.get(`/repos/${repoId}`);
  return data.repo;
}

// Streaming chat via fetch + ReadableStream parsing of Server-Sent Events.
// `onEvent({ type, data })` is called per SSE frame.
// Returns a cancel function.
export function streamChat({ repoId, sessionId, message, onEvent, onError, onDone }) {
  const controller = new AbortController();

  (async () => {
    try {
      const resp = await fetch(`${baseURL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId, sessionId, message }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Chat request failed: ${resp.status} ${text}`);
      }
      if (!resp.body) {
        throw new Error("No response body (streaming not supported by this browser).");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawFrame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          let event = "message";
          const dataLines = [];
          for (const line of rawFrame.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }
          if (dataLines.length === 0) continue;
          let payload;
          try {
            payload = JSON.parse(dataLines.join("\n"));
          } catch {
            payload = dataLines.join("\n");
          }
          onEvent?.({ type: event, data: payload });
        }
      }
      onDone?.();
    } catch (err) {
      if (err.name === "AbortError") return;
      onError?.(err);
    }
  })();

  return () => controller.abort();
}
