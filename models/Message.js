const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    recipientId: { type: String, required: true }, // 'all' or a specific worker ID
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    // ADDED: Array of user IDs who have read this message
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }],
    // ADDED: Array of user IDs who have "deleted" this message from their view
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }]
});

module.exports = mongoose.model('Message', messageSchema);