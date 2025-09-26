    // This script connects to the WebSocket server and handles incoming messages.

    // Use wss:// for secure connections (HTTPS), ws:// for local (HTTP)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        // This is a custom event that other scripts can listen for
        // We pass the event type (e.g., 'UPDATE_TASKS') in the detail
        document.dispatchEvent(new CustomEvent('ws_message', { detail: data }));
    };

    ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    