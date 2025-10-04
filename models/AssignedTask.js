const mongoose = require('mongoose');

const assignedTaskSchema = new mongoose.Schema({
  // Who assigned it (admin or system)
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Worker', 
    required: false,          // 🔧 Make optional (system can assign tasks)
    default: null 
  },

  // Who the task is assigned to
  workerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Worker', 
    required: true 
  },

  // Task details
  taskDescription: { 
    type: String, 
    required: true 
  },

  points: { 
    type: Number, 
    required: true,
    default: 0               // 🔧 Safe default to prevent validation errors
  },

  // Task lifecycle
  status: { 
    type: String, 
    enum: ['pending', 'review', 'completed'], 
    default: 'pending' 
  },

  assignedDate: { 
    type: Date, 
    default: Date.now 
  },

  completedDate: { 
    type: Date 
  },

  // Deadline now supports both manual & rule tasks
  deadline: {
    type: Date,
    required: true
  },

  // When worker submits for review
  submittedDate: {
    type: Date
  }
});

// Optional: auto-index for performance if you'll query often by workerId + status
assignedTaskSchema.index({ workerId: 1, status: 1 });

module.exports = mongoose.model('AssignedTask', assignedTaskSchema);
