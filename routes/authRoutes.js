const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const FACULTY_SECRET = "CRCE-FACULTY-2026";

// Student Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, course, year } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashed, course, year, role: "student" });
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      course: user.course,
      year: user.year
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
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
      course: user.course,
      year: user.year
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty Register
router.post("/faculty-register", async (req, res) => {
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
router.post("/faculty-login", async (req, res) => {
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

module.exports = router;

