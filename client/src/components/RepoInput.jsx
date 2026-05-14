import { useState } from "react";
import { Github, Loader2, Sparkles } from "lucide-react";

export default function RepoInput({ onSubmit, loading, error }) {
  const [url, setUrl] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  }

  const examples = [
    "https://github.com/sindresorhus/got",
    "https://github.com/tj/commander.js",
    "https://github.com/expressjs/express",
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
            <Github size={18} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              Drop a GitHub repo
            </h1>
            <p className="text-xs text-slate-400">
              We clone it, chunk it by function/class, embed it, and let you
              chat with the codebase.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="input flex-1"
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Indexing…" : "Analyze"}
          </button>
        </form>

        {error && (
          <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Try an example
          </p>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setUrl(ex)}
                className="pill hover:border-brand-500 hover:text-brand-400"
              >
                {ex.replace("https://github.com/", "")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-6 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
        <li className="card p-4">
          <p className="mb-1 font-medium text-slate-200">AST-aware chunking</p>
          <p>tree-sitter splits code on function and class boundaries.</p>
        </li>
        <li className="card p-4">
          <p className="mb-1 font-medium text-slate-200">Hybrid retrieval</p>
          <p>Vector search + symbol-name lookup, top-K into the prompt.</p>
        </li>
        <li className="card p-4">
          <p className="mb-1 font-medium text-slate-200">Cited answers</p>
          <p>Every response links back to the exact lines on GitHub.</p>
        </li>
      </ul>
    </div>
  );
}
