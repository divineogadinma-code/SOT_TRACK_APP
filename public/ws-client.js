// WebSocket Client
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}`);

ws.onopen = () => {
  console.log('Connected to WebSocket server');

  // Register worker with ID from token
  const token = localStorage.getItem('token');
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    ws.send(JSON.stringify({ type: 'registerWorker', workerId: payload.id }));
  }
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('WebSocket message received:', data);

  // Dispatch as a browser event for other scripts
  document.dispatchEvent(new CustomEvent('ws_message', {  detail: data }));
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket server');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
