document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const userRole = payload.role;
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- Get elements ---
    const adminSender = document.getElementById('admin-message-sender');
    const messageForm = document.getElementById('send-message-form');
    const recipientSelect = document.getElementById('recipient-select');
    const messageContent = document.getElementById('message-content');
    const messageStatus = document.getElementById('message-status');
    const messageList = document.getElementById('message-list');

    // --- Main Logic ---
    const initialize = async () => {
        if (userRole === 'admin') {
            adminSender.classList.remove('d-none'); // Show the admin sender form
            await populateRecipients();
            messageForm.addEventListener('submit', handleSendMessage);
        }
        await fetchMessages();
        await markMessagesAsRead(); // Mark messages as read when the page loads
    };

    // --- Admin Functions ---
    const populateRecipients = async () => {
        try {
            const response = await fetch('/api/workers', { headers: authHeaders });
            const workers = await response.json();
            workers.forEach(worker => {
                if (worker.role !== 'admin') { // Don't list the admin as a recipient
                    const option = document.createElement('option');
                    option.value = worker._id;
                    option.textContent = worker.name;
                    recipientSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error("Failed to load workers for recipient list:", error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        messageStatus.textContent = '';
        messageStatus.className = 'mt-3';

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    recipientId: recipientSelect.value,
                    content: messageContent.value
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            messageStatus.textContent = data.message;
            messageStatus.classList.add('text-success');
            messageContent.value = '';

        } catch (error) {
            messageStatus.textContent = error.message;
            messageStatus.classList.add('text-danger');
        }
    };

    // --- Worker/Shared Function ---
    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/messages', { headers: authHeaders });
            const messages = await response.json();
            renderMessages(messages);
        } catch (error) {
            console.error("Failed to fetch messages:", error);
            messageList.innerHTML = '<p class="text-center text-danger">Could not load messages.</p>';
        }
    };

    const renderMessages = (messages) => {
        if (messages.length === 0) {
            messageList.innerHTML = '<p class="text-center text-muted">You have no new messages.</p>';
            return;
        }
        messageList.innerHTML = '';
        messages.forEach(msg => {
            const messageItem = document.createElement('div');
            messageItem.className = 'list-group-item list-group-item-action flex-column align-items-start bg-dark text-light border-secondary';
            const messageDate = new Date(msg.timestamp).toLocaleString();

            messageItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">Message from Admin</h5>
                <div>
                    <small class="text-muted me-3">${messageDate}</small>
                    <button class="btn btn-sm btn-outline-danger delete-message-btn" data-message-id="${msg._id}" title="Delete Message">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            </div>
            <p class="mb-1">${msg.content.replace(/\n/g, '<br>')}</p>
        `;
            messageList.appendChild(messageItem);
        });
    };
    const markMessagesAsRead = async () => {
            try {
                await fetch('/api/messages/mark-read', { method: 'POST', headers: authHeaders });
            } catch (error) {
                console.error("Failed to mark messages as read:", error);
            }
        };

        const handleDeleteMessage = async (e) => {
            const deleteButton = e.target.closest('.delete-message-btn');
            if (!deleteButton) return;

            const messageId = deleteButton.dataset.messageId;
            if (!confirm("Are you sure you want to delete this message?")) return;

            try {
                const response = await fetch(`/api/messages/${messageId}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });
                if (!response.ok) throw new Error('Failed to delete message.');
                
                // Remove the message from the view instantly
                deleteButton.closest('.list-group-item').remove();

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        };

messageList.addEventListener('click', handleDeleteMessage);
    initialize();
    // Add this listener at the end of the file
document.addEventListener('ws_message', (e) => {
    if (e.detail.type === 'UPDATE_MESSAGES') {
        fetchMessages();
    }
});
});
