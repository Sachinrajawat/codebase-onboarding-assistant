const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const simpleGit = require("simple-git");

const env = require("../config/env");
const logger = require("../utils/logger");

// @octokit/rest v21+ is ESM-only; load it lazily via dynamic import so we can
// still ship this codebase as CommonJS.
let _octokit = null;
async function getOctokit() {
  if (_octokit) return _octokit;
  const { Octokit } = await import("@octokit/rest");
  _octokit = new Octokit(env.githubToken ? { auth: env.githubToken } : {});
  return _octokit;
}

// Where we drop clones. We delete each immediately after indexing.
const CLONE_ROOT = path.resolve(__dirname, "../../tmp/repos");

const GITHUB_URL_RE =
  /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/.*)?$/i;

function parseGithubUrl(rawUrl) {
  if (typeof rawUrl !== "string") {
    throw new Error("Repo URL must be a string");
  }
  const trimmed = rawUrl.trim();
  const match = trimmed.match(GITHUB_URL_RE);
  if (!match) {
    throw new Error(
      "Only public GitHub repo URLs are supported (e.g. https://github.com/owner/repo)"
    );
  }
  const owner = match[1];
  const name = match[2];
  const normalized = `https://github.com/${owner}/${name}`;
  return { owner, name, normalizedUrl: normalized };
}

async function fetchRepoMetadata(owner, name) {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.repos.get({ owner, repo: name });
    return {
      defaultBranch: data.default_branch,
      stars: data.stargazers_count,
      language: data.language,
      sizeKB: data.size, // GitHub reports repo size in KB
      isPrivate: data.private,
    };
  } catch (err) {
    if (err.status === 404) {
      throw new Error("Repository not found (or private — only public repos are supported in MVP)");
    }
    if (err.status === 403) {
      throw new Error("GitHub rate limit hit. Set GITHUB_TOKEN to increase quota.");
    }
    throw err;
  }
}

// Returns the absolute path of the cloned repo on disk.
async function cloneRepo({ owner, name, normalizedUrl, depth = 1 }) {
  await fs.mkdir(CLONE_ROOT, { recursive: true });
  const dest = await fs.mkdtemp(path.join(CLONE_ROOT, `${owner}-${name}-`));

  logger.info(`Cloning ${normalizedUrl} -> ${dest}`);
  const git = simpleGit();
  await git.clone(normalizedUrl, dest, ["--depth", String(depth), "--single-branch"]);

  // Resolve the commit SHA we ended up on.
  const repoGit = simpleGit(dest);
  const sha = (await repoGit.revparse(["HEAD"])).trim();

  return { localPath: dest, commitSha: sha };
}

async function cleanupClone(localPath) {
  if (!localPath) return;
  try {
    await fs.rm(localPath, { recursive: true, force: true });
    logger.info(`Cleaned up clone at ${localPath}`);
  } catch (err) {
    logger.warn(`Failed to clean up clone at ${localPath}`, err.message);
  }
}

// Build a stable web link to a specific line range on github.com so we can
// surface citations as real, clickable URLs in the UI.
function buildGithubFileUrl({ owner, name, branch, filePath, startLine, endLine }) {
  const base = `https://github.com/${owner}/${name}/blob/${branch}/${filePath}`;
  if (startLine && endLine && startLine !== endLine) {
    return `${base}#L${startLine}-L${endLine}`;
  }
  if (startLine) {
    return `${base}#L${startLine}`;
  }
  return base;
}

module.exports = {
  parseGithubUrl,
  fetchRepoMetadata,
  cloneRepo,
  cleanupClone,
  buildGithubFileUrl,
  CLONE_ROOT,
  // Exposed for tests.
  _os: os,
};
