import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import CitationLink from "./CitationLink.jsx";
import { streamChat } from "../api/client.js";

const SUGGESTIONS = [
  "What does this repo do?",
  "Where is the main entry point?",
  "Walk me through the request flow.",
  "What tests exist and what do they cover?",
];

export default function ChatBox({ repoId }) {
  const [messages, setMessages] = useState([]); // { role, content, citations }
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  function sendMessage(text) {
    const question = (text ?? input).trim();
    if (!question || streaming) return;
    setError("");
    setInput("");

    const userMsg = { role: "user", content: question };
    const placeholderAssistant = {
      role: "assistant",
      content: "",
      citations: [],
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, placeholderAssistant]);
    setStreaming(true);

    const cancel = streamChat({
      repoId,
      sessionId,
      message: question,
      onEvent: ({ type, data }) => {
        if (type === "meta") {
          if (data.sessionId) setSessionId(data.sessionId);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              last.citations = data.citations || [];
            }
            return next;
          });
        } else if (type === "token") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              last.content += data.delta || "";
            }
            return next;
          });
        } else if (type === "done") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              last.streaming = false;
              if (data.fullText) last.content = data.fullText;
            }
            return next;
          });
          setStreaming(false);
        } else if (type === "error") {
          setError(data.error || "Stream error");
          dropEmptyAssistantPlaceholder();
          setStreaming(false);
        }
      },
      onError: (err) => {
        setError(err.message || "Streaming failed.");
        dropEmptyAssistantPlaceholder();
        setStreaming(false);
      },
      onDone: () => {
        setStreaming(false);
      },
    });

    // Helper: remove the trailing assistant message if it never received
    // any tokens. Otherwise the UI shows a permanent "..." (StreamingDots)
    // next to a failed turn.
    function dropEmptyAssistantPlaceholder() {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    }
    cancelRef.current = cancel;
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  return (
    <section className="panel flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-ruleSoft px-5 py-4">
        <p className="eyebrow">conversation</p>
        <p className="mt-1 font-mono text-[11px] text-ink-faint">
          answers grounded in retrieved chunks · citations beneath each reply
        </p>
      </header>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-8 overflow-y-auto px-6 py-6"
      >
        {messages.length === 0 && (
          <div>
            <p className="eyebrow mb-3">try one of these</p>
            <ul className="space-y-1.5 font-mono text-[13px]">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => sendMessage(s)}
                    className="text-ink-muted transition hover:text-accent"
                  >
                    <span className="text-ink-faint">›</span> {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}

        {error && (
          <div className="border-l-2 border-bad bg-bad/5 px-3 py-2 font-mono text-[12px] text-bad">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-ruleSoft bg-bg-sub px-4 py-3"
      >
        <div className="flex items-end gap-2">
          <span className="prompt-prefix pb-2.5 pl-1 font-mono text-sm">
            ›
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="ask anything about this repo... (shift+enter for newline)"
            rows={1}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none border-0 bg-transparent px-1 py-2 font-mono text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="border border-accent px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider2 text-accent transition hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            {streaming ? (
              <span className="inline-flex items-center gap-1.5">
                streaming
                <span className="inline-block animate-caret">_</span>
              </span>
            ) : (
              "send ↵"
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

function Message({ message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="font-mono text-[13px]">
        <div className="flex items-baseline gap-2">
          <span className="text-accent">›</span>
          <span className="eyebrow text-ink-faint">you</span>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap pl-5 text-ink">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow mb-2 text-accent-soft">// answer</p>
      <div className="markdown">
        {message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        ) : message.streaming ? (
          <StreamingDots />
        ) : null}
      </div>

      {message.citations && message.citations.length > 0 && (
        <div className="mt-4 border-t border-ruleSoft pt-3">
          <p className="eyebrow mb-2">sources</p>
          <ul className="space-y-1.5">
            {message.citations.slice(0, 6).map((c, idx) => (
              <li key={idx}>
                <CitationLink citation={c} index={idx} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1 w-1 animate-pulse-dot bg-ink-muted" />
      <span
        className="h-1 w-1 animate-pulse-dot bg-ink-muted"
        style={{ animationDelay: "200ms" }}
      />
      <span
        className="h-1 w-1 animate-pulse-dot bg-ink-muted"
        style={{ animationDelay: "400ms" }}
      />
    </span>
  );
}
