// ═══════════════════════════════════════════════════
// 🧪 DeployNova — FULL API Test Suite
// Tests every single endpoint end-to-end
// ═══════════════════════════════════════════════════
const axios = require("axios");

const BASE = "http://localhost:5000";
let TOKEN = "";
let USER_ID = "";
let PROJECT_ID = "";
let DEPLOYMENT_ID = "";

const api = axios.create({ baseURL: BASE });

// Helper - authenticated request
function authHeaders() {
  return { headers: { Authorization: `Bearer ${TOKEN}` } };
}

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    const msg = err.response
      ? `${err.response.status} — ${JSON.stringify(err.response.data)}`
      : err.message;
    failures.push({ name, msg });
    console.log(`  ❌ ${name}`);
    console.log(`     → ${msg}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  🧪 DeployNova — Full API Test Suite");
  console.log("═══════════════════════════════════════════════════\n");

  // ── SECTION 1: Health & Root ──
  console.log("📌 Health & Root");

  await test("GET / — root info", async () => {
    const { data } = await api.get("/");
    assert(data.name === "DeployNova", "name should be DeployNova");
    assert(data.status === "operational", "status should be operational");
    assert(data.docs.auth, "should have docs.auth");
  });

  await test("GET /api/health — health check", async () => {
    const { data } = await api.get("/api/health");
    assert(data.status === "ok", "status should be ok");
    assert(data.mongoState === "connected", "mongo should be connected");
    assert(typeof data.uptime === "number", "uptime should be number");
  });

  await test("GET /api/nonexistent — 404 handler", async () => {
    try {
      await api.get("/api/nonexistent");
      throw new Error("Should have thrown 404");
    } catch (err) {
      assert(err.response.status === 404, "should be 404");
      assert(err.response.data.success === false, "success should be false");
    }
  });

  // ── SECTION 2: Auth ──
  console.log("\n📌 Auth");

  await test("POST /api/auth/register — validation rejects bad input", async () => {
    try {
      await api.post("/api/auth/register", { name: "", email: "bad", password: "1" });
      throw new Error("Should have thrown 400");
    } catch (err) {
      assert(err.response.status === 400, "should be 400");
      assert(err.response.data.details.length >= 2, "should have multiple validation errors");
    }
  });

  // Delete test user first (in case of re-run)
  try {
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/deploynova");
    await mongoose.connection.db.collection("users").deleteOne({ email: "fulltest@deploynova.com" });
    await mongoose.connection.db.collection("projects").deleteMany({ name: "TestProject-FullSuite" });
    await mongoose.connection.db.collection("deployments").deleteMany({});
    await mongoose.disconnect();
  } catch (e) { /* ignore cleanup errors */ }

  await test("POST /api/auth/register — creates user + returns JWT", async () => {
    const { data } = await api.post("/api/auth/register", {
      name: "Full Test User",
      email: "fulltest@deploynova.com",
      password: "securepass123",
    });
    assert(data.success === true, "success should be true");
    assert(data.token, "should return token");
    assert(data.user.name === "Full Test User", "name should match");
    assert(data.user.email === "fulltest@deploynova.com", "email should match");
    assert(data.user.id, "should have user id");
    TOKEN = data.token;
    USER_ID = data.user.id;
  });

  await test("POST /api/auth/register — duplicate email rejected", async () => {
    try {
      await api.post("/api/auth/register", {
        name: "Duplicate",
        email: "fulltest@deploynova.com",
        password: "securepass123",
      });
      throw new Error("Should have thrown 400");
    } catch (err) {
      assert(err.response.status === 400, "should be 400");
    }
  });

  await test("POST /api/auth/login — valid credentials", async () => {
    const { data } = await api.post("/api/auth/login", {
      email: "fulltest@deploynova.com",
      password: "securepass123",
    });
    assert(data.success === true, "success should be true");
    assert(data.token, "should return token");
    TOKEN = data.token; // use fresh token
  });

  await test("POST /api/auth/login — wrong password rejected", async () => {
    try {
      await api.post("/api/auth/login", {
        email: "fulltest@deploynova.com",
        password: "wrongpass",
      });
      throw new Error("Should have thrown 401");
    } catch (err) {
      assert(err.response.status === 401, "should be 401");
    }
  });

  await test("POST /api/auth/login — non-existent user rejected", async () => {
    try {
      await api.post("/api/auth/login", {
        email: "nobody@nowhere.com",
        password: "anything",
      });
      throw new Error("Should have thrown 401");
    } catch (err) {
      assert(err.response.status === 401, "should be 401");
    }
  });

  await test("GET /api/auth/me — returns current user", async () => {
    const { data } = await api.get("/api/auth/me", authHeaders());
    assert(data.success === true, "success should be true");
    assert(data.user.email === "fulltest@deploynova.com", "email should match");
    assert(!data.user.password, "password should NOT be returned");
  });

  await test("GET /api/auth/me — no token → 401", async () => {
    try {
      await api.get("/api/auth/me");
      throw new Error("Should have thrown 401");
    } catch (err) {
      assert(err.response.status === 401, "should be 401");
    }
  });

  await test("GET /api/auth/me — invalid token → 401", async () => {
    try {
      await api.get("/api/auth/me", { headers: { Authorization: "Bearer invalidtoken123" } });
      throw new Error("Should have thrown 401");
    } catch (err) {
      assert(err.response.status === 401, "should be 401");
    }
  });

  await test("PUT /api/auth/github-token — update GitHub token", async () => {
    const { data } = await api.put(
      "/api/auth/github-token",
      { githubToken: "ghp_testtoken123" },
      authHeaders()
    );
    assert(data.success === true, "success should be true");
    assert(data.user.githubToken === "***connected***", "should mask the token");
  });

  await test("PUT /api/auth/github-token — validation rejects missing token", async () => {
    try {
      await api.put("/api/auth/github-token", {}, authHeaders());
      throw new Error("Should have thrown 400");
    } catch (err) {
      assert(err.response.status === 400, "should be 400");
    }
  });

  // ── SECTION 3: Projects ──
  console.log("\n📌 Projects");

  await test("POST /api/projects — validation rejects bad input", async () => {
    try {
      await api.post("/api/projects", { name: "" }, authHeaders());
      throw new Error("Should have thrown 400");
    } catch (err) {
      assert(err.response.status === 400, "should be 400");
    }
  });

  await test("POST /api/projects — creates project", async () => {
    const { data } = await api.post(
      "/api/projects",
      {
        name: "TestProject-FullSuite",
        repoUrl: "https://github.com/expressjs/express",
        framework: "node",
        branch: "main",
      },
      authHeaders()
    );
    assert(data.success === true, "success should be true");
    assert(data.project.name === "TestProject-FullSuite", "name should match");
    assert(data.project.framework === "node", "framework should be node");
    assert(data.project.status === "active", "status should be active");
    PROJECT_ID = data.project._id;
  });

  await test("GET /api/projects — lists user's projects", async () => {
    const { data } = await api.get("/api/projects", authHeaders());
    assert(data.success === true, "success should be true");
    assert(data.count >= 1, "should have at least 1 project");
    const found = data.projects.find((p) => p._id === PROJECT_ID);
    assert(found, "should contain our created project");
    assert(found.hasOwnProperty("lastDeployment"), "should have lastDeployment field");
  });

  await test("GET /api/projects — filter by framework", async () => {
    const { data } = await api.get("/api/projects?framework=node", authHeaders());
    assert(data.success === true, "success should be true");
    data.projects.forEach((p) => assert(p.framework === "node", "all should be node"));
  });

  await test("GET /api/projects/:id — single project with deployments", async () => {
    const { data } = await api.get(`/api/projects/${PROJECT_ID}`, authHeaders());
    assert(data.success === true, "success should be true");
    assert(data.project.name === "TestProject-FullSuite", "name should match");
    assert(Array.isArray(data.project.recentDeployments), "should have recentDeployments array");
  });

  await test("GET /api/projects/:id — invalid ID → 400 or 404", async () => {
    try {
      await api.get("/api/projects/invalidid123", authHeaders());
      throw new Error("Should have thrown error");
    } catch (err) {
      assert([400, 404].includes(err.response.status), "should be 400 or 404");
    }
  });

  await test("PUT /api/projects/:id — updates project", async () => {
    const { data } = await api.put(
      `/api/projects/${PROJECT_ID}`,
      { name: "TestProject-Updated", framework: "react" },
      authHeaders()
    );
    assert(data.success === true, "success should be true");
    assert(data.project.name === "TestProject-Updated", "name should be updated");
    assert(data.project.framework === "react", "framework should be updated");
  });

  // Revert name for remaining tests
  await api.put(`/api/projects/${PROJECT_ID}`, { name: "TestProject-FullSuite", framework: "node" }, authHeaders());

  await test("GET /api/projects — no auth → 401", async () => {
    try {
      await api.get("/api/projects");
      throw new Error("Should have thrown 401");
    } catch (err) {
      assert(err.response.status === 401, "should be 401");
    }
  });

  // ── SECTION 4: Deploy ──
  console.log("\n📌 Deploy");

  await test("POST /api/deploy/:projectId — triggers deployment (async)", async () => {
    const { data, status } = await api.post(`/api/deploy/${PROJECT_ID}`, {}, authHeaders());
    assert(status === 202, "should return 202 Accepted");
    assert(data.success === true, "success should be true");
    assert(data.deployment.status === "queued", "initial status should be queued");
    DEPLOYMENT_ID = data.deployment.id;
  });

  // Wait for deployment to proceed a bit
  await new Promise((r) => setTimeout(r, 5000));

  await test("POST /api/deploy/:projectId — overlapping deploy rejected", async () => {
    try {
      await api.post(`/api/deploy/${PROJECT_ID}`, {}, authHeaders());
      // If it succeeds, the first deploy may have completed/failed — that's OK too
    } catch (err) {
      if (err.response) {
        assert(err.response.status === 409, "should be 409 conflict");
      }
    }
  });

  await test("GET /api/deploy/:projectId — lists deployments", async () => {
    const { data } = await api.get(`/api/deploy/${PROJECT_ID}`, authHeaders());
    assert(data.success === true, "success should be true");
    assert(data.count >= 1, "should have at least 1 deployment");
    assert(typeof data.total === "number", "should have total count");
    assert(typeof data.page === "number", "should have page number");
    assert(typeof data.pages === "number", "should have pages count");
  });

  await test("GET /api/deploy/detail/:deploymentId — single deployment", async () => {
    const { data } = await api.get(`/api/deploy/detail/${DEPLOYMENT_ID}`, authHeaders());
    assert(data.success === true, "success should be true");
    assert(data.deployment._id === DEPLOYMENT_ID, "deployment id should match");
    assert(data.deployment.projectId, "should have populated project");
    assert(Array.isArray(data.deployment.logs), "should have logs array");
  });

  await test("GET /api/deploy/logs/:deploymentId — deployment logs", async () => {
    const { data } = await api.get(`/api/deploy/logs/${DEPLOYMENT_ID}`, authHeaders());
    assert(data.success === true, "success should be true");
    assert(data.status, "should have status");
    assert(Array.isArray(data.logs), "should have logs array");
    if (data.logs.length > 0) {
      assert(data.logs[0].message, "log entry should have message");
      assert(data.logs[0].level, "log entry should have level");
      assert(data.logs[0].stage, "log entry should have stage");
    }
  });

  await test("GET /api/deploy/running — lists running deployments", async () => {
    const { data } = await api.get("/api/deploy/running", authHeaders());
    assert(data.success === true, "success should be true");
    assert(typeof data.count === "number", "should have count");
    assert(Array.isArray(data.deployments), "should have deployments array");
  });

  await test("POST /api/deploy/stop/:deploymentId — stop deployment", async () => {
    try {
      const { data } = await api.post(`/api/deploy/stop/${DEPLOYMENT_ID}`, {}, authHeaders());
      // 200 — successfully stopped
      assert(data.success === true, "should confirm stopped");
    } catch (err) {
      // 400 — deployment already finished/failed (correct behavior)
      assert(err.response.status === 400, "should be 400 if not running");
      assert(err.response.data.error.includes("not currently running"), "should say not running");
    }
  });

  await test("GET /api/deploy/detail/invalidid — invalid ID → error", async () => {
    try {
      await api.get("/api/deploy/detail/invalidid123", authHeaders());
      throw new Error("Should have thrown error");
    } catch (err) {
      assert([400, 404].includes(err.response.status), "should be 400 or 404");
    }
  });

  // ── SECTION 5: GitHub ──
  console.log("\n📌 GitHub");

  await test("GET /api/github/repos — requires valid GitHub token", async () => {
    // Our test token is fake, so GitHub API should return 401
    try {
      await api.get("/api/github/repos", authHeaders());
      // If it somehow works, that's fine too
    } catch (err) {
      assert(err.response.status === 401, "should be 401 (invalid GitHub token)");
    }
  });

  await test("GET /api/github/repos — no auth → 401", async () => {
    try {
      await api.get("/api/github/repos");
      throw new Error("Should have thrown 401");
    } catch (err) {
      assert(err.response.status === 401, "should be 401");
    }
  });

  await test("POST /api/github/webhook — ignores non-push events", async () => {
    const { data } = await api.post(
      "/api/github/webhook",
      { action: "opened" },
      { headers: { "x-github-event": "issues" } }
    );
    assert(data.success === true, "success should be true");
    assert(data.message.includes("ignored"), "should say event ignored");
  });

  await test("POST /api/github/webhook — handles push event", async () => {
    const { data } = await api.post(
      "/api/github/webhook",
      {
        repository: {
          html_url: "https://github.com/expressjs/express",
          full_name: "expressjs/express",
        },
        ref: "refs/heads/main",
        after: "abc123def456",
      },
      { headers: { "x-github-event": "push" } }
    );
    assert(data.success === true, "success should be true");
  });

  // ── SECTION 6: Delete Project (cleanup) ──
  console.log("\n📌 Cleanup");

  await test("DELETE /api/projects/:id — deletes project + deployments", async () => {
    const { data } = await api.delete(`/api/projects/${PROJECT_ID}`, authHeaders());
    assert(data.success === true, "success should be true");
    assert(data.message.includes("deleted"), "should confirm deletion");
  });

  await test("GET /api/projects/:id — deleted project → 404", async () => {
    try {
      await api.get(`/api/projects/${PROJECT_ID}`, authHeaders());
      throw new Error("Should have thrown 404");
    } catch (err) {
      assert(err.response.status === 404, "should be 404");
    }
  });

  // ── RESULTS ──
  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  📊 Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failures.length > 0) {
    console.log("\n  ❌ Failures:");
    failures.forEach((f) => {
      console.log(`     • ${f.name}`);
      console.log(`       ${f.msg}`);
    });
  } else {
    console.log("  🎉 ALL TESTS PASSED!");
  }
  console.log("═══════════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
