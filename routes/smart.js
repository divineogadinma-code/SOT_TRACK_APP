// routes/smart.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WorkerActivity = require('../models/WorkerActivity');
const Task = require('../models/Task');
const Worker = require('../models/Worker');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { recommendTasksForWorker } = require('../services/recommender');
const WorkerProfile = require('../models/WorkerProfile');
const { updateWorkerProfile } = require('../services/profileUpdater');


/**
 * POST: Log an activity event (workers call this)
 */
router.post('/activity', authMiddleware, async (req, res) => {
  try {
    const workerId = req.user.id;
    let { eventType, eventData, durationMs = 0 } = req.body;
    const now = new Date();
let timeOfDay = "other";
const hour = now.getHours();
if (hour >= 5 && hour < 12) timeOfDay = "morning";
else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
else if (hour >= 17 && hour < 21) timeOfDay = "evening";
else timeOfDay = "night";

// add success/failure detection
let success = true;
if (eventType === "task_failed" || (eventData && eventData.failed)) {
  success = false;
}

if (!eventData || typeof eventData !== 'object') {
  try {
    eventData = JSON.parse(eventData); // if it came as string
  } catch {
    eventData = {}; // fallback
  }
}

    if (!eventType) {
      return res.status(400).json({ message: 'eventType required' });
    }

    const activity = new WorkerActivity({
      workerId,
      eventType,
      eventData,
      durationMs,
      timeOfDay,
  success
    });

    await activity.save();
    // After activity.save()
// update profile after each activity
await updateWorkerProfile(workerId);

    // Optional: broadcast to admin dashboards
    if (req.app.locals && req.app.locals.broadcast) {
      req.app.locals.broadcast({ type: 'ACTIVITY_LOGGED', workerId });
    }

    res.status(201).json({ message: 'Activity logged', activity });
  } catch (err) {
    console.error('Error logging activity', err);
    res.status(500).json({ message: 'Error logging activity' });
  }
});

/**
 * GET: Behavior summary for a worker
 */
router.get('/activity/summary/:workerId', authMiddleware, async (req, res) => {
  try {
    const { workerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.json({ summary: [] });
    }

    const agg = await WorkerActivity.aggregate([
      { $match: { workerId: new mongoose.Types.ObjectId(workerId) } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ summary: agg || [] });
  } catch (err) {
    console.error('Error fetching summary', err);
    res.status(500).json({ message: 'Error fetching summary' });
  }
});

// DELETE: Clear all activity logs (admin only)
router.delete('/debug/activities', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await WorkerActivity.deleteMany({});
    // optional: notify UI(s) that activities were cleared
    if (req.app.locals && req.app.locals.broadcast) {
      req.app.locals.broadcast({ type: 'ACTIVITIES_CLEARED', deletedCount: result.deletedCount || 0 });
    }
    res.json({ message: 'Activities cleared', deletedCount: result.deletedCount || 0 });
  } catch (err) {
    console.error('Error clearing activities:', err);
    res.status(500).json({ message: 'Error clearing activities' });
  }
});

/**
 * GET: Recommend tasks for a worker
 */


// GET: recommendations (now powered by profile)
// GET: Basic recommend endpoint — returns top task types for worker

router.get('/recommend/task/:workerId', authMiddleware, async (req, res) => {
  try {
    const recommendations = await recommendTasksForWorker(req.params.workerId);
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ message: 'Error computing recommendations' });
  }
});


/**
 * GET: Admin top behaviors across workers
 */
router.get('/admin/behavior/top-actions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const agg = await WorkerActivity.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({ topActions: agg || [] });
  } catch (err) {
    console.error('Error fetching top actions', err);
    res.status(500).json({ message: 'Error fetching top actions' });
  }
});

/**
 * DEBUG: return totals and last N activities (admin-only)
 * Use this to confirm the DB is receiving activity events.
 */
router.get('/debug/activities', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const total = await WorkerActivity.countDocuments();
    const recent = await WorkerActivity.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('workerId eventType eventData durationMs createdAt')
      .lean();

    // Optional: populate worker names if Worker model present
    const workerIds = [...new Set(recent.map(r => String(r.workerId)))];
    const workers = await Worker.find({ _id: { $in: workerIds } }).select('name username').lean();
    const workerMap = {};
    workers.forEach(w => { workerMap[String(w._id)] = w; });

    const recentWithMeta = recent.map(r => ({
      ...r,
      worker: workerMap[String(r.workerId)] || null
    }));

    res.json({ total, recent: recentWithMeta });
  } catch (err) {
    console.error('Error in debug activities:', err);
    res.status(500).json({ total: 0, recent: [] });
  }
});
// GET: Behavioral insights for worker
router.get('/insights/:workerId', authMiddleware, async (req, res) => {
  try {
    const { workerId } = req.params;
    const profile = await WorkerProfile.findOne({ workerId });
    if (!profile) return res.json({ insights: {} });

    const insights = {
      activeTimes: Object.fromEntries(profile.activeTimes),
      failedTasks: Object.fromEntries(profile.failedTasks),
      completedTasks: Object.fromEntries(profile.completedTasks),
      avgCompletionTime: profile.avgCompletionTime
    };

    res.json({ insights });
  } catch (err) {
    console.error("Error fetching insights:", err);
    res.status(500).json({ message: "Error fetching insights" });
  }
});


module.exports = router;
