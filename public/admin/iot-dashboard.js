// public/admin/iot-dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "/admin-login.html");

  // --- Elements ---
  const profilePic = document.getElementById("dash-profile-pic");
  const clockDisplay = document.getElementById("live-clock");

  const connectedDevicesEl = document.getElementById("connected-devices-count");
  const activeSensorsEl = document.getElementById("active-sensors-count");
  const lastSignalEl = document.getElementById("last-signal-time");
  const connectionHealthEl = document.getElementById("connection-health");

  const recentSignalsEl = document.getElementById("recent-signals");
  const clearSignalsBtn = document.getElementById("clear-signals-btn");

  const recentEventsEl = document.getElementById("recent-events");
  const clearEventsBtn = document.getElementById("clear-events-btn");

  // NEW: IoT Auto-Approval tracking
  const approvedTasksEl = document.getElementById("approved-tasks-count");
  const approvalLogEl = document.getElementById("auto-approval-log");
  const clearApprovalsBtn = document.getElementById("clear-approvals-btn");

  // --- Load profile pic ---
  (async () => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const adminId = payload.id;
      const res = await fetch(`/api/workers/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profilePicture) profilePic.src = data.profilePicture;
      }
    } catch (err) {
      console.error("Profile error:", err);
    }
  })();

  // --- Live Clock ---
  const updateClock = () => {
    const now = new Date();
    clockDisplay.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  updateClock();
  setInterval(updateClock, 1000);

  // --- Simulated IoT Data ---
  function simulateIoTSignal() {
    const connected = Math.floor(Math.random() * 10) + 1;
    const sensors = Math.floor(Math.random() * 30) + 5;
    const signalTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const healthStates = ["Good", "Moderate", "Weak"];
    const health = healthStates[Math.floor(Math.random() * healthStates.length)];

    connectedDevicesEl.textContent = connected;
    activeSensorsEl.textContent = sensors;
    lastSignalEl.textContent = signalTime;
    connectionHealthEl.textContent = health;
    connectionHealthEl.className = `fw-bold text-${
      health === "Good" ? "success" : health === "Moderate" ? "warning" : "danger"
    }`;

    // Log signal
    const log = document.createElement("div");
    log.innerHTML = `<i class="bi bi-cpu text-success me-2"></i>
                     Device-${Math.floor(Math.random() * 1000)} sent signal at ${signalTime}`;
    recentSignalsEl.prepend(log);

    // Trigger simulated IoT event sometimes
    if (Math.random() < 0.5) simulateIoTEvent();
    if (Math.random() < 0.4) simulateIoTAutoApproval(); // NEW: occasional auto-approval
  }

  // --- Simulated IoT Events ---
  function simulateIoTEvent() {
    const eventTypes = [
      { type: "Temperature High", icon: "bi-thermometer-high", color: "danger" },
      { type: "Motion Detected", icon: "bi-person-walking", color: "warning" },
      { type: "Device Connected", icon: "bi-wifi", color: "success" },
      { type: "Device Disconnected", icon: "bi-wifi-off", color: "secondary" },
    ];

    const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const row = document.createElement("div");
    row.className = "mb-2";
    row.innerHTML = `
      <div>
        <i class="bi ${event.icon} text-${event.color} me-2"></i>
        <strong>${event.type}</strong>
        <span class="text-muted small">at ${time}</span>
      </div>
    `;

    recentEventsEl.prepend(row);
  }

  async function simulateIoTAutoApproval() {
  const workerNames = ["Divine", "Sarah", "Daniel", "Chris", "Martha"];
  const tasks = ["Feed Chickens", "Clean Hatchery", "Collect Eggs", "Inspect Feed", "Pack Deliveries"];

  const workerName = workerNames[Math.floor(Math.random() * workerNames.length)];
  const taskName = tasks[Math.floor(Math.random() * tasks.length)];
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  try {
    // 1️⃣ Find workerId from backend by name (in real IoT, this would be known from device link)
    const workersRes = await fetch('/api/workers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const workers = await workersRes.json();
    const worker = workers.find(w => w.name === workerName);

    if (!worker) {
      console.warn(`Worker "${workerName}" not found for IoT approval.`);
      return;
    }

    // 2️⃣ Send request to backend IoT route
    const res = await fetch('/api/iot/auto-approve', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workerId: worker._id,
        deviceId: `DEVICE-${Math.floor(Math.random() * 1000)}`,
        sensorData: { completed: true } // simulate IoT completion
      })
    });

    const data = await res.json();

    // 3️⃣ Update frontend
    if (res.ok && data.task) {
      approvedTasks++;
      approvedTasksEl.textContent = approvedTasks;

      const log = document.createElement("div");
      log.innerHTML = `
        <i class="bi bi-check-circle text-success me-2"></i>
        IoT approved <strong>${taskName}</strong> for ${workerName} at ${time}
      `;
      approvalLogEl.prepend(log);
    } else {
      console.warn('IoT approval skipped:', data.message);
    }

  } catch (err) {
    console.error("IoT auto-approval error:", err);
  }
}


  // --- Clear Buttons ---
  clearSignalsBtn.addEventListener("click", () => {
    recentSignalsEl.innerHTML = "<p>No recent IoT signals received.</p>";
  });

  clearEventsBtn.addEventListener("click", () => {
    recentEventsEl.innerHTML = "<p>No IoT events recorded yet.</p>";
  });

  if (clearApprovalsBtn) {
    clearApprovalsBtn.addEventListener("click", () => {
      approvalLogEl.innerHTML = "<p>No auto-approvals yet.</p>";
      approvedTasks = 0;
      approvedTasksEl.textContent = "0";
    });
  }

  // --- Start Simulation ---
  setInterval(simulateIoTSignal, 8000);
});
