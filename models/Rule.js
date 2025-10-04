    const mongoose = require('mongoose');

    const ruleSchema = new mongoose.Schema({
        title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        // To allow for reordering later if needed
        order: {
            type: Number,
            default: 0
        }
    });

    module.exports = mongoose.model('Rule', ruleSchema);
    