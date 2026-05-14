import { FileCode2, ExternalLink } from "lucide-react";

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
      className="group flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 transition hover:border-brand-500/60 hover:bg-slate-800/60"
      title={`${citation.filePath}:${lineRange}`}
    >
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-600/20 text-[10px] font-semibold text-brand-400">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 truncate font-mono text-slate-200">
          <FileCode2 size={12} className="shrink-0 text-slate-500" />
          <span className="truncate">{citation.filePath}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
          {lineRange && <span>lines {lineRange}</span>}
          {citation.name && (
            <span className="truncate">
              · <span className="text-slate-400">{citation.name}</span>
            </span>
          )}
          {typeof citation.score === "number" && (
            <span>· {(citation.score * 100).toFixed(0)}%</span>
          )}
        </span>
      </span>
      <ExternalLink
        size={12}
        className="mt-0.5 shrink-0 text-slate-600 transition group-hover:text-brand-400"
      />
    </a>
  );
}
