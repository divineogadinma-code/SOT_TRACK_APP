// models/IoTDevice.js
const mongoose = require('mongoose');

const iotDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true }, // unique hardware ID
  name: { type: String, required: true },
  type: { type: String, enum: ['sensor', 'controller', 'camera', 'tracker'], default: 'sensor' },
  location: { type: String },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  lastSeen: { type: Date, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} } // store any extra info
}, { timestamps: true });

module.exports = mongoose.model('IoTDevice', iotDeviceSchema);
