const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Leave = require("../models/Leave");
const Config = require("../models/Config");

// Multer config for file uploads
const uploadDir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "../public/uploads/");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Create leave (with optional file) — now validates against config
router.post("/", upload.single("attachment"), async (req, res) => {
  try {
    const config = await Config.findOne({ singletonKey: "config" });
    const role = "student";

    // Check if student portal is enabled
    if (config && !config.portalSettings.studentPortalEnabled) {
      return res.status(403).json({ error: "Portal is currently disabled by admin" });
    }

    // Validate leave type exists and is applicable
    if (config) {
      const leaveType = config.leaveTypes.find(
        lt => lt.name === req.body.leaveType && lt.applicableTo.includes(role)
      );
      if (!leaveType) {
        return res.status(400).json({ error: "Invalid leave type for your role" });
      }
    }

    // Validate total approved leaves don't exceed limit
    if (config) {
      const approvedDays = await Leave.aggregate([
        { $match: { userEmail: req.body.userEmail, status: "Approved" } },
        { $group: { _id: null, total: { $sum: "$days" } } }
      ]);
      const totalUsed = approvedDays.length > 0 ? approvedDays[0].total : 0;
      if (totalUsed + Number(req.body.days) > config.leaveLimits[role]) {
        return res.status(400).json({ error: `Annual leave limit of ${config.leaveLimits[role]} days exceeded` });
      }
    }

    const leave = new Leave({
      userName: req.body.userName,
      userEmail: req.body.userEmail,
      leaveType: req.body.leaveType,
      fromDate: req.body.fromDate,
      toDate: req.body.toDate,
      days: Number(req.body.days),
      reason: req.body.reason,
      attachment: req.file ? req.file.filename : null
    });
    await leave.save();
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all leaves (optionally filter by userEmail)
router.get("/", async (req, res) => {
  try {
    const filter = req.query.userEmail ? { userEmail: req.query.userEmail } : {};
    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ALL leaves for faculty dashboard
router.get("/all", async (req, res) => {
  try {
    const leaves = await Leave.find({}).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get leave stats for faculty
router.get("/stats", async (req, res) => {
  try {
    const total = await Leave.countDocuments({});
    const pending = await Leave.countDocuments({ status: "Pending" });
    const approved = await Leave.countDocuments({ status: "Approved" });
    const rejected = await Leave.countDocuments({ status: "Rejected" });
    res.json({ total, pending, approved, rejected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update leave status (faculty approve/reject)
router.put("/:id/status", async (req, res) => {
  try {
    const { status, remarks, reviewedBy } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const leave = await Leave.findByIdAndUpdate(req.params.id, {
      status,
      remarks: remarks || null,
      reviewedBy: reviewedBy || null,
      reviewedAt: new Date()
    }, { new: true });
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single leave
router.get("/:id", async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update leave (status change)
router.put("/:id", async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete leave
router.delete("/:id", async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    res.json({ message: "Leave cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
