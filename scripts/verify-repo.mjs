import https from "https";

function api(urlPath) {
  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: "api.github.com",
          path: urlPath,
          headers: { "User-Agent": "verify-script", Accept: "application/vnd.github.v3+json" },
        },
        (res) => {
          let chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString();
            try { resolve({ status: res.statusCode, data: JSON.parse(text) }); }
            catch { resolve({ status: res.statusCode, data: text }); }
          });
        }
      )
      .on("error", reject);
  });
}

const OWNER = "NiladriKrSahoo-dev";
const REPO = "proofrail-agent-guard";

const repo = await api(`/repos/${OWNER}/${REPO}`);
console.log("=== REPO ===");
console.log("status:", repo.status);
if (repo.status === 200) {
  console.log("name:", repo.data.full_name);
  console.log("default_branch:", repo.data.default_branch);
  console.log("size (KB):", repo.data.size);
  console.log("pushed_at:", repo.data.pushed_at);
  console.log("created_at:", repo.data.created_at);
  console.log("empty:", repo.data.size === 0 ? "YES (possibly empty)" : "no");
} else {
  console.log(JSON.stringify(repo.data).slice(0, 400));
}

const commits = await api(`/repos/${OWNER}/${REPO}/commits?per_page=5`);
console.log("\n=== LATEST COMMITS ===");
if (Array.isArray(commits.data)) {
  if (commits.data.length === 0) console.log("NO COMMITS FOUND");
  for (const c of commits.data) {
    console.log(`- ${c.sha.slice(0, 10)} | ${c.commit.message.split("\n")[0]} | ${c.commit.author.date}`);
  }
} else {
  console.log("status:", commits.status, JSON.stringify(commits.data).slice(0, 300));
}

const contents = await api(`/repos/${OWNER}/${REPO}/contents/`);
console.log("\n=== ROOT CONTENTS ===");
if (Array.isArray(contents.data)) {
  console.log(contents.data.map((f) => `${f.type}: ${f.name}`).join("\n"));
} else {
  console.log("status:", contents.status, JSON.stringify(contents.data).slice(0, 300));
}
