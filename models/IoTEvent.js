// models/IoTEvent.js
const mongoose = require('mongoose');

const iotEventSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  eventType: { type: String, required: true }, // e.g. "temperature_update", "task_done"
  payload: { type: mongoose.Schema.Types.Mixed, default: {} }, // flexible
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IoTEvent', iotEventSchema);
