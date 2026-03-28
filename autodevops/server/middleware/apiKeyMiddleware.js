// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Internal API Key Middleware
// ═══════════════════════════════════════════════════

const checkApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    // If valid API key, simulate a system user
    req.user = {
      _id: "000000000000000000000000", // Placeholder system ID
      name: "LifeOS Automation",
      role: "admin",
      isSystem: true,
    };
    return next();
  }

  next();
};

module.exports = checkApiKey;
