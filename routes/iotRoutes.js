const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const AssignedTask = require('../models/AssignedTask');
const Task = require('../models/Task'); // ✅ Add this to record activity

// POST: IoT auto-approval signal
router.post('/auto-approve', async (req, res) => {
  try {
    const { deviceId, workerName } = req.body;
    if (!deviceId || !workerName)
      return res.status(400).json({ message: 'Device ID and worker name are required' });

    // ✅ Find worker by name OR username (case-insensitive)
    const worker = await Worker.findOne({
      $or: [
        { name: new RegExp(`^${workerName}$`, 'i') },
        { username: new RegExp(`^${workerName}$`, 'i') }
      ]
    });

    if (!worker)
      return res.status(404).json({ message: `Worker "${workerName}" not found` });

    // ✅ Find latest pending task
    const pendingTask = await AssignedTask.findOne({
      workerId: worker._id,
      status: 'pending'
    }).sort({ assignedDate: -1 });

    if (!pendingTask)
      return res.status(404).json({ message: `No pending task found for ${worker.name}` });

    // ✅ Mark as completed
    pendingTask.status = 'completed';
    pendingTask.completedDate = new Date();
    await pendingTask.save();

    // ✅ Update worker points
    worker.points = (worker.points || 0) + (pendingTask.points || 0);
    await worker.save();

    // ✅ Log the completed task as activity
    const activity = new Task({
      workerId: worker._id,
      taskName: pendingTask.taskDescription,
      points: pendingTask.points || 0,
      timestamp: new Date(),
      status: 'completed',
      source: 'IoT Auto-Approval'
    });
    await activity.save();

    // ✅ Notify worker dashboard in real time
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast({
        type: 'TASK_COMPLETED_AUTO',
        workerId: worker._id.toString(),
        taskId: pendingTask._id,
        message: `Task "${pendingTask.taskDescription}" auto-approved by IoT system`,
        activity: {
          taskName: pendingTask.taskDescription,
          points: pendingTask.points,
          timestamp: new Date(),
          source: 'IoT'
        }
      });
    }

    res.json({
      message: `Task "${pendingTask.taskDescription}" auto-approved for ${worker.name}.`,
      newPoints: worker.points,
      task: pendingTask
    });
  } catch (err) {
    console.error('IoT Auto-Approve Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
