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

    const fetchAssignedTasks = async () => {
        showLoader();
        try {
            const response = await fetch('/api/assigned-tasks', { headers: authHeaders });
            if (!response.ok) throw new Error('Could not fetch assigned tasks.');
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

    // In tasks.js, replace the existing renderTasks function

const renderTasks = (tasks) => {
    tasksContainer.innerHTML = '';
    if (tasks.length === 0) {
        tasksContainer.innerHTML = '<div class="text-center"><i class="bi bi-check2-circle" style="font-size: 4rem; color: var(--primary-color);"></i><h4 class="mt-3">No Pending Tasks</h4><p class="text-body-secondary">Great job staying on top of your work!</p></div>';
        return;
    }

    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = 'col-md-6 col-lg-4 mb-4';
        
        const deadline = new Date(task.deadline);
        const now = new Date();
        const isOverdue = now > deadline;

        // Format the deadline to be readable
        const deadlineString = deadline.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

        taskCard.innerHTML = `
            <div class="card digital-card h-100 ${isOverdue ? 'border-danger' : ''}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${task.taskDescription}</h5>
                    <p class="card-text text-body-secondary">Assigned: ${new Date(task.assignedDate).toLocaleDateString()}</p>
                    
                    <!-- Deadline Display -->
                    <div class="mt-2">
                        <p class="mb-0 small ${isOverdue ? 'text-danger fw-bold' : 'text-muted'}">
                            <i class="bi bi-clock-fill"></i> Deadline: ${deadlineString}
                        </p>
                    </div>

                    <div class="mt-auto d-flex justify-content-between align-items-center pt-3">
                        <span class="badge rounded-pill bg-primary fs-6">${task.points} Points</span>
                        <button class="btn btn-info submit-task-btn" data-task-id="${task._id}">
                            <i class="bi bi-send-check-fill"></i> Submit for Review
                        </button>
                    </div>
                </div>
            </div>
        `;
        tasksContainer.appendChild(taskCard);
    });
};


    const handleSubmitTask = async (e) => {
        const submitButton = e.target.closest('.submit-task-btn');
        if (!submitButton) return;

        const taskId = submitButton.dataset.taskId;
        showLoader();
        try {
            const response = await fetch(`/api/assigned-tasks/${taskId}/submit`, {
                method: 'PUT',
                headers: authHeaders
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            showToast(data.message, 'success');
            // Animate removal of the card
            const cardToRemove = submitButton.closest('.col-md-6');
            cardToRemove.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            cardToRemove.style.opacity = '0';
            cardToRemove.style.transform = 'scale(0.9)';
            setTimeout(() => {
                cardToRemove.remove();
                if (tasksContainer.children.length === 0) {
                     tasksContainer.innerHTML = '<div class="text-center"><i class="bi bi-check2-circle" style="font-size: 4rem; color: var(--primary-color);"></i><h4 class="mt-3">No Pending Tasks</h4><p class="text-body-secondary">Great job staying on top of your work!</p></div>';
                }
            }, 500);

        } catch (error) {
            console.error('Error submitting task:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };

    tasksContainer.addEventListener('click', handleSubmitTask);
    
    // Listen for real-time updates
    document.addEventListener('ws_message', (e) => {
        if (e.detail.type === 'NEW_TASK' && e.detail.workerId === userId) {
            showToast('You have received a new task!', 'success');
            fetchAssignedTasks();
        }
        if (e.detail.type === 'TASK_REJECTED' && e.detail.workerId === userId) {
            showToast('A task was returned for review.', 'error');
            fetchAssignedTasks();
        }
    });

    fetchAssignedTasks();
});
