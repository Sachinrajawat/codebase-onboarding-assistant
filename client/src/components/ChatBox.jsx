import { useEffect, useRef, useState } from "react";
import { Send, Loader2, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import CitationLink from "./CitationLink.jsx";
import { streamChat } from "../api/client.js";

const SUGGESTIONS = [
  "What does this repo do?",
  "Where is the main entry point?",
  "How is authentication handled?",
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
    // Auto-scroll to bottom as messages grow.
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
          setStreaming(false);
        }
      },
      onError: (err) => {
        setError(err.message || "Streaming failed.");
        setStreaming(false);
      },
      onDone: () => {
        setStreaming(false);
      },
    });
    cancelRef.current = cancel;
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-medium text-slate-200">Chat with the codebase</h2>
        <p className="text-xs text-slate-500">
          Answers are grounded in retrieved chunks; check the citations on the right.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div>
            <p className="mb-3 text-sm text-slate-400">
              Try one of these to start:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="pill hover:border-brand-500 hover:text-brand-400"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}

        {error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 px-4 py-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask anything about this repo… (Shift+Enter for newline)"
            rows={1}
            className="input max-h-32 min-h-[2.5rem] resize-none"
            disabled={streaming}
          />
          <button type="submit" className="btn-primary" disabled={streaming || !input.trim()}>
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}

function Message({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
          <Bot size={14} />
        </span>
      )}
      <div className={`max-w-[85%] ${isUser ? "order-1" : ""}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-sm bg-brand-600/90 px-4 py-2 text-sm text-white shadow-sm"
              : "rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-100"
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown">
              {message.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : message.streaming ? (
                <StreamingDots />
              ) : null}
            </div>
          )}
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {message.citations.slice(0, 6).map((c, idx) => (
              <CitationLink key={idx} citation={c} index={idx} />
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
          <User size={14} />
        </span>
      )}
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-slate-400" />
      <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-slate-400 [animation-delay:200ms]" />
      <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-slate-400 [animation-delay:400ms]" />
    </span>
  );
}
