// Store all active WebSocket connections
const connections = new Set();

export const websocketService = {
    // Add a new connection
    addConnection(connection) {
        connections.add(connection);
    },

    // Remove a connection
    removeConnection(connection) {
        connections.delete(connection);
    },

    // Broadcast a message to all connected clients
    broadcast(message) {
        connections.forEach(connection => {
            if (connection.socket.readyState === 1) { // WebSocket.OPEN
                connection.socket.send(JSON.stringify(message));
            }
        });
    },

    // Notify all clients about a new call
    notifyNewCall(call) {
        this.broadcast({
            type: 'newCall',
            call
        });
    }
};
