const mongoose = require('mongoose');
const WorkerActivity = require('../models/WorkerActivity');
const WorkerProfile = require('../models/WorkerProfile');

async function updateWorkerProfile(workerId) {
  try {
    // Aggregate task completion stats
    const agg = await WorkerActivity.aggregate([
      { $match: { workerId: new mongoose.Types.ObjectId(workerId), eventType: 'complete_task' } },
      {
        $group: {
          _id: '$eventData.taskType ',
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' }
        }
      }
    ]);

    const strengths = agg.filter(a => a.count >= 3).map(a => a._id);
    const weaknesses = agg.filter(a => a.avgDuration > 15000).map(a => a._id);
    const avgCompletionTime = agg.length > 0
      ? Math.round(agg.reduce((s, a) => s + (a.avgDuration || 0), 0) / agg.length)
      : 0;

    // --- NEW: aggregate active times + failures
    const timeAgg = await WorkerActivity.aggregate([
      { $match: { workerId: new mongoose.Types.ObjectId(workerId) } },
      {
        $group: {
          _id: '$timeOfDay',
          count: { $sum: 1 }
        }
      }
    ]);

    const activeTimes = {};
    timeAgg.forEach(t => {
      if (t._id) activeTimes[t._id] = t.count;
    });

    const failedAgg = await WorkerActivity.aggregate([
      { $match: { workerId: new mongoose.Types.ObjectId(workerId), success: false } },
      {
        $group: {
          _id: '$eventData.taskType',
          count: { $sum: 1 }
        }
      }
    ]);

    const failedTasks = {};
    failedAgg.forEach(f => {
      if (f._id) failedTasks[f._id] = f.count;
    });

    const completedAgg = await WorkerActivity.aggregate([
      { $match: { workerId: new mongoose.Types.ObjectId(workerId), eventType: 'complete_task' } },
      {
        $group: {
          _id: '$eventData.taskType',
          count: { $sum: 1 }
        }
      }
    ]);

    const completedTasks = {};
    completedAgg.forEach(c => {
      if (c._id) completedTasks[c._id] = c.count;
    });

    // --- Update or create profile ---
    let profile = await WorkerProfile.findOne({ workerId });
    if (!profile) {
      profile = new WorkerProfile({ workerId });
    }

    profile.strengths = strengths;
    profile.weaknesses = weaknesses;
    profile.avgCompletionTime = avgCompletionTime;
    profile.activeTimes = activeTimes;
    profile.failedTasks = failedTasks;
    profile.completedTasks = completedTasks;
    profile.lastUpdated = new Date();

    await profile.save();
    return profile;
  } catch (err) {
    console.error(`Error updating profile for worker ${workerId}:`, err);
    return null;
  }
}

module.exports = { updateWorkerProfile };
