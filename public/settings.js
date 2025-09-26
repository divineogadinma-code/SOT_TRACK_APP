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

    // --- Get elements ---
    const profilePicDisplay = document.getElementById('profile-pic-display');
    const profilePicInput = document.getElementById('profile-pic-input');   
    const profileName = document.getElementById('profile-name');
    const profileUsername = document.getElementById('profile-username');
    const profileRole = document.getElementById('profile-role');
    const profileStartDate = document.getElementById('profile-start-date');
    const passwordForm = document.getElementById('change-password-form');
    const passwordMessage = document.getElementById('password-message');

    // --- Fetch and display profile data ---
    const fetchProfileData = async () => {
        try {
            const response = await fetch(`/api/workers/${userId}`, { headers: authHeaders });
            if (!response.ok) throw new Error('Could not fetch profile data.');
            
            const worker = await response.json();
            
            profileName.textContent = worker.name;
            profileUsername.textContent = worker.username;
            profileRole.textContent = worker.role.charAt(0).toUpperCase() + worker.role.slice(1); // Capitalize role
            profileStartDate.textContent = new Date(worker.startDate).toLocaleDateString();

             // Display profile picture or default
            if (worker.profilePicture) {
                profilePicDisplay.src = worker.profilePicture;
            }

        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    // --- Handle profile picture selection and upload ---
    profilePicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const imageData = reader.result; // This is the Base64 string
            uploadProfilePicture(imageData);
        };
        reader.readAsDataURL(file); // Convert image to Base64
    });

    const uploadProfilePicture = async (imageData) => {
        try {
            const response = await fetch('/api/users/profile-picture', {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ imageData })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Update the image on the page instantly
            profilePicDisplay.src = data.profilePicture;
            alert('Profile picture updated!');

        } catch (error) {
            console.error('Error uploading picture:', error);
            alert(`Upload failed: ${error.message}`);
        }
    };
    // --- Handle password change form submission ---
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        passwordMessage.textContent = '';
        passwordMessage.className = 'mt-3'; // Reset classes

        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;

        try {
            const response = await fetch('/api/users/change-password', {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            passwordMessage.textContent = data.message;
            passwordMessage.classList.add('text-success');
            passwordForm.reset();

        } catch (error) {
            passwordMessage.textContent = error.message;
            passwordMessage.classList.add('text-danger');
        }
    });

 // --- Get logout button and add event listener ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        });
    }

    fetchProfileData();
});
