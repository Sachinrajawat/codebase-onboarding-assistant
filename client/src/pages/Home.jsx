import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RepoInput from "../components/RepoInput.jsx";
import { analyzeRepo } from "../api/client.js";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(url) {
    setError("");
    setLoading(true);
    try {
      const repo = await analyzeRepo(url);
      navigate(`/repo/${repo.id}`);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Failed to analyze repo.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center py-10">
      <RepoInput onSubmit={handleAnalyze} loading={loading} error={error} />
    </div>
  );
}
