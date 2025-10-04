document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/admin-login.html';
    return;
  }

  const headers = { 
    "Authorization": `Bearer ${token}`, 
    "Content-Type": "application/json" 
  };

  const tableBody = document.getElementById('taskRulesTableBody');
  const form = document.getElementById('add-rule-form');
  const assignedToSelect = document.getElementById('assignedTo');

  // === Clock ===
  const clockDisplay = document.getElementById('live-clock');
  function updateClock() {
    const now = new Date();
    if (clockDisplay) {
      clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  // === Profile Pic ===
  async function loadProfile() {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const adminId = payload.id;
      const res = await fetch(`/api/workers/${adminId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.profilePicture) {
          document.getElementById('dash-profile-pic').src = data.profilePicture;
        }
      }
    } catch (err) {
      console.error("Profile load error:", err);
    }
  }
  loadProfile();

  // === Load workers into dropdown ===
  async function loadWorkersDropdown() {
    try {
      const res = await fetch('/api/workers', { headers });
      const workers = await res.json();

      assignedToSelect.innerHTML = '';

      // Broadcast option
      const broadcastOpt = document.createElement('option');
      broadcastOpt.value = 'broadcast';
      broadcastOpt.textContent = 'Broadcast (All Workers)';
      assignedToSelect.appendChild(broadcastOpt);

      workers.forEach(worker => {
        if (worker.role !== 'admin') {
          const opt = document.createElement('option');
          opt.value = worker._id;
          opt.textContent = worker.name || worker.username;
          assignedToSelect.appendChild(opt);
        }
      });
    } catch (err) {
      console.error("Failed to load workers:", err);
    }
  }

  // === Load Rules ===
  async function loadRules() {
    try {
      const res = await fetch('/api/task-rules', { headers });
      const rules = await res.json();

      if (!Array.isArray(rules)) {
        console.error("Unexpected response:", rules);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-danger">Failed to load rules</td></tr>';
        return;
      }

      tableBody.innerHTML = '';

      rules.forEach(rule => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${rule.taskName}</td>
          <td>${rule.points || 0}</td>
          <td>${rule.frequency}</td>
          <td>${rule.time}</td>
            <td>${rule.deadlineTime || '-'}</td> <!-- NEW -->
          <td>
  ${rule.broadcast 
    ? '<span class="text-info fw-bold">All Workers</span>' 
    : (rule.assignedTo?.name || "Unassigned")}
</td>

          <td><span class="badge ${rule.status === 'active' ? 'bg-success' : 'bg-secondary'}">${rule.status}</span></td>
          <td>
            <button class="btn btn-sm btn-warning toggle-btn" data-id="${rule._id}">
              ${rule.status === 'active' ? 'Pause' : 'Resume'}
            </button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${rule._id}">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });

    } catch (err) {
      console.error("Failed to load rules:", err);
    }
  }

  // === Add new rule ===
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Convert taskTime to 12hr AM/PM
    let rawTime = document.getElementById('taskTime').value; // e.g. "08:30"
    let formattedTime = rawTime;
    if (rawTime) {
      const [h, m] = rawTime.split(':');
      let hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
      formattedTime = `${hour}:${m} ${ampm}`;
    }

    const assignedToValue = document.getElementById('assignedTo').value;

    const body = {
      taskName: document.getElementById('taskName').value,
      points: parseInt(document.getElementById('points').value, 10) || 0,
      frequency: document.getElementById('frequency').value,
      time: formattedTime,
      deadlineTime: document.getElementById('deadlineTime').value, // only HH:mm
      broadcast: assignedToValue === 'broadcast',
      assignedTo: assignedToValue !== 'broadcast' ? assignedToValue : null
    };

    try {
      await fetch('/api/task-rules', { method: 'POST', headers, body: JSON.stringify(body) });
      form.reset();
      loadRules();
    } catch (err) {
      console.error("Error adding task rule:", err);
    }
  });

  // === Toggle & delete ===
  tableBody.addEventListener('click', async e => {
    if (e.target.classList.contains('toggle-btn')) {
      const id = e.target.dataset.id;
      await fetch(`/api/task-rules/${id}/toggle`, { method: 'PATCH', headers });
      loadRules();
    }
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      await fetch(`/api/task-rules/${id}`, { method: 'DELETE', headers });
      loadRules();
    }
  });

  // Init
  loadWorkersDropdown();
  loadRules();
});
