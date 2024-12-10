import { openaiService } from '../services/openaiService.js';

export default async function routes(fastify, options) {
    // WebSocket endpoint for media streaming
    fastify.get('/media-stream', { websocket: true }, (connection, req) => {
        console.log('WebSocket connection established for media streaming');

        let audioContext = {
            buffer: Buffer.from([]),
            isProcessing: false
        };

        connection.socket.on('message', async (message) => {
            try {
                // Accumulate audio data
                audioContext.buffer = Buffer.concat([audioContext.buffer, message]);

                // Process audio when we have enough data and not already processing
                if (audioContext.buffer.length >= 4096 && !audioContext.isProcessing) {
                    audioContext.isProcessing = true;

                    try {
                        // Convert audio to text
                        const text = await openaiService.transcribeAudio(audioContext.buffer);
                        console.log('Transcribed text:', text);

                        if (text.trim()) {
                            // Get AI response
                            const response = await openaiService.getResponse(text);
                            console.log('AI response:', response);

                            // Convert response to speech
                            const audioResponse = await openaiService.textToSpeech(response);

                            // Send audio response back to client
                            connection.socket.send(audioResponse);
                        }
                    } catch (error) {
                        console.error('Error processing audio:', error);
                    } finally {
                        // Reset buffer and processing flag
                        audioContext.buffer = Buffer.from([]);
                        audioContext.isProcessing = false;
                    }
                }
            } catch (error) {
                console.error('WebSocket message handling error:', error);
            }
        });

        connection.socket.on('close', () => {
            console.log('WebSocket connection closed');
        });
    });

    // Speech to text endpoint
    fastify.post('/speech-to-text', async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) {
                return reply.status(400).send({
                    success: false,
                    error: 'No audio file provided'
                });
            }

            const text = await openaiService.transcribeAudio(await data.toBuffer());
            return { success: true, text };
        } catch (error) {
            request.log.error('Error in speech-to-text:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to convert speech to text'
            });
        }
    });

    // Chat with audio endpoint
    fastify.post('/chat-with-audio', async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) {
                return reply.status(400).send({
                    success: false,
                    error: 'No audio file provided'
                });
            }

            // Convert audio to text
            const text = await openaiService.transcribeAudio(await data.toBuffer());
            console.log('Transcribed text:', text);

            // Get AI response
            const response = await openaiService.getResponse(text);
            console.log('AI response:', response);

            // Convert response to speech
            const audioResponse = await openaiService.textToSpeech(response);

            reply.header('Content-Type', 'audio/mpeg');
            return audioResponse;
        } catch (error) {
            request.log.error('Error in chat-with-audio:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to process audio chat'
            });
        }
    });
}
