#!/usr/bin/env node
/**
 * Push all project files to GitHub using the GitHub REST API (no git CLI needed).
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/push-to-github.mjs
 */
import https from "https";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "NiladriKrSahoo-dev";
const REPO = "proofrail-agent-guard";
const BRANCH = "main";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", ".cache",
  "scripts",
]);
const IGNORE_FILES = new Set([
  ".env", ".env.local", ".env.production",
  "package-lock.json",
]);

function shouldIgnore(relPath) {
  const parts = relPath.split("/");
  if (parts.some((p) => IGNORE_DIRS.has(p))) return true;
  if (IGNORE_FILES.has(parts[parts.length - 1])) return true;
  return false;
}

function api(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.github.com",
      path: urlPath,
      method,
      headers: {
        Authorization: `token ${TOKEN}`,
        "User-Agent": "freebuff-push-script",
        Accept: "application/vnd.github.v3+json",
        ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString();
        let json;
        try { json = JSON.parse(text); } catch { json = text; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(json);
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${JSON.stringify(json).slice(0, 500)}`));
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getRef() {
  try {
    return await api("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  } catch {
    // Branch doesn't exist — get default branch
    const repo = await api("GET", `/repos/${OWNER}/${REPO}`);
    const defBranch = repo.default_branch || "main";
    return await api("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${defBranch}`);
  }
}

function gitBlobSha(content) {
  const header = `blob ${content.length}\0`;
  return crypto.createHash("sha1").update(header).update(content).digest("hex");
}

async function createBlob(filepath) {
  const content = fs.readFileSync(filepath);
  const isText = !content.includes(0) && content.length < 500000;
  const body = {
    encoding: isText ? "utf-8" : "base64",
    content: isText ? content.toString("utf-8") : content.toString("base64"),
  };
  const result = await api("POST", `/repos/${OWNER}/${REPO}/git/blobs`, body);
  return result.sha;
}

function collectFiles(dir, base = "") {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "." || entry.name === "..") continue;
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        results.push(...collectFiles(fullPath, relPath));
      }
    } else if (!IGNORE_FILES.has(entry.name)) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 0 && stat.size < 10 * 1024 * 1024) {
          results.push({ relPath, fullPath });
        }
      } catch {}
    }
  }
  return results;
}

async function main() {
  if (!TOKEN) {
    console.error("Set GITHUB_TOKEN env var first.");
    process.exit(1);
  }

  console.log("📡 Getting repo state...");
  const ref = await getRef();
  const baseSha = ref.object.sha;
  console.log(`  Base commit: ${baseSha}`);

  // Get the base tree
  const baseCommit = await api("GET", `/repos/${OWNER}/${REPO}/git/commits/${baseSha}`);
  const baseTreeSha = baseCommit.tree.sha;

  console.log("📁 Collecting files...");
  const files = collectFiles("/");
  console.log(`  Found ${files.length} files`);

  // Create blobs (in batches of 10 to avoid rate limits)
  console.log("📦 Creating blobs...");
  const treeItems = [];
  for (let i = 0; i < files.length; i += 10) {
    const batch = files.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async ({ relPath, fullPath }) => {
        try {
          const sha = await createBlob(fullPath);
          return { path: relPath, mode: "100644", type: "blob", sha };
        } catch (e) {
          console.log(`  ⚠️  Skipped ${relPath}: ${e.message.slice(0, 80)}`);
          return null;
        }
      })
    );
    results.filter(Boolean).forEach((item) => treeItems.push(item));
    process.stdout.write(`\r  ${Math.min(i + 10, files.length)}/${files.length} blobs`);
  }
  console.log(`\n  ✅ ${treeItems.length} blobs created`);

  // Create tree
  console.log("🌳 Creating tree...");
  const tree = await api("POST", `/repos/${OWNER}/${REPO}/git/trees`, {
    base_tree: baseTreeSha,
    tree: treeItems,
  });
  console.log(`  Tree: ${tree.sha}`);

  // Create commit
  console.log("💾 Committing...");
  const commit = await api("POST", `/repos/${OWNER}/${REPO}/git/commits`, {
    message:
      "feat: Proofrail AI agent safety platform with security hardening\n\n" +
      "- Passwordless email OTP auth with rate-limited sends\n" +
      "- AI agent audit trail: traces → scenarios → policies → releases\n" +
      "- Scenario redaction pipeline with compliance sign-off\n" +
      "- Optimized Convex queries (index-scoped, no table scans)\n" +
      "- Security: schema validation, CSP headers, postMessage origin gate\n" +
      "- Error boundary with dev-only stack traces",
    tree: tree.sha,
    parents: [baseSha],
  });
  console.log(`  Commit: ${commit.sha}`);

  // Update ref
  console.log("🚀 Updating branch...");
  await api("PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    sha: commit.sha,
    force: true,
  });

  console.log("\n🎉 Done! Your code is live:");
  console.log(`   https://github.com/${OWNER}/${REPO}`);
}

main().catch((err) => {
  console.error("\n❌ Failed:", err.message);
  if (err.message.includes("401") || err.message.includes("403")) {
    console.error("Token may be invalid or expired. Create a new one at:");
    console.error("https://github.com/settings/tokens");
  }
  process.exit(1);
});
