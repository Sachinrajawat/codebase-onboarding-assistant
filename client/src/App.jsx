import { Link, Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-rule bg-bg/80 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="group flex items-baseline gap-3">
            <span className="font-mono text-[13px] font-semibold text-accent">
              [coa]
            </span>
            <span className="font-serif text-[15px] italic text-ink group-hover:text-accent-soft">
              Codebase Onboarding Assistant
            </span>
          </Link>

          <span className="hidden font-mono text-[11px] uppercase tracking-wider2 text-ink-dim sm:inline">
            // retrieval-augmented chat over any github repo
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ruleSoft">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 font-mono text-[11px] text-ink-faint">
          <span>react · express · qdrant · openai</span>
          <span className="hidden sm:inline">
            handcrafted, not generated
          </span>
        </div>
      </footer>
    </div>
  );
}
