import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatNumber(n) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function ArchitectureView({ repo }) {
  if (!repo) return null;
  const langs = repo.stats?.languages || {};
  const langEntries =
    langs instanceof Map ? Array.from(langs.entries()) : Object.entries(langs);

  return (
    <aside className="panel flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-ruleSoft px-5 pt-5 pb-4">
        <p className="eyebrow">repository</p>
        <h2 className="mt-1 font-serif text-[22px] leading-tight text-ink">
          <span className="text-ink-muted">{repo.owner}</span>
          <span className="mx-1 text-ink-faint">/</span>
          <span>{repo.name}</span>
        </h2>
        <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
          branch <span className="text-ink-muted">{repo.defaultBranch}</span>
          {repo.lastIndexedAt && (
            <>
              {" · indexed "}
              {new Date(repo.lastIndexedAt).toLocaleString()}
            </>
          )}
        </p>
      </header>

      {/* Stats — single mono line, not three boxed cards */}
      <div className="flex items-baseline gap-6 border-b border-ruleSoft px-5 py-4 font-mono text-[12px]">
        <Stat label="files" value={formatNumber(repo.stats?.files)} />
        <Stat label="chunks" value={formatNumber(repo.stats?.chunks)} />
        <Stat label="lines" value={formatNumber(repo.stats?.lines)} />
      </div>

      {/* Languages — minimal tag row */}
      {langEntries.length > 0 && (
        <div className="border-b border-ruleSoft px-5 py-4">
          <p className="eyebrow mb-2">languages</p>
          <div className="flex flex-wrap gap-1.5">
            {langEntries.map(([lang, count]) => (
              <span key={lang} className="tag">
                <span>{lang}</span>
                <span className="text-ink-faint">·</span>
                <span className="text-ink-muted">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Architecture overview — serif essay style */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="eyebrow mb-3">architecture overview</p>
        {repo.architectureSummary ? (
          <div className="markdown text-[14.5px] leading-7">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {repo.architectureSummary}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="font-sans text-sm italic text-ink-faint">
            No overview was generated for this repo.
          </p>
        )}
      </div>
    </aside>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-serif text-[20px] tabular-nums text-ink">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider2 text-ink-faint">
        {label}
      </span>
    </div>
  );
}
