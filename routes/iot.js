// routes/iot.js
const express = require('express');
const router = express.Router();
const IoTDevice = require('../models/IoTDevice');
const IoTEvent = require('../models/IoTEvent');
const { handleIoTSignal } = require('../services/iotHandler');

// Simulate incoming IoT signal
router.post('/signal', async (req, res) => {
  const event = req.body;
  const result = await handleIoTSignal(event);
  res.json(result || { success: false });
});

// Device registration or heartbeat
router.post('/register', async (req, res) => {
  try {
    const { deviceId, name, type, location, meta } = req.body;
    const device = await IoTDevice.findOneAndUpdate(
      { deviceId },
      { name, type, location, status: 'online', lastSeen: new Date(), meta },
      { upsert: true, new: true }
    );
    res.json({ message: 'Device registered/updated', device });
  } catch (err) {
    console.error('IoT Register error:', err);
    res.status(500).json({ message: 'Error registering device' });
  }
});

// Log IoT events (like sensor data or task completion)
router.post('/event', async (req, res) => {
  try {
    const { deviceId, eventType, payload } = req.body;
    if (!deviceId || !eventType) return res.status(400).json({ message: 'deviceId and eventType required' });

    const event = new IoTEvent({ deviceId, eventType, payload });
    await event.save();

    await IoTDevice.findOneAndUpdate(
      { deviceId },
      { lastSeen: new Date(), status: 'online' }
    );

    res.json({ message: 'Event logged', event });
  } catch (err) {
    console.error('IoT Event error:', err);
    res.status(500).json({ message: 'Error logging IoT event' });
  }
});
// routes/iot.js (add below existing routes)
router.get('/summary', async (req, res) => {
  try {
    const total = await IoTDevice.countDocuments();
    const online = await IoTDevice.countDocuments({ status: 'online' });
    const offline = total - online;

    res.json({ total, online, offline });
  } catch (err) {
    console.error('IoT summary error:', err);
    res.status(500).json({ message: 'Error fetching IoT summary' });
  }
});

module.exports = router;
