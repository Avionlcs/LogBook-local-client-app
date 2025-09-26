// merge-files.js
// Node.js >= 18, no external dependencies

const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || ".";
const OUT_FILE = process.argv[3] || "all-files-dump.txt";

// Exclude these folders
const EXCLUDE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".vs",
  "bin",
  "obj",
  '.angular',
  'cpm'
];

// Exclude these exact filenames (not extensions)
const EXCLUDE_FILES = [
  ".gitignore",
  ".gitattributes"
];

// Exclude these file extensions
const EXCLUDE_EXT = [
  ".map",
  ".log",
  ".lock",
  ".tmp",
  ".exe",
  ".dll",
  ".db",
  ".iss",
  ".md",
  ".ico",
  ".pfx",
  // NOTE: You had ".js" and ".txt" in your list earlier.
  // If you still want to exclude them, add them back below.
  // ".js",
  // ".txt",
];

// World-class professional prompt to guide AI ingestion
const PROMPT_TEXT = `
### INSTRUCTIONS FOR AI — CODEBASE INGESTION (READ DEEPLY, DO NOT EXPLAIN YET)

Context
- You are being given a single text file that contains the full contents of a multi-file software project.
- This file is a *flattened export* created solely to make it easier for you to read end-to-end.
- Treat this as a real project with the original structure. The TABLE OF CONTENTS and each FILE/URL header indicate canonical paths. Imagine the original directory tree and file layout accordingly.

Your Task (Internalize First)
- Do not summarize, explain, or propose changes yet.
- Read everything carefully and build a deep internal mental model of the system.
- Reconstruct the project's conceptual structure from paths and headers. Infer modules, layers, and responsibilities.
- Build internal indexes of:
  - Entry points, configuration, environment usage
  - Schemas/migrations, database access, transactions
  - APIs/controllers/routes/middleware
  - Services, domain logic, utilities, shared types
  - Error handling, logging, validation, security, and concurrency patterns
- Map dependencies (imports/requires, cross-module calls), important data flows, side effects, and lifecycle/bootstrapping.
- Note risks, TODOs/FIXMEs, dead code, circular deps, and any sensitive patterns.

Ground Rules
- Treat every \`FILE:\` and \`URL:\` header as ground truth for location.
- Avoid hallucinating components not present; where you must infer, mark that as an inference internally.
- When later asked, reference files by URL and include stable line or range references.

Output Policy (for later prompts)
- Do **not** output analysis now. First, fully ingest.
- When prompted later, you may produce architecture overviews, dependency graphs, flow descriptions, risks, and patch proposals, each citing file URLs and line ranges.

Proceed to read the TABLE OF CONTENTS and then the FILE CONTENTS below. Do not respond with explanations yet.
`.trim() + "\n\n";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });

  // deterministic ordering for stable output
  list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      results = results.concat(walk(fullPath));
    } else {
      if (EXCLUDE_FILES.includes(entry.name)) continue;
      const ext = path.extname(entry.name);
      if (EXCLUDE_EXT.includes(ext)) continue;
      results.push(fullPath);
    }
  }
  return results;
}

function mergeFiles(root, outFile) {
  const files = walk(root);
  console.log(`Found ${files.length} files`);

  const out = fs.createWriteStream(outFile, { encoding: "utf8" });

  // --- Write AI Prompt at the very top ---
  out.write(PROMPT_TEXT);

  // --- Write TOC ---
  out.write("### TABLE OF CONTENTS ###\n\n");
  files.forEach((file, idx) => {
    const fileUrl = "file://" + path.resolve(file).replace(/\\/g, "/");
    out.write(`${idx + 1}. ${file}\n`);
  });

  out.write("\n\n### FILE CONTENTS ###\n");

  // --- Write File Contents ---
  for (const file of files) {
    const fileUrl = "file://" + path.resolve(file).replace(/\\/g, "/");

    out.write("\n\n=======================================\n");
    out.write(`FILE: ${file}\n`);
    out.write(`URL:  ${fileUrl}\n`);
    out.write("=======================================\n\n");

    try {
      const content = fs.readFileSync(file, "utf8");
      out.write(content);
    } catch (err) {
      out.write(`[ERROR READING FILE: ${err.message}]`);
    }
  }

  out.end();
  console.log(`✅ Merged into: ${outFile}`);
}

// run
mergeFiles(path.resolve(ROOT), path.resolve(OUT_FILE));
