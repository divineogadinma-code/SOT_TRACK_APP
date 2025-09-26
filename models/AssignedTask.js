const mongoose = require('mongoose');

const assignedTaskSchema = new mongoose.Schema({
    adminId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Worker', 
        required: true 
    },
    workerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Worker', 
        required: true 
    },
    taskDescription: { 
        type: String, 
        required: true 
    },
    points: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending','review', 'completed'], 
        default: 'pending' 
    },
    assignedDate: { 
        type: Date, 
        default: Date.now 
    },
    completedDate: { 
        type: Date 
    },

// ADD THIS NEW FIELD
deadline: {
    type: Date,
    required: true
},
// ADD THIS NEW FIELD
submittedDate: {
    type: Date
}
});

module.exports = mongoose.model('AssignedTask', assignedTaskSchema);
