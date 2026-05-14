import { Link, Outlet } from "react-router-dom";
import { GitBranch, Sparkles } from "lucide-react";

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2 text-slate-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
              <GitBranch size={18} />
            </span>
            <span className="font-semibold tracking-tight">
              Codebase Onboarding Assistant
            </span>
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            <Sparkles size={14} />
            <span>RAG over your repo</span>
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/80 px-6 py-3 text-center text-xs text-slate-500">
        Built with React, Express, Qdrant, and OpenAI · MVP
      </footer>
    </div>
  );
}
