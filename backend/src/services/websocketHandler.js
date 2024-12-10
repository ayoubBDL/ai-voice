import { openaiService } from './openaiService.js';

export const handleWebSocket = (connection, req) => {
    console.log('New WebSocket connection established');

    let streamSid = null;
    let openAiConnection = null;
    let handleMedia = null;

    connection.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.event) {
                case 'start':
                    streamSid = data.start.streamSid;
                    console.log('Stream started with SID:', streamSid);
                    const { openAiWs, handleMediaMessage } = openaiService.createWebSocketConnection(connection, streamSid);
                    openAiConnection = openAiWs;
                    handleMedia = handleMediaMessage;
                    break;

                case 'media':
                    if (handleMedia) {
                        handleMedia(data);
                    }
                    break;

                case 'stop':
                    console.log('Stream stopped:', streamSid);
                    if (openAiConnection && openAiConnection.readyState === 1) {
                        openAiConnection.close();
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    });

    connection.on('close', () => {
        console.log('WebSocket connection closed');
        if (openAiConnection && openAiConnection.readyState === 1) {
            openAiConnection.close();
        }
    });

    connection.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (openAiConnection && openAiConnection.readyState === 1) {
            openAiConnection.close();
        }
    });
};
