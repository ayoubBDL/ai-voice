import { callController } from '../controllers/callController.js';
import { callHistoryService } from '../services/callHistoryService.js';
import { websocketService } from '../services/websocketService.js';
import { twilioService } from '../services/twilioService.js';

async function routes(fastify, options) {
    // API Routes (with /api prefix)
    if (options.prefix === '/api') {
        // Get call history
        fastify.get('/calls', async (request, reply) => {
            try {
                const calls = await callHistoryService.getCallHistory();
                return { success: true, data: calls };
            } catch (error) {
                request.log.error('Error getting call history:', error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to get call history'
                });
            }
        });

        // Get specific call details with transcription
        fastify.get('/calls/:callSid', async (request, reply) => {
            try {
                const { callSid } = request.params;
                const [callDetails, transcriptions] = await Promise.all([
                    callHistoryService.getCallDetails(callSid),
                    twilioService.getCallTranscriptions(callSid)
                ]);

                // Add transcriptions to call details
                const response = {
                    ...callDetails,
                    transcriptions: transcriptions.map(t => ({
                        sid: t.sid,
                        text: t.transcriptionText,
                        status: t.status,
                        duration: t.duration,
                        timestamp: t.dateCreated
                    }))
                };

                return { success: true, data: response };
            } catch (error) {
                request.log.error('Error getting call details:', error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to get call details'
                });
            }
        });

        // Get call transcriptions
        fastify.get('/calls/:callSid/transcriptions', async (request, reply) => {
            try {
                const { callSid } = request.params;
                const transcriptions = await twilioService.getCallTranscriptions(callSid);
                
                const formattedTranscriptions = transcriptions.map(t => ({
                    sid: t.sid,
                    text: t.transcriptionText,
                    status: t.status,
                    duration: t.duration,
                    timestamp: t.dateCreated
                }));

                return { success: true, data: formattedTranscriptions };
            } catch (error) {
                request.log.error('Error getting transcriptions:', error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to get call transcriptions'
                });
            }
        });

        // Make outbound call
        fastify.post('/call', {
            schema: {
                body: {
                    type: 'object',
                    required: ['phoneNumber'],
                    properties: {
                        phoneNumber: { type: 'string' }
                    }
                }
            }
        }, async (request, reply) => {
            try {
                const { phoneNumber } = request.body;
                const result = await callController.makeOutboundCall(phoneNumber);
                reply.send(result);
            } catch (error) {
                reply.status(500).send({ 
                    success: false, 
                    error: error.message || 'Failed to make outbound call' 
                });
            }
        });

        // Get call status
        fastify.get('/call/:callSid', async (request, reply) => {
            try {
                const { callSid } = request.params;
                const result = await callController.getCallStatus(callSid);
                reply.send(result);
            } catch (error) {
                reply.status(500).send({ 
                    success: false, 
                    error: error.message || 'Failed to get call status' 
                });
            }
        });
    }

    // Webhook Routes (no prefix)
    if (!options.prefix) {
        // Transcription callback webhook
        fastify.post('/transcription-callback', async (request, reply) => {
            try {
                const transcription = request.body;
                // Notify connected clients about the new transcription
                websocketService.broadcast({
                    type: 'newTranscription',
                    callSid: transcription.CallSid,
                    transcription: {
                        sid: transcription.TranscriptionSid,
                        text: transcription.TranscriptionText,
                        status: transcription.TranscriptionStatus,
                        timestamp: new Date().toISOString()
                    }
                });
                return { success: true };
            } catch (error) {
                request.log.error('Error handling transcription callback:', error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to handle transcription callback'
                });
            }
        });

        // Call status webhook
        fastify.post('/call/status', async (request, reply) => {
            try {
                const {
                    CallSid,
                    CallStatus,
                    Duration,
                    From,
                    To
                } = request.body;

                console.log('Call Status Update:', {
                    callSid: CallSid,
                    status: CallStatus,
                    duration: Duration,
                    from: From,
                    to: To
                });

                return { success: true };
            } catch (error) {
                request.log.error('Error handling call status webhook:', error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to process call status'
                });
            }
        });

        // Recording status webhook
        fastify.post('/call/recording-status', async (request, reply) => {
            try {
                const {
                    RecordingSid,
                    RecordingStatus,
                    RecordingUrl,
                    CallSid
                } = request.body;

                console.log('Recording Status Update:', {
                    recordingSid: RecordingSid,
                    status: RecordingStatus,
                    url: RecordingUrl,
                    callSid: CallSid
                });

                return { success: true };
            } catch (error) {
                request.log.error('Error handling recording status webhook:', error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to process recording status'
                });
            }
        });
    }
}

export default routes;
