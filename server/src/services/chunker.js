const path = require("path");
const fs = require("fs/promises");
const Parser = require("tree-sitter");
const JavaScript = require("tree-sitter-javascript");
const Python = require("tree-sitter-python");
const TypeScript = require("tree-sitter-typescript");

const env = require("../config/env");
const logger = require("../utils/logger");

// ---------------------------------------------------------------------------
// Language registry
// ---------------------------------------------------------------------------
// For each language we list:
//  - the tree-sitter grammar to load
//  - the AST node types that we consider top-level "semantic units" to chunk on
//
// Why this matters: chunking by function/class/method boundaries preserves
// semantic meaning so vector search returns code that's actually self-contained.
// Splitting by a fixed line count would destroy that.
const LANGUAGES = {
  javascript: {
    grammar: JavaScript,
    chunkNodeTypes: new Set([
      "function_declaration",
      "function",
      "arrow_function",
      "method_definition",
      "class_declaration",
      "generator_function_declaration",
      "export_statement",
    ]),
  },
  typescript: {
    grammar: TypeScript.typescript,
    chunkNodeTypes: new Set([
      "function_declaration",
      "method_definition",
      "class_declaration",
      "interface_declaration",
      "type_alias_declaration",
      "enum_declaration",
      "export_statement",
    ]),
  },
  tsx: {
    grammar: TypeScript.tsx,
    chunkNodeTypes: new Set([
      "function_declaration",
      "method_definition",
      "class_declaration",
      "interface_declaration",
      "type_alias_declaration",
      "enum_declaration",
      "export_statement",
    ]),
  },
  python: {
    grammar: Python,
    chunkNodeTypes: new Set([
      "function_definition",
      "class_definition",
      "decorated_definition",
    ]),
  },
};

const EXT_TO_LANG = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".py": "python",
};

// Skip directories that never contain meaningful source code.
const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".idea",
  ".vscode",
  "vendor",
  "target",
  "bin",
  "obj",
]);

// File extensions to never even read (binary / lockfiles / generated).
const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg",
  ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
  ".mp3", ".mp4", ".mov", ".wav", ".ogg",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".lock", ".min.js", ".min.css",
  ".so", ".dll", ".dylib", ".exe", ".bin",
]);

const SKIP_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "Pipfile.lock",
]);

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------
async function walk(dir, repoRoot, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    logger.warn(`Cannot read dir ${dir}: ${err.message}`);
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      await walk(full, repoRoot, out);
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (SKIP_FILENAMES.has(lower)) continue;
      const ext = path.extname(lower);
      if (SKIP_EXTENSIONS.has(ext)) continue;
      // Only chunk languages we have grammars for in MVP.
      if (!EXT_TO_LANG[ext]) continue;
      out.push({
        absolutePath: full,
        relativePath: path.relative(repoRoot, full),
        extension: ext,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// AST chunking
// ---------------------------------------------------------------------------
function nodeName(node, source) {
  // Best-effort: many node types expose a `name` field via tree-sitter.
  const nameNode =
    node.childForFieldName && node.childForFieldName("name");
  if (nameNode) {
    return source.slice(nameNode.startIndex, nameNode.endIndex);
  }
  // Fall back: look for the first identifier child.
  for (let i = 0; i < node.namedChildCount; i++) {
    const c = node.namedChild(i);
    if (c.type === "identifier" || c.type === "property_identifier") {
      return source.slice(c.startIndex, c.endIndex);
    }
  }
  return "(anonymous)";
}

function chunkSource({ source, language, filePath }) {
  const lang = LANGUAGES[language];
  if (!lang) return [];

  const parser = new Parser();
  parser.setLanguage(lang.grammar);

  let tree;
  try {
    tree = parser.parse(source);
  } catch (err) {
    logger.warn(`Parse failed for ${filePath}: ${err.message}`);
    return [];
  }

  const chunks = [];
  const cursor = tree.walk();

  function visit() {
    const node = cursor.currentNode;
    if (lang.chunkNodeTypes.has(node.type)) {
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      const content = source.slice(node.startIndex, node.endIndex);
      // Skip chunks that are tiny or wildly oversized.
      if (content.length >= 30 && content.length <= 8_000) {
        chunks.push({
          content,
          metadata: {
            filePath,
            startLine,
            endLine,
            type: node.type,
            name: nodeName(node, source),
            language,
          },
        });
      }
      // Note: we INTENTIONALLY descend even after emitting a chunk for this
      // node. A class declaration produces both the class-level chunk
      // ("what does this class do") AND a per-method chunk for each method
      // ("what does this specific method do"). The duplication costs a few
      // extra embeddings but materially improves retrieval recall: questions
      // about a method find the method chunk, questions about the class find
      // the class chunk, and the LLM dedupes context implicitly because both
      // chunks reference the same lines.
    }
    if (cursor.gotoFirstChild()) {
      do {
        visit();
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }
  }

  visit();

  // Fallback: if the file produced zero AST chunks (e.g. just top-level
  // statements), emit a single file-level chunk so we don't lose content
  // entirely. We still cap size aggressively.
  if (chunks.length === 0 && source.length <= 8_000 && source.trim().length > 0) {
    const totalLines = source.split("\n").length;
    chunks.push({
      content: source,
      metadata: {
        filePath,
        startLine: 1,
        endLine: totalLines,
        type: "file",
        name: path.basename(filePath),
        language,
      },
    });
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Repo-level orchestration
// ---------------------------------------------------------------------------
async function chunkRepository({ repoRoot }) {
  const limits = env.limits;

  const files = await walk(repoRoot, repoRoot);
  if (files.length === 0) {
    return { chunks: [], stats: { files: 0, lines: 0, languages: {} } };
  }

  if (files.length > limits.maxFiles) {
    throw new Error(
      `Repository is too large to index in MVP (${files.length} supported source files; max ${limits.maxFiles}).`
    );
  }

  const allChunks = [];
  const stats = { files: 0, lines: 0, languages: {} };

  for (const file of files) {
    let size = 0;
    try {
      const st = await fs.stat(file.absolutePath);
      size = st.size;
    } catch {
      continue;
    }
    if (size > limits.maxFileSize) {
      // Skip very large files (likely generated or minified). Counted but no chunks.
      continue;
    }

    let source;
    try {
      source = await fs.readFile(file.absolutePath, "utf8");
    } catch (err) {
      logger.warn(`Cannot read ${file.relativePath}: ${err.message}`);
      continue;
    }

    const lineCount = source.split("\n").length;
    if (stats.lines + lineCount > limits.maxLines) {
      throw new Error(
        `Repository exceeds the ${limits.maxLines}-line cap during indexing.`
      );
    }

    const language = EXT_TO_LANG[file.extension];
    const chunks = chunkSource({
      source,
      language,
      filePath: file.relativePath,
    });

    if (chunks.length > 0) {
      allChunks.push(...chunks);
      stats.files += 1;
      stats.lines += lineCount;
      stats.languages[language] = (stats.languages[language] || 0) + 1;
    }
  }

  return { chunks: allChunks, stats };
}

module.exports = {
  chunkRepository,
  chunkSource, // exposed for unit testing
  EXT_TO_LANG,
};
