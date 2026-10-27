const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Config = require("../models/Config");

const ADMIN_SECRET = "CRCE-ADMIN-2026";

// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: "admin" });
    if (!user) return res.status(400).json({ error: "Invalid credentials or not an admin account" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid email or password" });
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Register (protected by ADMIN_SECRET)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;
    if (secretKey !== ADMIN_SECRET) return res.status(403).json({ error: "Invalid admin secret key" });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = new User({ name, email, password: hashed, role: "admin" });
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET current config
router.get("/config", async (req, res) => {
  try {
    const config = await Config.findOne({ singletonKey: "config" });
    if (!config) return res.status(404).json({ error: "Config not found" });
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT replace entire leaveTypes array
router.put("/config/leave-types", async (req, res) => {
  try {
    const { leaveTypes } = req.body;
    if (!Array.isArray(leaveTypes)) return res.status(400).json({ error: "leaveTypes must be an array" });
    const config = await Config.findOneAndUpdate(
      { singletonKey: "config" },
      { leaveTypes, updatedAt: new Date() },
      { new: true }
    );
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add a single leave type
router.post("/config/leave-types", async (req, res) => {
  try {
    const { name, maxDays, applicableTo } = req.body;
    if (!name || maxDays == null || !applicableTo) {
      return res.status(400).json({ error: "name, maxDays, and applicableTo are required" });
    }
    const config = await Config.findOne({ singletonKey: "config" });
    const exists = config.leaveTypes.find(lt => lt.name.toLowerCase() === name.toLowerCase());
    if (exists) return res.status(400).json({ error: "Leave type already exists" });
    config.leaveTypes.push({ name, maxDays: Number(maxDays), applicableTo });
    config.updatedAt = new Date();
    await config.save();
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE remove a leave type by name
router.delete("/config/leave-types/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const config = await Config.findOne({ singletonKey: "config" });
    const idx = config.leaveTypes.findIndex(lt => lt.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) return res.status(404).json({ error: "Leave type not found" });
    config.leaveTypes.splice(idx, 1);
    config.updatedAt = new Date();
    await config.save();
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update leave limits
router.put("/config/leave-limits", async (req, res) => {
  try {
    const { student, faculty } = req.body;
    const update = {};
    if (student != null) update["leaveLimits.student"] = Number(student);
    if (faculty != null) update["leaveLimits.faculty"] = Number(faculty);
    update.updatedAt = new Date();
    const config = await Config.findOneAndUpdate(
      { singletonKey: "config" },
      { $set: update },
      { new: true }
    );
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT toggle portal settings
router.put("/config/portal-settings", async (req, res) => {
  try {
    const { studentPortalEnabled, facultyPortalEnabled, hodPortalEnabled } = req.body;
    const update = {};
    if (studentPortalEnabled != null) update["portalSettings.studentPortalEnabled"] = studentPortalEnabled;
    if (facultyPortalEnabled != null) update["portalSettings.facultyPortalEnabled"] = facultyPortalEnabled;
    if (hodPortalEnabled != null) update["portalSettings.hodPortalEnabled"] = hodPortalEnabled;
    update.updatedAt = new Date();
    const config = await Config.findOneAndUpdate(
      { singletonKey: "config" },
      { $set: update },
      { new: true }
    );
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update academic year
router.put("/config/academic-year", async (req, res) => {
  try {
    const { academicYear } = req.body;
    if (!academicYear) return res.status(400).json({ error: "academicYear is required" });
    const config = await Config.findOneAndUpdate(
      { singletonKey: "config" },
      { academicYear, updatedAt: new Date() },
      { new: true }
    );
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
