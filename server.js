// Only override DNS when NOT running on Vercel
if (!process.env.VERCEL) {
  const dns = require("dns");
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

// Ensure uploads directory exists (safely wrapped for serverless environments)
try {
  const uploadsDir = path.join(__dirname, "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem on serverless
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve uploaded files from public/uploads or /tmp (Vercel fallback)
app.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(__dirname, "public", "uploads", req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const tmpPath = path.join("/tmp", req.params.filename);
  if (fs.existsSync(tmpPath)) {
    return res.sendFile(tmpPath);
  }
  res.status(404).send("File not found");
});

// Database connection caching for Serverless & Local
let isConnected = false;

async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from environment variables.");
  }
  const db = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });
  isConnected = db.connections[0].readyState === 1;
  console.log("MongoDB Connected ✅");
  await seedConfig();
}

// Connect immediately on startup
connectDB().catch(err => console.log("MongoDB Initial Connection:", err.message));

// Middleware to ensure DB connection is ready before handling any API request
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api")) {
    try {
      await connectDB();
    } catch (err) {
      console.error("DB connection error:", err.message);
      return res.status(503).json({
        error: "Database connection failed. Please ensure MONGO_URI is configured and 0.0.0.0/0 is allowed in MongoDB Atlas."
      });
    }
  }
  next();
});

// Seed default config if none exists
async function seedConfig() {
  const Config = require("./models/Config");
  try {
    const existing = await Config.findOne({ singletonKey: "config" });
    if (!existing) {
      await Config.create({
        singletonKey: "config",
        leaveTypes: [
          { name: "Sick Leave", maxDays: 12, applicableTo: ["faculty"] },
          { name: "Casual Leave", maxDays: 8, applicableTo: ["faculty"] },
          { name: "Medical", maxDays: 10, applicableTo: ["student", "faculty"] },
          { name: "Emergency", maxDays: 5, applicableTo: ["student", "faculty"] },
          { name: "Hackathon", maxDays: 5, applicableTo: ["student"] },
          { name: "College Event", maxDays: 5, applicableTo: ["student"] },
          { name: "Personal", maxDays: 10, applicableTo: ["faculty"] },
          { name: "Earned Leave", maxDays: 30, applicableTo: ["faculty"] },
          { name: "Vacation Leave", maxDays: 42, applicableTo: ["faculty"] },
          { name: "Bank Work", maxDays: 12, applicableTo: ["faculty"] },
          { name: "Compensatory Off", maxDays: 2, applicableTo: ["faculty"] },
        ],
        leaveLimits: { student: 30, faculty: 120 },
        portalSettings: { studentPortalEnabled: true, facultyPortalEnabled: true, hodPortalEnabled: true },
        academicYear: "2025-26"
      });
      console.log("Default config seeded ✅");
    } else {
      console.log("Config already exists ✅");
    }
  } catch (err) {
    console.error("Config seed error:", err.message);
  }
}

// Routes
const authRoutes = require("./routes/authRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const hodRoutes = require("./routes/hodRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

// Fallback to index.html for root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start local server (only when not running inside Vercel serverless)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
