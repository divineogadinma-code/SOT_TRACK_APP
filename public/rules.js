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

    const rulesAccordion = document.getElementById('rules-accordion');

    const fetchRules = async () => {
        showLoader();
        try {
            const response = await fetch('/api/rules', { headers: authHeaders });
            if (!response.ok) throw new Error('Could not fetch rules.');
            const rules = await response.json();
            renderRules(rules);
        } catch (error) {
            console.error('Error fetching rules:', error);
            showToast(error.message, 'error');
            rulesAccordion.innerHTML = '<p class="text-center text-danger">Failed to load rules.</p>';
        } finally {
            hideLoader();
        }
    };

    const renderRules = (rules) => {
        rulesAccordion.innerHTML = '';
        if (rules.length === 0) {
            rulesAccordion.innerHTML = '<p class="text-center text-muted">No rules have been set by the administrator yet.</p>';
            return;
        }

        rules.forEach((rule, index) => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'accordion-item digital-card'; // Use digital-card for consistent styling
            ruleItem.innerHTML = `
                <h2 class="accordion-header" id="heading-${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}" aria-expanded="false" aria-controls="collapse-${index}">
                        ${rule.title}
                    </button>
                </h2>
                <div id="collapse-${index}" class="accordion-collapse collapse" aria-labelledby="heading-${index}" data-bs-parent="#rules-accordion">
                    <div class="accordion-body">
                        ${rule.content.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
            rulesAccordion.appendChild(ruleItem);
        });
    };

    fetchRules();
});
