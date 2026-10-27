const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const Leave = require("../models/Leave");
const Config = require("../models/Config");

const FACULTY_SECRET = "CRCE-FACULTY-2026";

// Multer config for faculty file uploads
const uploadDir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "../public/uploads/");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Faculty Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, department, secretKey } = req.body;

    if (secretKey !== FACULTY_SECRET) {
      return res.status(403).json({ error: "Invalid secret key" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashed, role: "faculty", department });
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: "faculty" });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials or not a faculty account" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student leaves only (for faculty approvals)
router.get("/leaves", async (req, res) => {
  try {
    const leaves = await Leave.find({ applicantRole: "student" }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get faculty's OWN leaves
router.get("/my-leaves", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const leaves = await Leave.find({ userEmail: email, applicantRole: "faculty" }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty apply leave — now validates against config
router.post("/apply-leave", upload.single("attachment"), async (req, res) => {
  try {
    const config = await Config.findOne({ singletonKey: "config" });
    const role = "faculty";

    // Check if faculty portal is enabled
    if (config && !config.portalSettings.facultyPortalEnabled) {
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
        { $match: { userEmail: req.body.userEmail, applicantRole: "faculty", status: "Approved" } },
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
      applicantRole: "faculty",
      attachment: req.file ? req.file.filename : null
    });
    await leave.save();
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get combined stats for faculty dashboard
router.get("/stats", async (req, res) => {
  try {
    const { email } = req.query;

    // Approval stats (only student leaves pending action)
    const pendingApprovals = await Leave.countDocuments({ status: "Pending", applicantRole: "student" });
    const totalApproved = await Leave.countDocuments({ status: "Approved", applicantRole: "student" });

    // Faculty's own stats
    let myApplications = 0, myApproved = 0, myDaysUsed = 0;
    if (email) {
      myApplications = await Leave.countDocuments({ userEmail: email, applicantRole: "faculty" });
      myApproved = await Leave.countDocuments({ userEmail: email, applicantRole: "faculty", status: "Approved" });
      const approvedLeaves = await Leave.find({ userEmail: email, applicantRole: "faculty", status: "Approved" });
      myDaysUsed = approvedLeaves.reduce((sum, l) => sum + l.days, 0);
    }

    res.json({
      pendingApprovals,
      myApplications,
      totalApproved: myApproved,
      myDaysUsed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update leave status (approve/reject) — faculty can only act on student leaves
router.put("/leaves/:id", async (req, res) => {
  try {
    const { status, remarks, reviewedBy } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    // Verify the leave belongs to a student before allowing action
    const existing = await Leave.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Leave not found" });
    if (existing.applicantRole !== "student") {
      return res.status(403).json({ error: "Faculty can only approve/reject student leaves" });
    }
    const leave = await Leave.findByIdAndUpdate(req.params.id, {
      status,
      remarks: remarks || null,
      reviewedBy: reviewedBy || null,
      reviewedAt: new Date()
    }, { new: true });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete/cancel faculty's own leave
router.delete("/leaves/:id", async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    if (leave.status !== "Pending") {
      return res.status(400).json({ error: "Only pending leaves can be cancelled" });
    }
    await Leave.findByIdAndDelete(req.params.id);
    res.json({ message: "Leave cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
