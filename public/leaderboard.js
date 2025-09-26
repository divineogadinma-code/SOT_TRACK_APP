document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // --- Get elements ---
    const leaderboardBody = document.getElementById('leaderboard-body');
    const adminControls = document.getElementById('admin-controls');
    const resetPointsBtn = document.getElementById('reset-points-btn');

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Decode token to check user role
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userRole = payload.role;

    // --- Main data fetching function ---
    const fetchLeaderboard = async () => {
        showLoader();
        try {
            const response = await fetch('/api/leaderboard', { headers: authHeaders });
            if (!response.ok) throw new Error('Could not fetch leaderboard data.');
            const data = await response.json();
            renderLeaderboard(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };

    // --- UI Rendering function ---
    const renderLeaderboard = (workers) => {
        leaderboardBody.innerHTML = '';
        if (workers.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center">No worker data available.</td></tr>';
            return;
        }
        workers.forEach((worker, index) => {
            const rank = index + 1;
            const row = document.createElement('tr');
            let rankBadge = '';
            if (rank === 1) rankBadge = '<i class="bi bi-trophy-fill text-warning"></i>';
            else if (rank === 2) rankBadge = '<i class="bi bi-trophy-fill" style="color: #c0c0c0;"></i>';
            else if (rank === 3) rankBadge = '<i class="bi bi-trophy-fill" style="color: #cd7f32;"></i>';
            row.innerHTML = `
                <td class="text-center fw-bold fs-5">${rank} ${rankBadge}</td>
                <td>${worker.name}</td>
                <td class="text-end points-cell fs-5">${worker.points}</td>
            `;
            leaderboardBody.appendChild(row);
        });
    };

    // --- Event Handlers ---
    const handleResetPoints = async () => {
        if (!confirm('ARE YOU SURE?\nThis will permanently reset all worker points to 0. This action cannot be undone.')) {
            return;
        }

        showLoader();
        try {
            const response = await fetch('/api/workers/reset-all-points', {
                method: 'POST',
                headers: authHeaders
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            showToast('All worker points have been reset!', 'success');
            // The real-time update will automatically refresh the leaderboard.
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    };

    // --- Initial Setup ---
    if (userRole === 'admin') {
        adminControls.classList.remove('d-none'); // Show admin controls
        resetPointsBtn.addEventListener('click', handleResetPoints);
    }

    // Listen for real-time updates
    document.addEventListener('ws_message', (e) => {
        if (e.detail.type === 'UPDATE_LEADERBOARD') {
            fetchLeaderboard();
        }
    });

    fetchLeaderboard();
});
