import { twilioService } from '../services/twilioService.js';

export const callController = {
    // Make outbound call
    async makeOutboundCall(phoneNumber) {
        try {
            console.log('Making call to:', phoneNumber);
            
            if (!phoneNumber) {
                throw new Error('Phone number is required');
            }

            const call = await twilioService.makeCall(phoneNumber);
            console.log('Call initiated:', call.sid);
            
            return {
                success: true,
                callSid: call.sid,
                status: call.status
            };
        } catch (error) {
            console.error('Error making outbound call:', error);
            throw error;
        }
    },

    // Get call status
    async getCallStatus(callSid) {
        try {
            if (!callSid) {
                throw new Error('Call SID is required');
            }

            const status = await twilioService.getCallStatus(callSid);
            
            return {
                success: true,
                callSid,
                status
            };
        } catch (error) {
            console.error('Error getting call status:', error);
            throw error;
        }
    }
};
