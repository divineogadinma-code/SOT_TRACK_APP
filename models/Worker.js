const mongoose = require('mongoose');
    const workerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    // The username they will use to log in
    username: {
        type: String,
        required: true,
        unique: true // Each username must be unique
    },
    // The securely hashed password
    password: {
        type: String,
        required: true
    },
    // The user's role: 'worker' or 'admin'
    role: {
        type: String,
        enum: ['worker', 'admin'],
        default: 'worker'
    },
    points: {
        type: Number,
        default: 0
    },
     startDate: {
        type: Date,
        default: Date.now
    },
     profilePicture: {
        type: String, // Will store the Base64 image data
        default: ''
    }
});


const Worker = mongoose.model('Worker', workerSchema);
module.exports = mongoose.model('Worker', workerSchema);