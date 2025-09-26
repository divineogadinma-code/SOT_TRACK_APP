document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const workerId = params.get('id');
    const token = localStorage.getItem('token');

    if (!token || !workerId) {
        window.location.href = '/index.html';
        return;
    }

    // --- Get ALL elements from your dashboard ---
    const welcomeHeader = document.getElementById('welcome-header');
    const profilePic = document.getElementById('dash-profile-pic');
    const smallChartCanvas = document.getElementById('worker-chart-small');
    const pendingTasksList = document.getElementById('pending-tasks-list');
    const activityList = document.getElementById('tasks-table-body');
    let smallChartInstance = null;
    
    // ADDED: New elements for the digital redesign
    const clockDisplay = document.getElementById('live-clock');
    const pointsCircle = document.getElementById('points-circle');
    const ratingCircle = document.getElementById('rating-circle');
    
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- UPDATED: fetchData now also gets the rating ---
    const fetchData = async () => {
        showLoader();
        try {
            const [workerRes, tasksRes, assignedTasksRes, ratingRes] = await Promise.all([
                fetch(`/api/workers/${workerId}`, { headers: authHeaders }),
                fetch(`/api/tasks/${workerId}`, { headers: authHeaders }),
                fetch('/api/assigned-tasks', { headers: authHeaders }),
                fetch(`/api/workers/${workerId}/rating`, { headers: authHeaders }) // Added rating fetch
            ]);

            if (workerRes.status === 401 || workerRes.status === 403) throw new Error('Access Denied');
            if (!workerRes.ok || !tasksRes.ok || !assignedTasksRes.ok || !ratingRes.ok) throw new Error('Failed to fetch dashboard data');

            const worker = await workerRes.json();
            const tasks = await tasksRes.json();
            const assignedTasks = await assignedTasksRes.json();
            const ratingData = await ratingRes.json(); // Get rating data

            displayDashboard(worker, tasks, assignedTasks, ratingData.rating); // Pass rating to display function

        } catch (error) {
            console.error('Error loading dashboard:', error);
            if (error.message === 'Access Denied') {
                showToast('Your session has expired. Please log in again.', 'error');
                setTimeout(() => window.location.href = '/index.html', 2000);
            } else {
                showToast(`Error: ${error.message}`, 'error');
            }
        } finally {
            hideLoader();
        }
    };

    // --- ADDED: Count-up animation function ---
    const animateCountUp = (element, endValue, isDecimal = false) => {
        if (!element) return; // Failsafe if element doesn't exist
        let startValue = 0;
        const duration = 1500; // 1.5 seconds
        const startTime = performance.now();

        function update(currentTime) {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime >= duration) {
                element.textContent = isDecimal ? endValue.toFixed(1) : endValue.toLocaleString();
                return;
            }
            
            const progress = elapsedTime / duration;
            const currentValue = startValue + (endValue - startValue) * progress;

            element.textContent = isDecimal ? currentValue.toFixed(1) : Math.round(currentValue).toLocaleString();
            requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    };

    // --- UPDATED: displayDashboard now populates all elements ---
    const displayDashboard = (worker, tasks, assignedTasks, rating) => {
        // Your original display logic
        welcomeHeader.textContent = `Hello, ${worker.name.split(' ')[0]}!`;
        if (worker.profilePicture) {
            profilePic.src = worker.profilePicture;
        }
        

        // ADDED: Animate the new circular cards
        animateCountUp(pointsCircle, worker.points);
        animateCountUp(ratingCircle, rating, true);

        // Your original pending tasks preview logic
        pendingTasksList.innerHTML = '';
        if (assignedTasks.length > 0) {
            assignedTasks.slice(0, 3).forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.innerHTML = `
                    <span>${task.taskDescription}</span>
                    <span class="badge rounded-pill bg-primary">${task.points} pts</span>
                `;
                pendingTasksList.appendChild(taskItem);
            });
        } else {
            pendingTasksList.innerHTML = '<p class="text-center text-muted mt-3">No pending tasks.</p>';
        }

        // Your original recent activity list logic
        activityList.innerHTML = '';
        if (tasks.length > 0) {
            tasks.slice(0, 5).forEach(task => {
                const activityItem = document.createElement('a');
                activityItem.href = '#';
                activityItem.className = 'list-group-item list-group-item-action';
                activityItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${task.taskName}</h6>
                        <small>${new Date(task.timestamp).toLocaleDateString()}</small>
                    </div>
                    <small class="text-success fw-bold">+${task.points} Points</small>
                `;
                activityList.appendChild(activityItem);
            });
        } else {
            activityList.innerHTML = '<p class="text-center text-muted">No recent activity.</p>';
        }

        // Your original small chart rendering logic
        renderSmallChart(worker, tasks);
    };

    // This function is unchanged from your original code
    const renderSmallChart = (worker, tasks) => {
        if (smallChartInstance) smallChartInstance.destroy();
        const sortedTasks = tasks.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const dataPoints = [];
        const initialPoints = sortedTasks.reduce((total, task) => total - task.points, worker.points);
        const firstTimestamp = sortedTasks.length > 0 ? new Date(sortedTasks[0].timestamp) : new Date();
        dataPoints.push({ x: new Date(firstTimestamp).setDate(firstTimestamp.getDate() - 1), y: initialPoints });
        let cumulativePoints = 0;
        sortedTasks.forEach(task => {
            cumulativePoints += task.points;
            dataPoints.push({ x: new Date(task.timestamp), y: initialPoints + cumulativePoints });
        });
        if (sortedTasks.length === 0) {
            dataPoints.push({ x: new Date(), y: worker.points });
        }
        const ctx = smallChartCanvas.getContext('2d');
        smallChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Points Trend',
                    data: dataPoints,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    x: { type: 'time', display: false }, 
                    y: { display: false } 
                },
                plugins: { legend: { display: false } },
                tooltips: { enabled: false }
            }
        });
    };

    // ADDED: Live Clock Function
    const updateClock = () => {
        if (clockDisplay) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            clockDisplay.textContent = timeString;
        }
    };

    // This listener is unchanged from your original code
    document.addEventListener('ws_message', (e) => {
        if (e.detail.type === 'UPDATE_TASKS' || e.detail.type === 'NEW_TASK') {
            fetchData();
        }
    });

    // --- Initial Execution ---
    updateClock();
    setInterval(updateClock, 1000); // Update clock every second
    fetchData();
});
