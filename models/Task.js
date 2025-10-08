const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    // Link to the worker who performed the task
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker', // This connects it to our Worker model
        required: true
    },
    taskName: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    // Automatically add a timestamp when the task is created
    timestamp: {
        type: Date,
        default: Date.now
    },
source: {
  type: String,
  default: 'manual' // other values can be 'IoT Auto-Approval'
}

});

module.exports = mongoose.model('Task', taskSchema);