// public/admin/insights.js
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/admin-login.html';
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const topActionsCanvas = document.getElementById('top-actions-chart');
  const workerSummaryContainer = document.getElementById('worker-summary');
  const recentActivitiesContainer = document.getElementById('recent-activities');
  const activityCountBadge = document.getElementById('activity-count');
  const profilePic = document.getElementById('dash-profile-pic');
  const clockDisplay = document.getElementById('live-clock');
  

  // Load admin profile picture
  const loadProfile = async () => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const adminId = payload.id;
      const res = await fetch(`/api/workers/${adminId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.profilePicture) profilePic.src = data.profilePicture;
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  // Live clock
  const updateClock = () => {
    if (clockDisplay) {
      const now = new Date();
      clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Fetch debug activities (total + recent)
  const loadDebugActivities = async () => {
    try {
      const res = await fetch('/api/smart/debug/activities', { headers: authHeaders });
      if (!res.ok) {
        console.warn('Debug endpoint returned', res.status);
        return { total: 0, recent: [] };
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Failed to load debug activities:', err);
      return { total: 0, recent: [] };
    }
  };

  // Render recent activities list
  const renderRecentActivities = (total, list) => {
    if (activityCountBadge) activityCountBadge.textContent = String(total || 0);
    if (!recentActivitiesContainer) return;

    if (!list || list.length === 0) {
      recentActivitiesContainer.innerHTML = '<p class="text-body-secondary small">No recent activity logged.</p>';
      return;
    }

    recentActivitiesContainer.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'd-flex align-items-start mb-2';
      const who = item.worker ? `${item.worker.name} (${item.worker.username})` : String(item.workerId);
      const when = new Date(item.createdAt).toLocaleString();
      const detail = item.eventData && Object.keys(item.eventData).length ? JSON.stringify(item.eventData) : '';
      row.innerHTML = `
        <div class="me-3"><i class="bi bi-person-circle fs-4"></i></div>
        <div class="small">
          <div><strong>${who}</strong> • <span class="text-muted">${item.eventType}</span></div>
          <div class="text-muted">${detail}</div>
          <div class="text-muted small">${when} • ${item.durationMs ?? 0} ms</div>
        </div>
      `;
      recentActivitiesContainer.appendChild(row);
    });
  };

  // load top actions (chart)
  const loadTopActions = async () => {
    if (!topActionsCanvas) return;
    try {
      const res = await fetch('/api/smart/admin/behavior/top-actions', { headers: authHeaders });
      if (!res.ok) {
        topActionsCanvas.outerHTML = '<p class="text-center text-muted">No top-actions data available.</p>';
        return;
      }
      const data = await res.json();
      const actions = data.topActions || [];
      if (actions.length === 0) {
        topActionsCanvas.outerHTML = '<p class="text-center text-muted">No activity data yet.</p>';
        return;
      }

      if (window._topActionsChart) window._topActionsChart.destroy();

      window._topActionsChart = new Chart(topActionsCanvas, {
        type: 'bar',
        data: {
          labels: actions.map(a => a._id),
          datasets: [{
            label: 'Top Actions',
            data: actions.map(a => a.count),
            backgroundColor: '#4CAF50'
          }]
        },
        options: { responsive: true }
      });
    } catch (err) {
      console.error('Error loading top actions:', err);
      if (topActionsCanvas) topActionsCanvas.outerHTML = '<p class="text-center text-danger">Failed to load top actions.</p>';
    }
  };

  // worker summary
  const loadWorkerSummary = async (workerId) => {
    try {
      const res = await fetch(`/api/smart/activity/summary/${workerId}`, { headers: authHeaders });
      if (!res.ok) return [];
      const data = await res.json();
      return data.summary || [];
    } catch (err) {
      console.error('Error loading worker summary', err);
      return [];
    }
  };

  // recommendations for worker card
  const loadRecommendations = async (workerId, parentBody) => {
    try {
      const res = await fetch(`/api/smart/recommend/task/${workerId}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();

      let container = parentBody.querySelector('.recommendations');
      if (!container) {
        container = document.createElement('div');
        container.className = 'recommendations mt-2';
        parentBody.appendChild(container);
      }

      container.innerHTML = `<h6 class="fw-bold">Top Predicted Tasks</h6>`;

      if (!data.recommendations || data.recommendations.length === 0) {
        container.innerHTML += `<p class="text-muted small">No predictions yet — log more tasks.</p>`;
        return;
      }

      data.recommendations.forEach(rec => {
        const card = document.createElement('div');
        card.className = "mb-2 p-2 border rounded small";
        card.innerHTML = `
          <div class="d-flex justify-content-between align-items-center">
            <strong>${rec.taskType}</strong>
            <span class="badge bg-primary">${rec.score}</span>
          </div>
          <div class="progress mt-1" style="height: 6px;">
            <div class="progress-bar bg-success"
                 role="progressbar"
                 style="width: ${rec.confidence}%"
                 aria-valuenow="${rec.confidence}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        `;
        container.appendChild(card);
      });
    } catch (err) {
      console.error("Error loading recommendations:", err);
    }
  };

  const loadWorkers = async () => {
  if (!workerSummaryContainer) return;
  try {
    const res = await fetch('/api/workers', { headers: authHeaders });
    if (!res.ok) {
      workerSummaryContainer.innerHTML = '<p class="text-center text-danger">Failed to load workers.</p>';
      return;
    }
    const workers = await res.json();
    workerSummaryContainer.innerHTML = '';

    for (const worker of workers) {
      if (worker.role === 'admin') continue;

      const summary = await loadWorkerSummary(worker._id);

      // fetch worker profile here
      let profile = {};
      try {
        const profileRes = await fetch(`/api/profile/${worker._id}`, { headers: authHeaders });
        if (profileRes.ok) {
          profile = await profileRes.json();
        }
      } catch (err) {
        console.warn(`No profile for worker ${worker._id}`, err);
      }

      const card = document.createElement('div');
      card.className = 'card digital-card mb-3';
      const body = document.createElement('div');
      body.className = 'card-body';
      body.innerHTML = `
        <h5 class="card-title">${worker.name}</h5>
        <ul class="small">
          ${summary.length === 0 ? '<li>No activity yet</li>' :
            summary.map(s => `<li>${s._id}: ${s.count} (avg ${Math.round(s.avgDuration || 0)}ms)</li>`).join('')}
        </ul>
        <div class="mt-2">
          <strong>Strengths:</strong> ${profile.strengths?.join(', ') || 'N/A'}<br>
          <strong>Weaknesses:</strong> ${profile.weaknesses?.join(', ') || 'N/A'}<br>
        </div>
      `;
      await loadBehavioralInsights(worker._id, body);
      card.appendChild(body);
      workerSummaryContainer.appendChild(card);

      await loadRecommendations(worker._id, body);
      
    }
  } catch (err) {
    console.error('Error loading workers:', err);
    workerSummaryContainer.innerHTML = '<p class="text-center text-danger">Failed to load workers.</p>';
  }
};

