import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import "./db/index.js";

import authRoutes from "./routes/auth.js";
import driverRoutes from "./routes/driver.js";
import passengerRoutes from "./routes/passenger.js";
import adminRoutes from "./routes/admin.js";
import sharedRoutes from "./routes/shared.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" })); // generous limit for base64 document/photo uploads
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok", company: "QUEEN CAPTIVATED" }));

app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/passenger", passengerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", sharedRoutes);

app.use("/api", (req, res) => res.status(404).json({ error: "Route not found." }));

// ── Serve the marketing site (queencaptivated.com) at "/" ────────────
const marketingDir = path.join(__dirname, "..", "public-site");
if (fs.existsSync(marketingDir)) {
  app.use(express.static(marketingDir));
}

// ── Serve the Car Rental app (React SPA) under "/car-rental" ─────────
const carRentalDir = path.join(__dirname, "..", "public", "car-rental");
if (fs.existsSync(carRentalDir)) {
  app.use("/car-rental", express.static(carRentalDir));
  // SPA fallback so client-side routes like /car-rental/login,
  // /car-rental/passenger, etc. reload correctly.
  app.get("/car-rental/*", (req, res) => {
    res.sendFile(path.join(carRentalDir, "index.html"));
  });
}

// Fallback 404 for anything else not matched above
app.use((req, res) => {
  const notFoundPage = path.join(marketingDir, "404.html");
  if (fs.existsSync(notFoundPage)) return res.status(404).sendFile(notFoundPage);
  res.status(404).send("Not found");
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`QUEEN CAPTIVATED API running on http://localhost:${PORT}`);
});
