const express = require("express");
const authRouter = require("./routes/auth");
const healthRouter = require("./routes/health");
const addSongRouter = require("./routes/addSong");
const { requireApiKey } = require("./middleware/apiKey");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.use("/auth", authRouter);
app.use("/health", healthRouter);
app.use("/api/add-song", requireApiKey, addSongRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
