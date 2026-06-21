const config = require("./config");
const app = require("./app");

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

module.exports = server;
