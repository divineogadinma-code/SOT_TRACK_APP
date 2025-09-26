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

    // --- Get elements ---
    const rulesContainer = document.getElementById('rules-list-container');
    const addRuleForm = document.getElementById('add-rule-form');
    const editRuleModalEl = document.getElementById('editRuleModal');
    const editRuleModal = new bootstrap.Modal(editRuleModalEl);
    const editRuleForm = document.getElementById('edit-rule-form');
    const saveChangesBtn = document.getElementById('save-rule-changes-btn');

    // --- Main data fetching function ---
    const fetchRules = async () => {
        showLoader();
        try {
            const response = await fetch('/api/rules', { headers: authHeaders });
            if (!response.ok) throw new Error('Could not fetch rules.');
            const rules = await response.json();
            renderRules(rules);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };

    // --- Render function ---
    const renderRules = (rules) => {
        rulesContainer.innerHTML = '';
        if (rules.length === 0) {
            rulesContainer.innerHTML = '<p class="text-center text-muted">No rules have been created yet.</p>';
            return;
        }
        rules.forEach(rule => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'list-group-item list-group-item-action bg-dark text-light border-secondary mb-3 rounded-3';
            ruleItem.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${rule.title}</h5>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-secondary edit-rule-btn" data-rule-id="${rule._id}" data-rule-title="${rule.title}" data-rule-content="${rule.content}"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn btn-sm btn-danger delete-rule-btn" data-rule-id="${rule._id}"><i class="bi bi-trash-fill"></i></button>
                    </div>
                </div>
                <p class="mb-1">${rule.content.replace(/\n/g, '<br>')}</p>
            `;
            rulesContainer.appendChild(ruleItem);
        });
    };

    // --- Event Handlers ---
    addRuleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        try {
            const title = document.getElementById('rule-title').value;
            const content = document.getElementById('rule-content').value;
            const response = await fetch('/api/rules', {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ title, content })
            });
            if (!response.ok) throw new Error((await response.json()).message);
            showToast('Rule added successfully!', 'success');
            addRuleForm.reset();
            fetchRules();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    });

    rulesContainer.addEventListener('click', (e) => {
        const editButton = e.target.closest('.edit-rule-btn');
        const deleteButton = e.target.closest('.delete-rule-btn');

        if (editButton) {
            document.getElementById('edit-rule-id').value = editButton.dataset.ruleId;
            document.getElementById('edit-rule-title').value = editButton.dataset.ruleTitle;
            document.getElementById('edit-rule-content').value = editButton.dataset.ruleContent;
            editRuleModal.show();
        }

        if (deleteButton) {
            if (!confirm('Are you sure you want to delete this rule?')) return;
            const ruleId = deleteButton.dataset.ruleId;
            deleteRule(ruleId);
        }
    });

    saveChangesBtn.addEventListener('click', async () => {
        showLoader();
        try {
            const id = document.getElementById('edit-rule-id').value;
            const title = document.getElementById('edit-rule-title').value;
            const content = document.getElementById('edit-rule-content').value;
            const response = await fetch(`/api/rules/${id}`, {
                method: 'PUT', headers: authHeaders,
                body: JSON.stringify({ title, content })
            });
            if (!response.ok) throw new Error((await response.json()).message);
            showToast('Rule updated successfully!', 'success');
            editRuleModal.hide();
            fetchRules();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    });
    
    const deleteRule = async (id) => {
        showLoader();
        try {
            const response = await fetch(`/api/rules/${id}`, { method: 'DELETE', headers: authHeaders });
            if (!response.ok) throw new Error((await response.json()).message);
            showToast('Rule deleted successfully.', 'success');
            fetchRules();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };

    fetchRules();
});
