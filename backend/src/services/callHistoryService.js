import Twilio from 'twilio';
import { config } from '../config/config.js';

class CallHistoryService {
    constructor() {
        this.client = new Twilio(config.twilio.accountSid, config.twilio.authToken);
    }

    async getCallHistory() {
        try {
            const calls = await this.client.calls.list({
                limit: 20,
                // You can add date filters if needed
                // startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            });

            return calls.map(call => ({
                sid: call.sid,
                phoneNumber: call.to,
                status: call.status,
                duration: call.duration,
                timestamp: call.startTime,
                direction: call.direction,
                price: call.price,
                from: call.from
            }));
        } catch (error) {
            console.error('Error fetching call history:', error);
            throw error;
        }
    }

    async getCallDetails(callSid) {
        try {
            const call = await this.client.calls(callSid).fetch();
            return {
                sid: call.sid,
                phoneNumber: call.to,
                status: call.status,
                duration: call.duration,
                timestamp: call.startTime,
                direction: call.direction,
                price: call.price,
                from: call.from
            };
        } catch (error) {
            console.error('Error fetching call details:', error);
            throw error;
        }
    }
}

export const callHistoryService = new CallHistoryService();
