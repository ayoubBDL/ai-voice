import { callController } from '../controllers/callController.js';

export default function callRoutes(fastify, options, done) {
    // Make outbound calls
    fastify.post('/api/call', callController.makeOutboundCall);

    // Get call status
    fastify.get('/api/call/:callSid', callController.getCallStatus);

    done();
}
