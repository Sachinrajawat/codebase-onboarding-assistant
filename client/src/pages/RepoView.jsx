import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ChatBox from "../components/ChatBox.jsx";
import ArchitectureView from "../components/ArchitectureView.jsx";
import { getRepo } from "../api/client.js";

export default function RepoView() {
  const { repoId } = useParams();
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getRepo(repoId)
      .then((r) => {
        if (!cancelled) setRepo(r);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.error || err.message || "Failed to load repo."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-[12px] text-ink-muted">
        loading repo
        <span className="ml-1 inline-block animate-caret">_</span>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="mx-auto max-w-xl">
        <Link to="/" className="btn-ghost mb-6">
          ← back
        </Link>
        <div className="panel border-bad/40 p-5 font-mono text-[13px] text-bad">
          {error || "Repository not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col gap-4">
      {/* Top utility row */}
      <div className="flex items-center justify-between">
        <Link to="/" className="btn-ghost">
          ← new repo
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-wider2 text-ink-faint">
          status:{" "}
          <span
            className={
              repo.status === "ready" ? "text-good" : "text-ink-muted"
            }
          >
            {repo.status}
          </span>
        </span>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12 lg:overflow-hidden">
        <div className="min-h-0 lg:col-span-5 xl:col-span-4">
          <ArchitectureView repo={repo} />
        </div>
        <div className="min-h-0 lg:col-span-7 xl:col-span-8">
          <ChatBox repoId={repo.id || repo._id} />
        </div>
      </div>
    </div>
  );
}
