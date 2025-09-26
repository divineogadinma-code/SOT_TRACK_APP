// --- Reusable UI Helper Functions ---

const loaderOverlay = document.getElementById('loader-overlay');
const toastContainer = document.getElementById('toast-container');

/**
 * Shows a loading spinner overlay.
 */
function showLoader() {
    if (!loaderOverlay.innerHTML) {
        loaderOverlay.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';
    }
    loaderOverlay.classList.add('visible');
}

/**
 * Hides the loading spinner overlay.
 */
function hideLoader() {
    loaderOverlay.classList.remove('visible');
}

/**
 * Displays a toast notification.
 * @param {string} message The message to display.
 * @param {string} type 'success' or 'error'.
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconClass = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';

    toast.innerHTML = `
        <div class="toast-header">
            <i class="bi ${iconClass}"></i>
            <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toast);

    // Use a small timeout to allow the element to be added to the DOM before transitioning
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Automatically remove the toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        // Remove the element from the DOM after the fade-out transition
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);

    // Allow manual closing
    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    });
}
