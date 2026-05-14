import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";

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
          setError(err?.response?.data?.error || err.message || "Failed to load repo.");
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
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={16} /> Loading repo…
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="mx-auto max-w-xl">
        <Link to="/" className="btn-ghost mb-4">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="card p-6 text-sm text-red-300">
          {error || "Repository not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-150px)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link to="/" className="btn-ghost">
          <ArrowLeft size={14} /> New repo
        </Link>
        <span className="text-xs text-slate-500">
          Status:{" "}
          <span className="font-mono text-slate-300">{repo.status}</span>
        </span>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3 lg:overflow-hidden">
        <div className="min-h-0 lg:col-span-1">
          <ArchitectureView repo={repo} />
        </div>
        <div className="min-h-0 lg:col-span-2">
          <ChatBox repoId={repo.id || repo._id} />
        </div>
      </div>
    </div>
  );
}
