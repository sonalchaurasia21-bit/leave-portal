const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Leave = require("../models/Leave");

const HOD_SECRET = "CRCE-HOD-2026";

// HOD Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: "hod" });
    if (!user) return res.status(400).json({ error: "Invalid credentials or not an HOD account" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid email or password" });
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// HOD Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, department, secretKey } = req.body;
    if (secretKey !== HOD_SECRET) return res.status(403).json({ error: "Invalid HOD secret key" });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = new User({ name, email, password: hashed, role: "hod", department });
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats for HOD dashboard
router.get("/stats", async (req, res) => {
  try {
    const pending = await Leave.countDocuments({ status: "Pending" });
    const approved = await Leave.countDocuments({ status: "Approved" });
    const rejected = await Leave.countDocuments({ status: "Rejected" });
    const total = pending + approved + rejected;
    const studentLeaves = await Leave.countDocuments({ applicantRole: { $ne: "faculty" } });
    const facultyLeaves = await Leave.countDocuments({ applicantRole: "faculty" });
    res.json({ total, pending, approved, rejected, studentLeaves, facultyLeaves });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get ALL leaves (for approvals - pending only)
router.get("/pending", async (req, res) => {
  try {
    const leaves = await Leave.find({ status: "Pending" }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get ALL leaves (history)
router.get("/all-leaves", async (req, res) => {
  try {
    const leaves = await Leave.find({}).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve/Reject leave
router.put("/leaves/:id", async (req, res) => {
  try {
    const { status, remarks, reviewedBy } = req.body;
    if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    const leave = await Leave.findByIdAndUpdate(req.params.id, {
      status, remarks: remarks || null, reviewedBy: reviewedBy || null, reviewedAt: new Date()
    }, { new: true });
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    res.json(leave);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
