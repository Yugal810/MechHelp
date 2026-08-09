const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { FRONTEND_DIST, PORT } = require("./config");
const carsRouter = require("./routes/cars");
const garagesRouter = require("./routes/garages");

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["*"],
  })
);
app.use(express.json());

app.use("/api/cars", carsRouter);
app.use("/api/garages", garagesRouter);

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res
      .status(503)
      .send(
        "Frontend not built yet. Run `npm run build` or start Vite with `npm run dev:frontend`."
      );
  });
}

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`MechHelp API running at http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other process or set PORT=...`
      );
      process.exit(1);
    }
    throw err;
  });
}

module.exports = app;
