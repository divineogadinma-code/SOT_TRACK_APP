// models/TaskRule.js
const mongoose = require('mongoose');

const taskRuleSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true,
    default: 0
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  time: {
    type: String, // e.g. "08:30 AM"
    required: true
  },
  deadlineTime: { type: String }, // Deadline time (e.g. "05:00 PM")
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: false
  },
  // allow broadcast to all workers
  broadcast: {
    type: Boolean,
    default: false
  },
  autoAssign: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TaskRule', taskRuleSchema);
