document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const tasksContainer = document.getElementById('review-tasks-container');

    const fetchTasksForReview = async () => {
        showLoader();
        try {
            const response = await fetch('/api/assigned-tasks/review', { headers: authHeaders });
            if (!response.ok) throw new Error('Could not fetch tasks for review.');
            const tasks = await response.json();
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
            tasksContainer.innerHTML = '<div class="text-center"><i class="bi bi-inbox-fill" style="font-size: 4rem; color: var(--text-muted);"></i><h4 class="mt-3">Review Inbox is Empty</h4><p class="text-body-secondary">No tasks are currently awaiting your approval.</p></div>';
            return;
        }

        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'list-group-item list-group-item-action flex-column align-items-start bg-dark text-light border-secondary mb-3 rounded-3';
            
            const submittedDate = new Date(task.submittedDate);
            const deadline = new Date(task.deadline);
            const isLate = submittedDate > deadline;

            const statusBadge = isLate 
                ? `<span class="badge bg-danger">Late</span>`
                : `<span class="badge bg-success">On Time</span>`;

            taskItem.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${task.taskDescription}</h5>
                    <div>
                        ${statusBadge}
                        <span class="badge rounded-pill bg-primary fs-6 ms-2">${task.points} Points</span>
                    </div>
                </div>
                <p class="mb-1">Submitted by: <strong>${task.workerId.name}</strong></p>
                <small>Deadline: ${deadline.toLocaleString()}</small>
                <div class="mt-3 text-end">
                    <button class="btn btn-danger reject-task-btn" data-task-id="${task._id}">
                        <i class="bi bi-x-lg"></i> Reject
                    </button>
                    <button class="btn btn-success approve-task-btn" data-task-id="${task._id}">
                        <i class="bi bi-check-lg"></i> Approve
                    </button>
                </div>
            `;
            tasksContainer.appendChild(taskItem);
        });
    };

    const handleTaskAction = async (e) => {
        const button = e.target.closest('button');
        if (!button || (!button.classList.contains('approve-task-btn') && !button.classList.contains('reject-task-btn'))) return;

        const taskId = button.dataset.taskId;
        const isApproval = button.classList.contains('approve-task-btn');
        const actionUrl = `/api/assigned-tasks/${taskId}/${isApproval ? 'approve' : 'reject'}`;

        showLoader();
        try {
            const response = await fetch(actionUrl, {
                method: 'POST',
                headers: authHeaders
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            showToast(data.message, 'success');
            // Animate removal of the item
            const itemToRemove = button.closest('.list-group-item');
            itemToRemove.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            itemToRemove.style.opacity = '0';
            itemToRemove.style.transform = 'scale(0.95)';
            setTimeout(() => {
                itemToRemove.remove();
                if (tasksContainer.children.length === 0) {
                    tasksContainer.innerHTML = '<div class="text-center"><i class="bi bi-inbox-fill" style="font-size: 4rem; color: var(--text-muted);"></i><h4 class="mt-3">Review Inbox is Empty</h4><p class="text-body-secondary">No tasks are currently awaiting your approval.</p></div>';
                }
            }, 500);

        } catch (error) {
            console.error(`Error ${isApproval ? 'approving' : 'rejecting'} task:`, error);
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };

    tasksContainer.addEventListener('click', handleTaskAction);
    
    document.addEventListener('ws_message', (e) => {
        if (e.detail.type === 'TASK_SUBMITTED') {
            showToast('A new task is ready for review!', 'success');
            fetchTasksForReview();
        }
    });

    fetchTasksForReview();
});
