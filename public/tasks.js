document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.id;
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const tasksContainer = document.getElementById('assigned-tasks-container');

    // --- SMART SYSTEM: Activity Logger ---
    async function logActivity(eventType, eventData = {}, durationMs = 0) {
        try {
            await fetch('/api/smart/activity', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ eventType, eventData, durationMs })
            });
        } catch (err) {
            console.warn('Activity log failed:', err);
        }
    }

    const fetchAssignedTasks = async () => {
        showLoader();
        try {
            const response = await fetch('/api/assigned-tasks', { headers: authHeaders });
            if (!response.ok) throw new Error('Could not fetch assigned tasks.');
            const tasks = await response.json();

            // SMART: log that worker viewed their assigned tasks
            logActivity('view_assigned_tasks', { count: tasks.length });

            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            showToast(error.message, 'error');
            tasksContainer.innerHTML = '<p class="text-center text-danger">Failed to load tasks.</p>';
        } finally {
            hideLoader();
        }
    };

    const renderTasks = (tasks) => {
        tasksContainer.innerHTML = '';
        if (tasks.length === 0) {
            tasksContainer.innerHTML = `
                <div class="text-center">
                    <i class="bi bi-check2-circle" style="font-size: 4rem; color: var(--primary-color);"></i>
                    <h4 class="mt-3">No Pending Tasks</h4>
                    <p class="text-body-secondary">Great job staying on top of your work!</p>
                </div>`;
            return;
        }

        tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = 'col-md-6 col-lg-4 mb-4';

            const deadline = new Date(task.deadline);
            const now = new Date();
            const isOverdue = now > deadline;
            const deadlineString = deadline.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

            taskCard.innerHTML = `
                <div class="card digital-card h-100 ${isOverdue ? 'border-danger' : ''}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${task.taskDescription}</h5>
                        <p class="card-text text-body-secondary">Assigned: ${new Date(task.assignedDate).toLocaleDateString()}</p>
                        
                        <div class="mt-2">
                            <p class="mb-0 small ${isOverdue ? 'text-danger fw-bold' : 'text-muted'}">
                                <i class="bi bi-clock-fill"></i> Deadline: ${deadlineString}
                            </p>
                        </div>

                        <div class="mt-auto d-flex justify-content-between align-items-center pt-3">
                            <span class="badge rounded-pill bg-primary fs-6">${task.points} Points</span>
                            <button class="btn btn-info submit-task-btn" 
                                    data-task-id="${task._id}" 
                                    data-task-type="${task.taskDescription}">
                                <i class="bi bi-send-check-fill"></i> Submit for Review
                            </button>
                        </div>
                    </div>
                </div>
            `;
            tasksContainer.appendChild(taskCard);

            // SMART: log when task card is rendered (viewed)
            logActivity('view_task_card', { taskId: task._id, taskType: task.taskDescription });
        });
    };

    const handleSubmitTask = async (e) => {
        const submitButton = e.target.closest('.submit-task-btn');
        if (!submitButton) return;

        const taskId = submitButton.dataset.taskId;
        const taskType = submitButton.dataset.taskType;

        // SMART: log when worker clicks submit
        logActivity('submit_task_attempt', { taskId, taskType });

        showLoader();
        try {
            const response = await fetch(`/api/assigned-tasks/${taskId}/submit`, {
                method: 'PUT',
                headers: authHeaders
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            showToast(data.message, 'success');

            // SMART: log successful task submission
            logActivity('submit_task_success', { taskId, taskType });

            const cardToRemove = submitButton.closest('.col-md-6');
            cardToRemove.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            cardToRemove.style.opacity = '0';
            cardToRemove.style.transform = 'scale(0.9)';
            setTimeout(() => {
                cardToRemove.remove();
                if (tasksContainer.children.length === 0) {
                    tasksContainer.innerHTML = `
                        <div class="text-center">
                            <i class="bi bi-check2-circle" style="font-size: 4rem; color: var(--primary-color);"></i>
                            <h4 class="mt-3">No Pending Tasks</h4>
                            <p class="text-body-secondary">Great job staying on top of your work!</p>
                        </div>`;
                }
            }, 500);

        } catch (error) {
            console.error('Error submitting task:', error);
            showToast(error.message, 'error');

            // SMART: log failed submission
            logActivity('submit_task_failed', { taskId, taskType, error: error.message });
        } finally {
            hideLoader();
        }
    };

    tasksContainer.addEventListener('click', handleSubmitTask);

    document.addEventListener('ws_message', (e) => {
    const { type, workerId, taskId } = e.detail;

    if (workerId !== userId) return;

    if (type === 'NEW_TASK') {
        showToast('You have received a new task!', 'success');
        logActivity('received_new_task', { workerId: userId });
        fetchAssignedTasks();
    }

    if (type === 'TASK_REJECTED') {
        showToast('A task was returned for review.', 'error');
        logActivity('task_rejected_notice', { workerId: userId });
        fetchAssignedTasks();
    }

    // 🧠 NEW: IoT Auto-Approved Task Handler
    if (type === 'TASK_COMPLETED') {
        showToast('✅ IoT auto-approved one of your tasks!', 'success');
        logActivity('task_auto_approved', { workerId: userId, taskId });
        fetchAssignedTasks(); // refresh assigned list instantly
    }
});


    fetchAssignedTasks();
});
