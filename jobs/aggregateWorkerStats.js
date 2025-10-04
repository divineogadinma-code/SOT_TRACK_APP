// jobs/aggregateWorkerStats.js
const cron = require('node-cron');
const mongoose = require('mongoose');
const WorkerActivity = require('../models/WorkerActivity');
const WorkerProfile = require('../models/WorkerProfile'); // new agg model

// run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const workers = await WorkerActivity.distinct('workerId');
    for (const w of workers) {
      const agg = await WorkerActivity.aggregate([
        { $match: { workerId: mongoose.Types.ObjectId(w) } },
        { $group: {
            _id: '$eventData.taskType',
            count: { $sum: 1 },
            avgDuration: { $avg: '$durationMs' },
            lastAt: { $max: '$createdAt' }
        }},
        { $sort: { count: -1 } }
      ]);
      // transform to maps
      const counts = {}; const avgDuration = {}; let lastActivityAt = null;
      agg.forEach(a => {
        counts[a._id] = a.count;
        avgDuration[a._id] = Math.round(a.avgDuration || 0);
        if (!lastActivityAt || new Date(a.lastAt) > new Date(lastActivityAt)) lastActivityAt = a.lastAt;
      });

      await WorkerProfile.findOneAndUpdate(
        { workerId: w },
        { counts, avgDuration, lastActivityAt, updatedAt: new Date() },
        { upsert: true }
      );
    }
    console.log('Aggregations done');
  } catch (err) {
    console.error('Agg job error', err);
  }
});
