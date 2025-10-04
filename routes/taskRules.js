// routes/taskRules.js
const express = require('express');
const router = express.Router();
const TaskRule = require('../models/TaskRule');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// === Create new rule ===
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { taskName, points, frequency, time, assignedTo, deadlineTime, broadcast } = req.body; // ✅ include broadcast flag

    // Build rule data
    const ruleData = {
      taskName,
      points: points || 0,
      frequency,
      time,
      deadlineTime,
      autoAssign: true,
      status: 'active',
      broadcast: !!broadcast, // ✅ force boolean
      assignedTo: broadcast ? null : assignedTo // ✅ properly clear for broadcast
    };

    const rule = new TaskRule(ruleData);
    await rule.save();

    // ✅ Populate assignedTo name if exists
    const populated = await rule.populate('assignedTo', 'name username');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating rule:', err);
    res.status(500).json({ message: 'Error creating rule' });
  }
});

// === Get all rules ===
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rules = await TaskRule.find().populate('assignedTo', 'name username');
    res.json(rules);
  } catch (err) {
    console.error('Error fetching rules:', err);
    res.status(500).json({ message: 'Error fetching rules' });
  }
});

// === Pause/Resume toggle ===
router.patch('/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rule = await TaskRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    rule.status = rule.status === 'active' ? 'paused' : 'active';
    await rule.save();

    res.json({ message: `Rule ${rule.status}`, rule });
  } catch (err) {
    res.status(500).json({ message: 'Error updating rule' });
  }
});

// === Delete rule ===
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await TaskRule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting rule' });
  }
});

module.exports = router;
