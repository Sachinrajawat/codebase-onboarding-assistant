export default function CitationLink({ citation, index }) {
  if (!citation) return null;
  const lineRange =
    citation.startLine && citation.endLine && citation.startLine !== citation.endLine
      ? `${citation.startLine}-${citation.endLine}`
      : citation.startLine || "";

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noreferrer"
      className="group block"
      title={`${citation.filePath}:${lineRange}`}
    >
      <div className="flex items-baseline gap-2 font-mono text-[12px]">
        <span className="text-ink-faint">[{String(index + 1).padStart(2, "0")}]</span>
        <span className="text-ink group-hover:text-accent">
          {citation.filePath}
          {lineRange && (
            <span className="text-ink-muted">:{lineRange}</span>
          )}
        </span>
      </div>
      {(citation.name || typeof citation.score === "number") && (
        <div className="mt-0.5 pl-7 font-mono text-[11px] text-ink-faint">
          {citation.name && (
            <span className="text-ink-muted">{citation.name}</span>
          )}
          {citation.name && typeof citation.score === "number" && (
            <span className="mx-1.5 text-ink-faint">·</span>
          )}
          {typeof citation.score === "number" && (
            <span>match {(citation.score * 100).toFixed(0)}%</span>
          )}
        </div>
      )}
    </a>
  );
}
