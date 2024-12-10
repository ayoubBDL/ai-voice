import { twilioService } from '../services/twilioService.js';

export const callController = {
    // Make outbound call
    makeOutboundCall: async (req, reply) => {
        try {
            const { phoneNumber } = req.body;
            console.log('Making call to:', phoneNumber);
            
            if (!phoneNumber) {
                return reply.status(400).send({ error: 'Phone number is required' });
            }

            const call = await twilioService.makeCall(phoneNumber);
            console.log('Call initiated:', call);
            
            reply.send({
                success: true,
                callSid: call.sid,
                status: call.status
            });
        } catch (error) {
            console.error('Error making outbound call:', error);
            reply.status(500).send({ error: 'Failed to make outbound call' });
        }
    },

    // Get call status
    getCallStatus: async (req, reply) => {
        try {
            const { callSid } = req.params;
            
            if (!callSid) {
                return reply.status(400).send({ error: 'Call SID is required' });
            }

            const status = await twilioService.getCallStatus(callSid);
            
            reply.send({
                success: true,
                callSid,
                status
            });
        } catch (error) {
            console.error('Error getting call status:', error);
            reply.status(500).send({ error: 'Failed to get call status' });
        }
    }
};
