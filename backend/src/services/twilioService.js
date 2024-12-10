import Twilio from 'twilio';
import { config } from '../config/config.js';

class TwilioService {
    constructor() {
        this.client = new Twilio(config.twilio.accountSid, config.twilio.authToken);
    }

    async makeCall(to) {
        try {
            // Validate and format phone number for Morocco
            if (!to.startsWith('+')) {
                // If number starts with 0, remove it and add Morocco country code
                to = to.startsWith('0') ? '+212' + to.substring(1) : '+212' + to;
            }

            console.log('Attempting to make call to:', to);
            console.log('Using Twilio number:', config.twilio.phoneNumber);

            // Create TwiML
            const twiml = new Twilio.twiml.VoiceResponse();
            twiml.say({ voice: 'alice', language: 'fr-FR' }, 'Bonjour! Ceci est un appel test de votre application.');

            const call = await this.client.calls.create({
                twiml: twiml.toString(),
                to: to,
                from: config.twilio.phoneNumber,
            });
            
            console.log('Call details:', {
                sid: call.sid,
                status: call.status,
                direction: call.direction,
                from: call.from,
                to: call.to
            });

            // Immediately fetch call status
            const callStatus = await this.getCallStatus(call.sid);
            console.log('Initial call status:', callStatus);

            return call;
        } catch (error) {
            console.error('Detailed error making call:', {
                message: error.message,
                code: error.code,
                moreInfo: error.moreInfo,
                status: error.status
            });
            throw error;
        }
    }

    async getCallStatus(callSid) {
        try {
            const call = await this.client.calls(callSid).fetch();
            return call.status;
        } catch (error) {
            console.error('Error getting call status:', error);
            throw error;
        }
    }
}

export const twilioService = new TwilioService();
