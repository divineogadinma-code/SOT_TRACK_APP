// routes/sotAI.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');
const Worker = require('../models/Worker');
const AssignedTask = require('../models/AssignedTask');
const Task = require('../models/Task');
const TaskRule = require('../models/TaskRule');

// === Helper: find worker by id/name/username ===
async function findWorkerByIdentifier(identifier) {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const w = await Worker.findById(identifier);
    if (w) return w;
  }
  const regex = new RegExp(`^${identifier.trim()}$`, 'i');
  return await Worker.findOne({ $or: [{ name: regex }, { username: regex }] });
}

// === Command Parser ===
function parseCommand(text) {
  const s = (text || '').trim();
  const lower = s.toLowerCase();

  // Greetings & small talk
  if (/^(hi|hello|hey|good (morning|afternoon|evening))$/i.test(lower))
    return { cmd: 'greeting' };

  if (/how (are you|are u|do you do)/i.test(lower))
    return { cmd: 'how_are_you' };

  if (/who (are you|r u|is sot ai)/i.test(lower))
    return { cmd: 'intro' };

  if (/help|commands|what can you do/i.test(lower))
    return { cmd: 'help' };

  // Assign task to worker
  let m;
  if ((m = s.match(/assign\s+(.+?)\s+to\s+(.+?)(?:\s+points\s+(\d+))?(?:\s+deadline\s+(\S+))?$/i))) {
    return { cmd: 'assign', task: m[1].trim(), worker: m[2].trim(), points: m[3] ? parseInt(m[3], 10) : 0, deadline: m[4] || undefined };
  }

  // Remove task
  if ((m = s.match(/(?:remove|delete)\s+(?:task\s+)?(.+?)\s+from\s+(.+)$/i))) {
    return { cmd: 'remove', task: m[1].trim(), worker: m[2].trim() };
  }

  // Approve
  if ((m = s.match(/(?:approve|auto-approve|approve latest)\s+(?:task\s+)?(?:for\s+)?(.+)$/i))) {
    return { cmd: 'approve', worker: m[1].trim() };
  }

  // Show tasks
  if ((m = s.match(/(?:show|list|get)\s+(?:tasks|assigned tasks)\s+(?:for\s+)?(.+)$/i))) {
    return { cmd: 'list_tasks', worker: m[1].trim() };
  }

  // Show points
  if ((m = s.match(/(?:show|get|what(?:'s| is))\s+(?:points|point total)\s+(?:for\s+)?(.+)$/i))) {
    return { cmd: 'show_points', worker: m[1].trim() };
  }

  // Rules
  if (/list\s+rules|show\s+rules|manage\s+rules/i.test(s)) {
    return { cmd: 'list_rules' };
  }

  // General “what is SOT” type questions
  if (/what is sot|sot system|explain sot/i.test(lower)) {
    return { cmd: 'about_sot' };
  }

  // Default fallback
  return { cmd: 'unknown' };
}

// === AI Chat Route ===
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, reply: 'Please type something first.' });

    const parsed = parseCommand(message);

    switch (parsed.cmd) {
      // === Conversational replies ===
      case 'greeting':
        return res.json({ success: true, reply: "👋 Hello there! I'm SOT AI — how can I assist you today?" });

      case 'how_are_you':
        return res.json({ success: true, reply: "I'm functioning at full capacity, thank you! How can I help you today?" });

      case 'intro':
        return res.json({ success: true, reply: "I'm SOT AI, your smart assistant that helps manage tasks, workers, and automation inside your Smart Operations Tracker system." });

      case 'help':
        return res.json({
          success: true,
          reply: `Here’s what I can do:
- 📝 Assign tasks → “Assign cleaning to John points 10 deadline 2025-10-10T14:00”
- ❌ Remove tasks → “Remove task cleaning from John”
- ✅ Approve → “Approve task for John”
- 📋 Show tasks → “Show tasks for John”
- ⭐ Show points → “Show points for John”
- ⚙️ List rules → “List rules”
- 💬 General chat → Say “Hi” or “What is SOT AI?”`
        });

      case 'about_sot':
        return res.json({
          success: true,
          reply: "SOT stands for **Smart Operations Tracker**, an intelligent workforce management system with IoT and AI integration. It helps automate task assignment, tracking, and approval — all in real time."
        });

      // === Task management commands ===
      case 'assign': {
        if (userRole !== 'admin')
          return res.status(403).json({ success: false, reply: 'Only admins can assign tasks.' });

        const worker = await findWorkerByIdentifier(parsed.worker);
        if (!worker) return res.status(404).json({ success: false, reply: `Worker "${parsed.worker}" not found.` });

        let deadline = parsed.deadline ? new Date(parsed.deadline) : new Date(Date.now() + 2 * 60 * 60 * 1000); // default 2hr
        if (isNaN(deadline)) deadline = new Date(Date.now() + 2 * 60 * 60 * 1000);

        const assigned = new AssignedTask({
          adminId: userId,
          workerId: worker._id,
          taskDescription: parsed.task,
          points: parsed.points || 0,
          deadline,
          status: 'pending'
        });
        await assigned.save();

        if (req.app.locals.broadcast) {
          req.app.locals.broadcast({
            type: 'NEW_TASK',
            workerId: worker._id.toString(),
            task: assigned
          });
        }

        return res.json({ success: true, reply: `✅ Assigned "${parsed.task}" to ${worker.name} (${parsed.points || 0} points, deadline ${deadline.toLocaleString()})` });
      }

      case 'remove': {
        if (userRole !== 'admin')
          return res.status(403).json({ success: false, reply: 'Only admins can remove tasks.' });

        const worker = await findWorkerByIdentifier(parsed.worker);
        if (!worker) return res.status(404).json({ success: false, reply: `Worker "${parsed.worker}" not found.` });

        const removed = await AssignedTask.findOneAndDelete({
          workerId: worker._id,
          taskDescription: new RegExp(parsed.task, 'i'),
          status: 'pending'
        });

        if (!removed) return res.status(404).json({ success: false, reply: `No pending task "${parsed.task}" found for ${worker.name}.` });

        if (req.app.locals.broadcast)
          req.app.locals.broadcast({ type: 'TASK_REMOVED', workerId: worker._id.toString(), taskId: removed._id });

        return res.json({ success: true, reply: `🗑️ Removed task "${removed.taskDescription}" from ${worker.name}.` });
      }

      case 'approve': {
        if (userRole !== 'admin')
          return res.status(403).json({ success: false, reply: 'Only admins can approve tasks.' });

        const worker = await findWorkerByIdentifier(parsed.worker);
        if (!worker) return res.status(404).json({ success: false, reply: `Worker "${parsed.worker}" not found.` });

        const pending = await AssignedTask.findOne({ workerId: worker._id, status: 'pending' }).sort({ assignedDate: -1 });
        if (!pending) return res.status(404).json({ success: false, reply: `No pending task found for ${worker.name}.` });

        pending.status = 'completed';
        pending.completedDate = new Date();
        await pending.save();

        const history = new Task({ workerId: worker._id, taskName: pending.taskDescription, points: pending.points });
        await history.save();

        await Worker.findByIdAndUpdate(worker._id, { $inc: { points: pending.points } });

        if (req.app.locals.broadcast)
          req.app.locals.broadcast({
            type: 'TASK_APPROVED_BY_AI',
            workerId: worker._id.toString(),
            taskId: pending._id,
            message: 'Task auto-approved by SOT AI'
          });

        return res.json({ success: true, reply: `✅ Task "${pending.taskDescription}" approved for ${worker.name}. ${pending.points} points awarded.` });
      }

      case 'list_tasks': {
        const worker = await findWorkerByIdentifier(parsed.worker);
        if (!worker) return res.status(404).json({ success: false, reply: `Worker "${parsed.worker}" not found.` });

        const tasks = await AssignedTask.find({ workerId: worker._id }).sort({ assignedDate: -1 }).lean();
        return res.json({ success: true, reply: `📋 ${worker.name} currently has ${tasks.length} tasks.`, data: tasks });
      }

      case 'show_points': {
        const worker = await findWorkerByIdentifier(parsed.worker);
        if (!worker) return res.status(404).json({ success: false, reply: `Worker "${parsed.worker}" not found.` });

        const refreshed = await Worker.findById(worker._id).select('points name username');
        return res.json({ success: true, reply: `⭐ ${refreshed.name} has ${refreshed.points} points.` });
      }

      case 'list_rules': {
        const rules = await TaskRule.find().populate('assignedTo', 'name username').sort({ createdAt: -1 });
        return res.json({ success: true, reply: `⚙️ Found ${rules.length} task rules.`, data: rules });
      }

      default:
        return res.json({
          success: false,
          reply: "🤖 I'm not sure I understood. Try: `Assign cleaning to John points 10`, `Approve task for Mary`, or `Show points for Divine`."
        });
    }
  } catch (err) {
    console.error('SOT AI Error:', err);
    return res.status(500).json({ success: false, reply: 'Internal server error in SOT AI.' });
  }
});

module.exports = router;
