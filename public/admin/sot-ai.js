document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) return (window.location.href = '/admin-login.html');

  const chatBody = document.getElementById('chat-body');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const clockDisplay = document.getElementById('live-clock');
  const profilePic = document.getElementById('dash-profile-pic');

  // --- Load Admin Profile Picture ---
  (async () => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const adminId = payload.id;
      const res = await fetch(`/api/workers/${adminId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profilePicture) profilePic.src = data.profilePicture;
      }
    } catch (err) {
      console.warn('Profile load failed:', err);
    }
  })();

  // --- Live Clock ---
  const updateClock = () => {
    const now = new Date();
    clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 1000);

  // --- Send Message Function ---
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    appendMessage('user', message);
    chatInput.value = '';

    // Show typing indicator
    const typingEl = appendTypingIndicator();

    try {
      const res = await fetch('/api/sot-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      removeTypingIndicator(typingEl);

      if (data.reply) {
        typeWriterEffect(data.reply);
      } else {
        appendMessage('ai', '🤔 Sorry, I didn’t quite catch that.');
      }
    } catch (err) {
      removeTypingIndicator(typingEl);
      appendMessage('ai', '⚠️ Failed to reach SOT AI. Please check your connection.');
      console.error(err);
    }
  }

  // --- Append Message ---
  function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    msg.innerHTML = `<div class="chat-bubble ${sender}">${text}</div>`;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // --- Typing Indicator ---
  function appendTypingIndicator() {
    const msg = document.createElement('div');
    msg.className = 'chat-message ai typing-indicator';
    msg.innerHTML = `
      <div class="chat-bubble ai">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>`;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
  }

  function removeTypingIndicator(el) {
    if (el && el.parentNode) el.remove();
  }

  // --- Typewriter Animation ---
  function typeWriterEffect(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-message ai';
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';
    msg.appendChild(bubble);
    chatBody.appendChild(msg);

    let i = 0;
    const speed = 20; // typing speed

    function typeChar() {
      if (i < text.length) {
        bubble.textContent += text.charAt(i);
        chatBody.scrollTop = chatBody.scrollHeight;
        i++;
        setTimeout(typeChar, speed);
      }
    }
    typeChar();
  }

  // --- Event Listeners ---
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
  });
});
