// models/WorkerActivity.js
const mongoose = require('mongoose');

const workerActivitySchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  eventType: { type: String, required: true },
  eventData: { type: mongoose.Schema.Types.Mixed, default: {} },
  durationMs: { type: Number, default: 0 },
  deviceInfo: { os: String, appVersion: String },

  // NEW FIELDS
  timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night', 'other'], default: 'other' },
  success: { type: Boolean, default: true }

}, { timestamps: true });

module.exports = mongoose.model('WorkerActivity', workerActivitySchema);
