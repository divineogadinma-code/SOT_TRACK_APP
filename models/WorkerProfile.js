// models/WorkerProfile.js
const mongoose = require('mongoose');

const WorkerProfileSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true, unique: true },

  // Preferred tasks (ranked)
  preferredTasks: [
    {
      taskType: String,
      score: { type: Number, default: 0 },  // How many times completed
      avgDuration: { type: Number, default: 0 } // Average time taken
    }
  ],

  strengths: [String],  // e.g. ["Egg Collection", "Feeding"]
  weaknesses: [String], // e.g. ["Cleaning", "Packing"]

  avgCompletionTime: { type: Number, default: 0 },  // across all tasks
  totalTasks: { type: Number, default: 0 },         // lifetime total
    // NEW FIELDS
  activeTimes: { type: Map, of: Number, default: {} }, // morning, afternoon, etc.
  failedTasks: { type: Map, of: Number, default: {} }, // { taskType: count }
  completedTasks: { type: Map, of: Number, default: {} }

}, { timestamps: true });

module.exports = mongoose.model('WorkerProfile', WorkerProfileSchema);
