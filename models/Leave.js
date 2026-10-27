const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  leaveType: { type: String, required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  days: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, default: "Pending", enum: ["Pending", "Approved", "Rejected"] },
  applicantRole: { type: String, default: "student", enum: ["student", "faculty"] },
  remarks: { type: String, default: null },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  attachment: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Leave", leaveSchema);
