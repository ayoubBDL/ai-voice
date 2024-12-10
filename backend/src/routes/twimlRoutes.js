import twilio from 'twilio';
import { openaiService } from '../services/openaiService.js';

async function routes(fastify, options) {
    // Generate TwiML for incoming calls
    fastify.post('/twiml', async (request, reply) => {
        try {
            console.log('Generating TwiML response');
            const twiml = new twilio.twiml.VoiceResponse();

            // Generate greeting using OpenAI's text-to-speech
            const greetingText = 'Bonjour! Je suis votre assistant virtuel. Comment puis-je vous aider aujourd\'hui?';
            const greetingAudio = await openaiService.textToSpeech(greetingText);

            // Create a temporary URL for the greeting audio
            const greetingUrl = `${process.env.BASE_URL}/api/audio/greeting`;
            
            // Store the greeting audio temporarily (we'll create this endpoint)
            fastify.decorateRequest('greetingAudio', greetingAudio);

            // Play the OpenAI-generated greeting
            twiml.play(greetingUrl);

            // Start a stream to handle real-time audio
            const connect = twiml.connect();
            
            // Get the base URL from environment or request
            const baseUrl = process.env.BASE_URL || `https://${request.hostname}`;
            console.log('Using WebSocket URL:', `wss://${new URL(baseUrl).hostname}/media-stream`);

            // Add stream with loop attribute to keep the connection open
            connect.stream({
                url: `wss://${new URL(baseUrl).hostname}/media-stream`,
                track: 'both_tracks',
                loop: true // Keep the stream open indefinitely
            });

            // Add a long pause to keep the call active
            twiml.pause({ length: 3600 }); // 1 hour pause

            // Set response headers
            reply.header('Content-Type', 'text/xml');
            
            const response = twiml.toString();
            console.log('Generated TwiML:', response);
            
            return response;
        } catch (error) {
            console.error('Error generating TwiML:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to generate TwiML: ' + error.message
            });
        }
    });

    // Serve the greeting audio
    fastify.get('/api/audio/greeting', async (request, reply) => {
        try {
            const greetingAudio = request.greetingAudio;
            if (!greetingAudio) {
                throw new Error('Greeting audio not found');
            }

            reply.header('Content-Type', 'audio/mpeg');
            return greetingAudio;
        } catch (error) {
            console.error('Error serving greeting audio:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to serve greeting audio'
            });
        }
    });
}

export default routes;
