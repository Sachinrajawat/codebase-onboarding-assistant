import { useState } from "react";

export default function RepoInput({ onSubmit, loading, error }) {
  const [url, setUrl] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  }

  const examples = [
    { slug: "tj/commander.js", url: "https://github.com/tj/commander.js" },
    { slug: "expressjs/express", url: "https://github.com/expressjs/express" },
    { slug: "sindresorhus/got", url: "https://github.com/sindresorhus/got" },
  ];

  return (
    <section className="mx-auto max-w-3xl">
      {/* Eyebrow → serif headline → mono subtitle. Magazine-cover layout. */}
      <p className="eyebrow mb-3">— a small experiment in retrieval over code</p>
      <h1 className="font-serif text-[40px] leading-[1.1] tracking-tight text-ink sm:text-[52px]">
        Read any codebase{" "}
        <span className="italic text-accent-soft">like a colleague</span>{" "}
        already does.
      </h1>
      <p className="mt-5 max-w-xl font-sans text-[15px] leading-relaxed text-ink-muted">
        Drop a public GitHub repo and chat with it. The backend clones, splits
        the code on function and class boundaries, embeds the chunks, and
        answers grounded only in what it retrieves — citing exact files and
        line numbers.
      </p>

      {/* Input — looks like a shell prompt, not a SaaS form */}
      <form onSubmit={handleSubmit} className="mt-10">
        <label
          htmlFor="repo-url"
          className="eyebrow block mb-2"
        >
          $ analyze
        </label>
        <div className="flex border border-rule bg-bg-sub focus-within:border-accent">
          <span className="prompt-prefix flex items-center pl-3 pr-2 text-sm">
            ›
          </span>
          <input
            id="repo-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            disabled={loading}
            autoFocus
            className="flex-1 bg-transparent py-3 pr-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="border-l border-rule bg-transparent px-5 font-mono text-xs font-semibold uppercase tracking-wider2 text-accent transition hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                indexing
                <span className="inline-block animate-caret">_</span>
              </span>
            ) : (
              "↵ analyze"
            )}
          </button>
        </div>

        {error && (
          <p className="mt-3 border-l-2 border-bad bg-bad/5 px-3 py-2 font-mono text-[12px] text-bad">
            {error}
          </p>
        )}

        <p className="eyebrow mt-6 mb-2">examples</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[12.5px]">
          {examples.map((ex, i) => (
            <li key={ex.slug} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUrl(ex.url)}
                className="text-ink-muted transition hover:text-accent"
              >
                {ex.slug}
              </button>
              {i < examples.length - 1 && (
                <span aria-hidden className="text-ink-faint">·</span>
              )}
            </li>
          ))}
        </ul>
      </form>

      {/* Annotated list — replaces the usual three-up feature card grid */}
      <ul className="mt-16 space-y-5 font-sans text-[14px] text-ink-muted">
        <li className="flex gap-4">
          <span className="eyebrow shrink-0 pt-1.5 w-16 text-ink-faint">
            01 chunk
          </span>
          <p>
            <span className="text-ink">tree-sitter splits code on AST
            boundaries</span> — every chunk is a self-contained function,
            class, or method, not an arbitrary 50-line slice.
          </p>
        </li>
        <li className="flex gap-4">
          <span className="eyebrow shrink-0 pt-1.5 w-16 text-ink-faint">
            02 retrieve
          </span>
          <p>
            <span className="text-ink">cosine search in qdrant + exact
            symbol-name lookup</span> — pure vector misses "where is{" "}
            <code className="font-mono text-accent-soft">parseAsync</code>{" "}
            defined". The hybrid layer doesn't.
          </p>
        </li>
        <li className="flex gap-4">
          <span className="eyebrow shrink-0 pt-1.5 w-16 text-ink-faint">
            03 cite
          </span>
          <p>
            <span className="text-ink">every answer ships with deep links</span>{" "}
            back to <code className="font-mono text-accent-soft">
            file:lineStart-lineEnd
            </code>{" "}
            on github. No claim without a source.
          </p>
        </li>
      </ul>
    </section>
  );
}
