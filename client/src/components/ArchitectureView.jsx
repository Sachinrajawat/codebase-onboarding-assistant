import { Folder, Layers, FileCode2, Hash } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatNumber(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function ArchitectureView({ repo }) {
  if (!repo) return null;
  const langs = repo.stats?.languages || {};
  const langEntries =
    langs instanceof Map ? Array.from(langs.entries()) : Object.entries(langs);

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-slate-500">Repository</p>
        <h2 className="truncate text-base font-semibold text-slate-100">
          {repo.owner}/{repo.name}
        </h2>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          branch <span className="font-mono">{repo.defaultBranch}</span>
          {repo.lastIndexedAt && (
            <>
              {" · "}
              indexed{" "}
              {new Date(repo.lastIndexedAt).toLocaleString()}
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-slate-800 px-4 py-3 text-center">
        <Stat icon={<FileCode2 size={14} />} label="files" value={formatNumber(repo.stats?.files)} />
        <Stat icon={<Layers size={14} />} label="chunks" value={formatNumber(repo.stats?.chunks)} />
        <Stat icon={<Hash size={14} />} label="lines" value={formatNumber(repo.stats?.lines)} />
      </div>

      {langEntries.length > 0 && (
        <div className="border-b border-slate-800 px-4 py-3">
          <p className="mb-1.5 text-xs uppercase tracking-wider text-slate-500">
            Languages
          </p>
          <div className="flex flex-wrap gap-1.5">
            {langEntries.map(([lang, count]) => (
              <span key={lang} className="pill">
                <Folder size={11} className="text-slate-500" />
                <span>{lang}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
          Architecture overview
        </p>
        {repo.architectureSummary ? (
          <div className="markdown text-slate-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {repo.architectureSummary}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm italic text-slate-500">
            No overview was generated for this repo.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-slate-400">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-0.5 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}
