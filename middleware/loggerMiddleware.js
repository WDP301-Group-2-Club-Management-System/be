
const fs = require("fs");
const path = require("path");

module.exports = (req, res, next) => {
  if (req.path.startsWith("/api/tasks")) {
    const log = `[${new Date().toISOString()}] GET ${req.originalUrl} - query: ${JSON.stringify(req.query)}\n`;
    fs.appendFileSync(path.join(__dirname, "../tasks.log"), log);
  }
  next();
};

