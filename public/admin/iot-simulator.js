document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) return (window.location.href = '/admin-login.html');

  const profilePic = document.getElementById('dash-profile-pic');
  const clockDisplay = document.getElementById('live-clock');
  const simulateBtn = document.getElementById('simulateBtn');
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  const logsContainer = document.getElementById('simulator-logs');

  // --- Live clock ---
  const updateClock = () => {
    const now = new Date();
    clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 1000);

  // --- Load profile ---
  (async () => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const adminId = payload.id;
      const res = await fetch(`/api/workers/${adminId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profilePicture) profilePic.src = data.profilePicture;
      }
    } catch (err) {
      console.error('Profile error:', err);
    }
  })();

  // --- Log display helper ---
  const addLog = (message, success = true) => {
    const line = document.createElement('div');
    const icon = success ? 'bi-check-circle text-success' : 'bi-x-circle text-danger';
    line.innerHTML = `<i class="bi ${icon} me-2"></i> ${message}`;
    logsContainer.prepend(line);
  };

  // --- Clear logs ---
  clearLogsBtn.addEventListener('click', () => {
    logsContainer.innerHTML = '<p>No activity yet.</p>';
  });

  // --- Simulate IoT Auto-Approval ---
  simulateBtn.addEventListener('click', async () => {
    const deviceId = document.getElementById('deviceId').value.trim();
    const workerName = document.getElementById('workerName').value.trim();

    if (!deviceId || !workerName) {
      addLog('Please enter both device ID and worker name.', false);
      return;
    }

    addLog(`Sending auto-approval from ${deviceId} for worker "${workerName}"...`);

    try {
      const res = await fetch('/api/iot/auto-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, workerName })
      });
      const data = await res.json();

      if (!res.ok) {
        addLog(`Error: ${data.message}`, false);
      } else {
        addLog(`✅ ${data.message} (${workerName})`);
      }
    } catch (err) {
      console.error(err);
      addLog('Failed to send auto-approval signal.', false);
    }
  });
});
