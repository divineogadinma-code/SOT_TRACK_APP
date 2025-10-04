// services/recommender.js
const WorkerProfile = require('../models/WorkerProfile');
const WorkerActivity = require('../models/WorkerActivity');
const Task = require('../models/Task');
const mongoose = require('mongoose');

/**
 * Recommend tasks for a worker.
 * 1. Use WorkerProfile (strengths, preferred tasks).
 * 2. If no profile, fallback to recent activity aggregation.
 * 3. If no activity, fallback to tasks assigned historically.
 */
async function recommendTasksForWorker(workerId) {
  if (!mongoose.Types.ObjectId.isValid(workerId)) {
    return [];
  }

  // 1️⃣ Try WorkerProfile
  let profile = await WorkerProfile.findOne({ workerId }).lean();
  if (profile && profile.preferredTasks && profile.preferredTasks.length > 0) {
    const total = profile.preferredTasks.reduce((sum, t) => sum + t.score, 0) || 1;
    return profile.preferredTasks.map(t => ({
      taskType: t.taskType,
      score: t.score,
      confidence: Math.round((t.score / total) * 100)
    }));
  }

  // 2️⃣ Fallback: recent completed activities
  let activityAgg = await WorkerActivity.aggregate([
    { $match: { workerId: new mongoose.Types.ObjectId(workerId), eventType: 'complete_task' } },
    { $group: { _id: '$eventData.taskType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  if (activityAgg && activityAgg.length > 0) {
    const total = activityAgg.reduce((sum, a) => sum + a.count, 0) || 1;
    return activityAgg.map(a => ({
      taskType: a._id || 'General Task',
      score: a.count,
      confidence: Math.round((a.count / total) * 100)
    }));
  }

  // 3️⃣ Last fallback: Task history
  const taskAgg = await Task.aggregate([
    { $match: { workerId: new mongoose.Types.ObjectId(workerId) } },
    { $group: { _id: '$taskName', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const total = taskAgg.reduce((sum, a) => sum + a.count, 0) || 1;
  return taskAgg.map(a => ({
    taskType: a._id || 'General Task',
    score: a.count,
    confidence: Math.round((a.count / total) * 100)
  }));
}

module.exports = { recommendTasksForWorker };
