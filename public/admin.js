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

    // --- Get ALL elements from your dashboard, including new ones ---
    const profilePic = document.getElementById('dash-profile-pic');
    const clockDisplay = document.getElementById('live-clock');
    const totalWorkersCircle = document.getElementById('total-workers-circle');
    const totalPointsCircle = document.getElementById('total-points-circle');
    const assignTaskForm = document.getElementById('assign-task-form');
    const workerSelect = document.getElementById('worker-select');
    const reviewCountDisplay = document.getElementById('review-count');
    const addWorkerForm = document.getElementById('add-worker-form');
    const workersTableBody = document.getElementById('workers-table-body');
    const deductPointsModalEl = document.getElementById('deductPointsModal');
    const deductPointsModal = new bootstrap.Modal(deductPointsModalEl);
    const penaltyForm = document.getElementById('deduct-points-form');
    const confirmPenaltyBtn = document.getElementById('confirm-penalty-btn');

    // --- Main initialization function ---
    const initialize = async () => {
        showLoader();
        try {
            // ADDED: fetchAdminStats to the initial data load
            await Promise.all([
                fetchAdminProfile(),
                fetchAdminStats(),
                populateWorkerDropdown(),
                fetchAndRenderWorkers(),
                fetchReviewCount()
            ]);
        } catch (error) {
            console.error("Initialization failed:", error);
            showToast("Failed to load initial data.", "error");
        } finally {
            hideLoader();
        }
    };

    // --- Data Fetching Functions ---
    const fetchAdminProfile = async () => {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const adminId = payload.id;
        const res = await fetch(`/api/workers/${adminId}`, { headers: authHeaders });
        if (res.ok) {
            const data = await res.json();
            if (data.profilePicture) profilePic.src = data.profilePicture;
        }
    };

    // ADDED: New function to fetch the admin stats and trigger animation
    const fetchAdminStats = async () => {
        try {
            const res = await fetch('/api/admin/stats', { headers: authHeaders });
            if (res.ok) {
                const stats = await res.json();
                animateCountUp(totalWorkersCircle, stats.totalWorkers);
                animateCountUp(totalPointsCircle, stats.totalPoints);
            }
        } catch (error) {
            console.error("Error fetching admin stats:", error);
        }
    };

    const fetchReviewCount = async () => {
        const res = await fetch('/api/assigned-tasks/review/count', { headers: authHeaders });
        if (res.ok) {
            const data = await res.json();
            reviewCountDisplay.textContent = data.count;
        }
    };

    const populateWorkerDropdown = async () => {
        const res = await fetch('/api/workers', { headers: authHeaders });
        const workers = await res.json();
        workerSelect.innerHTML = '<option value="" disabled selected>Choose a worker...</option>';
        workerSelect.innerHTML += '<option value="all" class="fw-bold">All Workers (Broadcast)</option>';
        workers.forEach(worker => {
            if (worker.role !== 'admin') {
                const option = document.createElement('option');
                option.value = worker._id;
                option.textContent = worker.name;
                workerSelect.appendChild(option);
            }
        });
    };

    const fetchAndRenderWorkers = async () => {
        const res = await fetch('/api/workers', { headers: authHeaders });
        const workers = await res.json();
        workersTableBody.innerHTML = '';
        workers.forEach(worker => {
            if (worker.role === 'admin') return;
            const row = document.createElement('tr');
            row.dataset.workerId = worker._id;
            row.innerHTML = `
                <td>
                    <div class="worker-info">
                        <img src="${worker.profilePicture || 'https://placehold.co/40x40/1f1f1f/e0e0e0?text=SOT'}" alt="Profile">
                        <div>
                            <div class="fw-bold" data-field="name">${worker.name}</div>
                            <div class="text-muted small">${worker.username}</div>
                        </div>
                    </div>
                </td>
                <td class="text-center points-cell fs-5">${worker.points}</td>
                <td class="text-center">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-warning deduct-points-btn" title="Deduct Points"><i class="bi bi-dash-circle-fill"></i></button>
                        <button class="btn btn-sm btn-secondary edit-worker-btn" title="Edit"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn btn-sm btn-danger delete-worker-btn" title="Delete"><i class="bi bi-trash-fill"></i></button>
                    </div>
                </td>
            `;
            workersTableBody.appendChild(row);
        });
    };
    
    // --- ADDED: Count-up animation function ---
    const animateCountUp = (element, endValue, isDecimal = false) => {
        if (!element) return;
        let startValue = 0;
        const duration = 1500;
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

    // --- Form and Button Handlers ---
    const handleAssignTask = async (e) => {
        e.preventDefault();
        showLoader();
        try {
            const workerId = workerSelect.value;
            const taskDescription = document.getElementById('task-description').value;
            const points = document.getElementById('task-points').value;
            const deadline = document.getElementById('task-deadline').value;
            if (!workerId || !taskDescription || !points || !deadline) throw new Error("All fields are required.");
            
            const res = await fetch('/api/assigned-tasks', {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ workerId, taskDescription, points, deadline })
            });
            if (!res.ok) throw new Error((await res.json()).message);
            
            showToast('Task assigned successfully!', 'success');
            assignTaskForm.reset();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    };

    const handleAddWorker = async (e) => {
        e.preventDefault();
        showLoader();
        try {
            const name = document.getElementById('new-worker-name').value;
            const username = document.getElementById('new-worker-username').value;
            const password = document.getElementById('new-worker-password').value;
            if (!name || !username || !password) throw new Error("All fields are required.");

            const res = await fetch('/api/auth/register', {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ name, username, password, role: 'worker' })
            });
            if (!res.ok) throw new Error((await res.json()).message);

            showToast('Worker created successfully!', 'success');
            addWorkerForm.reset();
            await Promise.all([fetchAndRenderWorkers(), populateWorkerDropdown(), fetchAdminStats()]);
        } catch (error) {
            document.getElementById('add-worker-error').textContent = error.message;
        } finally {
            hideLoader();
        }
    };

    // --- Table Click Handler ---
    workersTableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const row = button.closest('tr');
        const workerId = row.dataset.workerId;
        const workerName = row.querySelector('[data-field="name"]').textContent;

        if (button.classList.contains('deduct-points-btn')) {
            document.getElementById('penalty-worker-name').textContent = workerName;
            document.getElementById('penalty-worker-id').value = workerId;
            penaltyForm.reset();
            deductPointsModal.show();
        }

        if (button.classList.contains('delete-worker-btn')) {
            if (!confirm(`Are you sure you want to delete ${workerName}?`)) return;
            showLoader();
            try {
                const res = await fetch(`/api/workers/${workerId}`, { method: 'DELETE', headers: authHeaders });
                if (!res.ok) throw new Error('Failed to delete worker');
                showToast('Worker deleted.', 'success');
                await Promise.all([fetchAndRenderWorkers(), populateWorkerDropdown(), fetchAdminStats()]);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideLoader();
            }
        }

        if (button.classList.contains('edit-worker-btn')) {
            const nameCell = row.querySelector('td:first-child .fw-bold');
            const originalName = nameCell.textContent;
            row.dataset.originalName = originalName;
            nameCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${originalName}">`;
            
            const actionsCell = row.querySelector('.text-center:last-child');
            actionsCell.innerHTML = `<div class="btn-group"><button class="btn btn-sm btn-success save-worker-btn" title="Save"><i class="bi bi-save-fill"></i></button><button class="btn btn-sm btn-warning cancel-edit-btn" title="Cancel"><i class="bi bi-x-circle-fill"></i></button></div>`;
        }

        if (button.classList.contains('save-worker-btn')) {
            const newName = row.querySelector('input').value;
            showLoader();
            try {
                const res = await fetch(`/api/workers/${workerId}`, {
                    method: 'PUT', headers: authHeaders,
                    body: JSON.stringify({ name: newName })
                });
                if (!res.ok) throw new Error('Failed to save changes.');
                showToast('Worker updated!', 'success');
                await fetchAndRenderWorkers();
            } catch (error) {
                showToast(error.message, 'error');
                await fetchAndRenderWorkers();
            } finally {
                hideLoader();
            }
        }

        if (button.classList.contains('cancel-edit-btn')) {
            await fetchAndRenderWorkers();
        }
    });
    
    confirmPenaltyBtn.addEventListener('click', async () => {
        const workerId = document.getElementById('penalty-worker-id').value;
        const reason = document.getElementById('penalty-reason').value;
        const points = document.getElementById('penalty-points').value;
        if (!reason || !points) return showToast('Reason and points are required.', 'error');

        showLoader();
        try {
            const res = await fetch(`/api/workers/${workerId}/deduct-points`, {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ reason, points })
            });
            if (!res.ok) throw new Error((await res.json()).message);
            
            showToast('Penalty applied successfully!', 'success');
            deductPointsModal.hide();
            await Promise.all([fetchAndRenderWorkers(), fetchAdminStats()]);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    });

    // --- Live Clock Function ---
    const updateClock = () => {
        if (clockDisplay) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            clockDisplay.textContent = timeString;
        }
    };

    // --- Initial Setup & Real-Time Listeners ---
    assignTaskForm.addEventListener('submit', handleAssignTask);
    addWorkerForm.addEventListener('submit', handleAddWorker);
    
    document.addEventListener('ws_message', (e) => {
        if (e.detail.type === 'TASK_SUBMITTED') {
            showToast('A new task is ready for review!', 'success');
            fetchReviewCount();
        }
        if (e.detail.type === 'UPDATE_LEADERBOARD') {
            fetchAdminStats();
            fetchAndRenderWorkers();
        }
    });

    updateClock();
    setInterval(updateClock, 1000);
    initialize();
});
