const express = require('express');
const router = express.Router();
const WorkerProfile = require('../models/WorkerProfile');
const { authMiddleware } = require('../middleware/auth');
const { updateWorkerProfile } = require('../services/profileUpdater');

router.get('/:workerId', authMiddleware, async (req, res) => {
  try {
    let profile = await WorkerProfile.findOne({ workerId: req.params.workerId });

    // Always update before returning
    profile = await updateWorkerProfile(req.params.workerId);

    if (!profile) {
      return res.json({
        strengths: [],
        weaknesses: [],
        avgCompletionTime: 0,
        activeTimes: {},
        failedTasks: {},
        completedTasks: {}
      });
    }

    res.json(profile);
  } catch (err) {
    console.error("Error fetching worker profile:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

module.exports = router;
