// scheduler.js
const cron = require('node-cron');
const TaskRule = require('./models/TaskRule');
const AssignedTask = require('./models/AssignedTask');
const Worker = require('./models/Worker');

// Helper: normalize time to "h:mm AM/PM"
function normalizeTime(date) {
  let h = date.getHours();
  let m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function startScheduler(broadcast) {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentTime = normalizeTime(now);

      console.log("⏱ Scheduler tick at", currentTime);

      // Fetch active auto-assign rules
      const rules = await TaskRule.find({ status: 'active', autoAssign: true });

      for (const rule of rules) {
        console.log(`Checking rule "${rule.taskName}" — expected: ${rule.time}, now: ${currentTime}`);

        if (rule.time === currentTime) {
          console.log("✅ Rule matched! Assigning task:", rule.taskName);

          // Build deadline time dynamically
          let deadlineDate = new Date();
          if (rule.deadlineTime) {
            const [hm, ampm] = rule.deadlineTime.split(" ");
            let [hour, minute] = hm.split(":").map(Number);
            if (ampm === "PM" && hour !== 12) hour += 12;
            if (ampm === "AM" && hour === 12) hour = 0;
            deadlineDate.setHours(hour, minute, 0, 0);
          } else {
            deadlineDate = new Date(now.getTime() + 60 * 60 * 1000); // default 1hr
          }

          // === Broadcast mode ===
          if (rule.broadcast) {
            // Find all non-admin workers
            const workers = await Worker.find({ role: { $ne: 'admin' } });

            if (!workers || workers.length === 0) {
              console.warn(`⚠️ No workers found for broadcast rule "${rule.taskName}"`);
              continue;
            }

            for (const worker of workers) {
              if (!worker || !worker._id) {
                console.error("⚠️ Skipping invalid worker entry:", worker);
                continue;
              }

              const newAssigned = new AssignedTask({
                adminId: null, // System auto-assigned
                workerId: worker._id,
                taskDescription: rule.taskName,
                points: rule.points || 0,
                deadline: deadlineDate,
                status: 'pending'
              });

              await newAssigned.save();
              console.log(`📌 Broadcasted "${rule.taskName}" to worker ${worker.name} (${worker._id})`);

              // WebSocket broadcast
              broadcast({
                type: 'NEW_TASK',
                workerId: worker._id.toString(),
                task: newAssigned
              });
            }

          // === Single assignment mode ===
          } else {
            if (!rule.assignedTo) {
              console.warn(`⚠️ Rule "${rule.taskName}" has no assigned worker (broadcast=false), skipping.`);
              continue;
            }

            const newAssigned = new AssignedTask({
              adminId: null,
              workerId: rule.assignedTo,
              taskDescription: rule.taskName,
              points: rule.points || 0,
              deadline: deadlineDate,
              status: 'pending'
            });

            await newAssigned.save();
            console.log(`📌 Assigned "${rule.taskName}" directly to worker ${rule.assignedTo}`);

            broadcast({
              type: 'NEW_TASK',
              workerId: rule.assignedTo.toString(),
              task: newAssigned
            });
          }
        }
      }
    } catch (err) {
      console.error("Scheduler error:", err);
    }
  });
}

module.exports = { startScheduler };
