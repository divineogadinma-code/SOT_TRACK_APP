document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Get Essential Elements and Data ---
    const token = localStorage.getItem('token');
    if (!token) {
        // Silently exit if not logged in, as this script runs on login pages too.
        return;
    }

    const sidebarContainer = document.getElementById('sidebar-container');
    const bottomNavContainer = document.getElementById('bottom-nav-container');

    // Ensure the page has the necessary containers before proceeding
    if (!sidebarContainer || !bottomNavContainer) {
        return;
    }

    // --- 2. Decode Token and Prepare Headers ---
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userRole = payload.role;
    const userId = payload.id;
    const currentPage = window.location.pathname;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // --- 3. Helper Functions ---

    // Fetches the number of unread messages from the server
    const fetchUnreadCount = async () => {
        try {
            const response = await fetch('/api/messages/unread-count', { headers: authHeaders });
            if (!response.ok) return 0;
            const data = await response.json();
            return data.count;
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
            return 0;
        }
    };

    // Generates the correct navigation links based on user role
    const getNavLinks = (role, reviewCount) => {
    const dashboardUrl = role === 'admin' ? '/admin-dashboard.html' : `/worker-dashboard.html?id=${userId}`;
    
    let links = [
        { text: 'Dashboard', href: dashboardUrl, icon: 'bi-grid-1x2-fill' },
        { text: 'Smart System', href: '/admin/insights.html', icon: 'bi bi-lightbulb-fill me-2' },
        { text: 'IOT Devices', href: '/admin/iot-dashboard.html', icon: 'bi bi-broadcast me-2' },
        { text: 'Settings', href: '/settings.html', icon: 'bi-gear-fill' }
    ];

    if (role === 'admin') {
        // Admin links
        links.splice(1, 0, { text: 'Reports', href: '/reports.html', icon: 'bi-bar-chart-line-fill' });
    } else {
        
        // ADDED: Rules link for workers
        links.splice(1, 0, { text: 'Rules', href: '/rules.html', icon: 'bi-journal-text' });
    }
    return links;
};


    // Builds the HTML for the desktop sidebar
    const createSidebar = (navLinks, unreadCount) => {
        const createBadge = (count) => count > 0 ? `<span class="badge rounded-pill bg-danger ms-auto">${count}</span>` : '';
        
        const linksHtml = navLinks.map(link => {
            const isActive = currentPage.startsWith(link.href.split('?')[0]);
            const badge = link.text === 'Messages' ? createBadge(unreadCount) : '';
            return `
                <li class="nav-item">
                    <a class="nav-link d-flex align-items-center ${isActive ? 'active' : ''}" href="${link.href}">
                        <i class="bi ${link.icon} me-3"></i>
                        <span>${link.text}</span>
                        ${badge}
                    </a>
                </li>`;
        }).join('');

        sidebarContainer.innerHTML = `
            <aside class="sidebar">
                <h2 class="h4 mb-4 text-light">SOT Track</h2>
                <ul class="nav flex-column">
                    ${linksHtml}
                </ul>
                <button class="btn btn-outline-danger logout-btn w-100 mt-auto">Logout</button>
            </aside>`;
    };

    // Builds the HTML for the mobile bottom navigation bar
    const createBottomNav = (navLinks, unreadCount) => {
        const dashboardLink = navLinks.find(link => link.text === 'Dashboard');
        const otherLinks = navLinks.filter(link => link.text !== 'Dashboard');
        const firstHalf = otherLinks.slice(0, Math.ceil(otherLinks.length / 2));
        const secondHalf = otherLinks.slice(Math.ceil(otherLinks.length / 2));

        const createLinksHtml = (links) => {
            return links.map(link => {
                const isActive = currentPage.startsWith(link.href.split('?')[0]);
                const badge = (link.text === 'Messages' && unreadCount > 0) ? `<span class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle" style="font-size: 0.6rem; padding: .2em .4em;">${unreadCount}</span>` : '';
                return `
                    <a href="${link.href}" class="nav-item position-relative ${isActive ? 'active' : ''}">
                        <i class="bi ${link.icon}"></i>
                        <span>${link.text}</span>
                        ${badge}
                    </a>`;
            }).join('');
        };
        
        const dashboardIsActive = currentPage.startsWith(dashboardLink.href.split('?')[0]);

        bottomNavContainer.innerHTML = `
            <nav class="bottom-nav">
                ${createLinksHtml(firstHalf)}
                <a href="${dashboardLink.href}" class="nav-item dashboard-link ${dashboardIsActive ? 'active' : ''}">
                    <div class="icon-wrapper">
                        <i class="bi ${dashboardLink.icon}"></i>
                    </div>
                </a>
                ${createLinksHtml(secondHalf)}
            </nav>`;
    };

    // --- 4. Main Execution Function ---
    const initializeNav = async () => {
        const unreadCount = await fetchUnreadCount();
        const navLinks = getNavLinks(userRole);
        
        createSidebar(navLinks, unreadCount);
        createBottomNav(navLinks, unreadCount);

        // Attach logout listener after elements are created
        const logoutButton = document.querySelector('.logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('token');
                window.location.href = '/index.html';
            });
        }
    };

    // --- 5. Run the script ---
    initializeNav();
});
