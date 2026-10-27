const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  singletonKey: { type: String, default: "config", unique: true },
  leaveTypes: [{
    name: { type: String, required: true },
    maxDays: { type: Number, required: true },
    applicableTo: [{ type: String, enum: ["student", "faculty"] }]
  }],
  leaveLimits: {
    student: { type: Number, default: 30 },
    faculty: { type: Number, default: 120 }
  },
  portalSettings: {
    studentPortalEnabled: { type: Boolean, default: true },
    facultyPortalEnabled: { type: Boolean, default: true },
    hodPortalEnabled: { type: Boolean, default: true }
  },
  academicYear: { type: String, default: "2025-26" },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Config", configSchema);
