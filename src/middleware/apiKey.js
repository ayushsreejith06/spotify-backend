const config = require("../config");

function requireApiKey(req, res, next) {
  const providedApiKey = req.get("x-api-key");

  if (!config.apiKey || providedApiKey !== config.apiKey) {
    res.status(401).json({
      ok: false,
      status: "unauthorized",
      message: "Invalid API key.",
    });
    return;
  }

  next();
}

module.exports = {
  requireApiKey,
};
