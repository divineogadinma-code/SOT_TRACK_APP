// server/iot/iotHandler.js
const AssignedTask = require('../models/AssignedTask');
const Worker = require('../models/Worker');

async function handleIoTSignal(event) {
  try {
    // Example: event = { workerId: '...', taskDescription: 'Feed Chickens', verified: true }

    if (!event.workerId || !event.taskDescription) {
      console.error("❌ Invalid IoT signal:", event);
      return;
    }

    // Find the matching pending task
    const task = await AssignedTask.findOne({
      workerId: event.workerId,
      taskDescription: event.taskDescription,
      status: 'pending'
    });

    if (!task) {
      console.log("⚠️ No matching pending task found for IoT event", event);
      return;
    }

    // Mark as completed
    task.status = 'completed';
    task.completedDate = new Date();
    await task.save();

    console.log(`✅ IoT auto-approved task: "${task.taskDescription}" for worker ${event.workerId}`);

    // (Optional) Update worker points
    if (task.points > 0) {
      await Worker.findByIdAndUpdate(event.workerId, { $inc: { points: task.points } });
    }

    // Return status
    return { success: true, taskId: task._id };
  } catch (err) {
    console.error("IoT handler error:", err);
  }
}

module.exports = { handleIoTSignal };
