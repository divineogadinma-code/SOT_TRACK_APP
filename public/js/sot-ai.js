// public/js/sot-ai.js
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) return; // not logged in

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Create widget DOM (if not present)
  if (!document.getElementById('sot-ai-widget')) {
    const widget = document.createElement('div');
    widget.id = 'sot-ai-widget';
    widget.innerHTML = `
      <div id="sot-ai-button" style="position:fixed;right:20px;bottom:80px;z-index:1100;">
        <button id="sot-ai-open" class="btn btn-success rounded-circle" title="SOT AI">
          <i class="bi bi-robot" style="font-size:20px"></i>
        </button>
      </div>
      <div id="sot-ai-panel" style="position:fixed;right:20px;bottom:80px;z-index:1100;width:360px;max-width:95%;display:none;">
        <div class="card bg-dark text-light">
          <div class="card-header d-flex justify-content-between align-items-center">
            <strong>SOT AI Assistant</strong>
            <button id="sot-ai-close" class="btn btn-sm btn-outline-light">Close</button>
          </div>
          <div class="card-body" style="height:320px;overflow:auto;" id="sot-ai-messages">
            <div class="text-muted small">Hi — ask me to assign/remove/approve tasks or ask for stats.</div>
          </div>
          <div class="card-footer">
            <div class="input-group">
              <input id="sot-ai-input" type="text" class="form-control form-control-sm" placeholder="e.g. Assign cleaning to John">
              <button id="sot-ai-send" class="btn btn-sm btn-primary">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(widget);
  }

  const openBtn = document.getElementById('sot-ai-open');
  const closeBtn = document.getElementById('sot-ai-close');
  const panel = document.getElementById('sot-ai-panel');
  const messagesEl = document.getElementById('sot-ai-messages');
  const input = document.getElementById('sot-ai-input');
  const sendBtn = document.getElementById('sot-ai-send');

  function appendMessage(who, text, isHtml = false) {
    const el = document.createElement('div');
    el.className = who === 'bot' ? 'mb-2 p-2 bg-secondary rounded' : 'mb-2 p-2 bg-primary text-white rounded';
    el.style.fontSize = '0.9rem';
    el.innerHTML = isHtml ? text : `<strong>${who === 'bot' ? 'SOT AI' : 'You'}:</strong> ${escapeHtml(text)}`;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replaceAll('&', "&amp;")
      .replaceAll('<', "&lt;")
      .replaceAll('>', "&gt;");
  }

  openBtn.addEventListener('click', () => panel.style.display = 'block');
  if (closeBtn) closeBtn.addEventListener('click', () => panel.style.display = 'none');

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    appendMessage('user', text);
    input.value = '';
    appendMessage('bot', 'Thinking...');

    try {
      const res = await fetch('/api/sot-ai/chat', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      // remove the temporary "Thinking..." (last child)
      const last = messagesEl.lastChild;
      if (last && last.textContent && last.textContent.includes('Thinking')) last.remove();

      if (!data) {
        appendMessage('bot', 'No response from AI.');
        return;
      }

      if (data.reply) {
        // if reply contains HTML (like a suggestions area) we can render it
        appendMessage('bot', data.reply, false);
      } else {
        appendMessage('bot', JSON.stringify(data));
      }

      // If there is returned data.tasks or data.data show quick actions
      if (data.data && Array.isArray(data.data)) {
        const listHtml = data.data.slice(0,10).map(t => `<div class="p-2 mb-1 border rounded small">
          <div><strong>${escapeHtml(t.taskDescription || t.taskName || '')}</strong></div>
          <div class="text-muted small">${new Date(t.assignedDate || t.timestamp || Date.now()).toLocaleString()}</div>
        </div>`).join('');
        appendMessage('bot', `<div><strong>Results:</strong>${listHtml}</div>`, true);
      }
    } catch (err) {
      console.error('SOT AI error:', err);
      appendMessage('bot', 'Error contacting SOT AI server.');
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

});