// --- Load global top predictions (across all workers) ---
const loadGlobalPredictions = async () => {
  try {
    const res = await fetch('/api/workers', { headers: authHeaders });
    if (!res.ok) return;

    const workers = await res.json();
    let allRecs = [];

    for (const worker of workers) {
      if (worker.role === 'admin') continue;

      const recRes = await fetch(`/api/smart/recommend/task/${worker._id}`, { headers: authHeaders });
      if (recRes.ok) {
        const data = await recRes.json();
        if (data.recommendations && data.recommendations.length > 0) {
          allRecs = allRecs.concat(data.recommendations);
        }
      }
    }

    // Aggregate by taskType
    const agg = {};
    allRecs.forEach(r => {
      if (!r.taskType) return;
      agg[r.taskType] = (agg[r.taskType] || 0) + r.score;
    });

    const sorted = Object.entries(agg)
      .map(([taskType, score]) => ({ taskType, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const container = document.getElementById('top-predictions-container');
    container.innerHTML = '';

    if (sorted.length === 0) {
      container.innerHTML = '<p class="text-muted">No predictions yet</p>';
      return;
    }

    sorted.forEach(rec => {
      const card = document.createElement('div');
      card.className = "mb-2 p-2 border rounded small";
      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <strong>${rec.taskType}</strong>
          <span class="badge bg-primary">${rec.score}</span>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading global predictions:", err);
  }
};

const loadBehavioralInsights = async (workerId, parentBody) => {
  try {
    const res = await fetch(`/api/smart/insights/${workerId}`, { headers: authHeaders });
    const data = await res.json();
    if (!data.insights) return;

    const { activeTimes = {}, failedTasks = {}, completedTasks = {}, avgCompletionTime = 0 } = data.insights;

    const formatMap = (map) => {
      if (!map || Object.keys(map).length === 0) return 'N/A';
      return Object.entries(map).map(([k, v]) => `${k}: ${v}`).join(', ');
    };

    const insightsDiv = document.createElement('div');
    insightsDiv.className = 'mt-2 small';
    insightsDiv.innerHTML = `
      <strong>Active Times:</strong> ${formatMap(activeTimes)}<br>
      <strong>Completed Tasks:</strong> ${formatMap(completedTasks)}<br>
      <strong>Avg Time:</strong> ${avgCompletionTime} ms
    `;
    parentBody.appendChild(insightsDiv);
  } catch (err) {
    console.error("Error loading behavioral insights:", err);
  }
};


async function loadPerformanceAnalyzer() {
  try {
    const res = await fetch('/api/leaderboard/performance', { headers: authHeaders });
    if (!res.ok) throw new Error("Failed to load performance leaderboard");

    const data = await res.json();
    const container = document.getElementById('performance-analyzer');
    container.innerHTML = '';

    if (!data.leaderboard || data.leaderboard.length === 0) {
      container.innerHTML = '<p class="text-muted">No performance data yet</p>';
      return;
    }

    // Highlights
    const { mostReliable, fastest, topPerformer } = data.highlights;

    container.innerHTML += `
      <h6 class="fw-bold">Highlights</h6>
      <ul class="small">
        <li>🏆 Most Reliable: <strong>${mostReliable?.name || 'N/A'}</strong></li>
        <li>⚡ Fastest: <strong>${fastest?.name || 'N/A'}</strong></li>
        <li>🎯 Top Performer: <strong>${topPerformer?.name || 'N/A'}</strong></li>
      </ul>
    `;

    // Table
    container.innerHTML += `
      <table class="table table-sm table-bordered mt-2 small">
        <thead><tr>
          <th>Name</th><th>Points</th><th>Avg Time</th><th>Reliability</th>
        </tr></thead>
        <tbody>
          ${data.leaderboard.map(w => `
            <tr>
              <td>${w.name}</td>
              <td>${w.points}</td>
              <td>${w.avgCompletionTime || 'N/A'} ms</td>
              <td>${w.reliabilityScore != null ? w.reliabilityScore.toFixed(2) : '0.00'}</td>

            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error("Error loading performance analyzer:", err);
  }
}
// --- Clear Recent Activities button handler ---
const clearBtn = document.getElementById('clear-activities-btn');
if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    // double-check admin intent
    if (!confirm('Clear all recent activities? This will permanently delete the activity logs.')) return;

    try {
      // Optimistically clear the UI
      if (recentActivitiesContainer) {
        recentActivitiesContainer.innerHTML = '<p class="text-body-secondary small">No recent activity logged.</p>';
      }
      if (activityCountBadge) activityCountBadge.textContent = '0';

      // Ask server to delete the logs
      const res = await fetch('/api/smart/debug/activities', {
        method: 'DELETE',
        headers: authHeaders
      });

      if (!res.ok) {
        // if server failed, show previous data request to refresh
        console.error('Failed to clear activities on server:', res.status);
        alert('Failed to clear activities on server.');
        // optionally reload activities from server
        const debug = await loadDebugActivities();
        renderRecentActivities(debug.total, debug.recent || []);
        return;
      }

      // success message (optional)
      const data = await res.json();
      console.log('Activities cleared:', data);
      // optional: show a toast if you use one
      // showToast('Recent activities cleared', 'success');

    } catch (err) {
      console.error('Error clearing activities:', err);
      alert('Error clearing activities.');
      // refresh from server to be safe
      const debug = await loadDebugActivities();
      renderRecentActivities(debug.total, debug.recent || []);
    }
  });
}



  // MAIN init flow
  (async () => {
    loadProfile();
    updateClock();
    setInterval(updateClock, 1000);

    const debug = await loadDebugActivities();
    renderRecentActivities(debug.total, debug.recent || []);
    await loadTopActions();
    await loadWorkers();
    await loadGlobalPredictions();
    await loadPerformanceAnalyzer(); 

  })();
});
