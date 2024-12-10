import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

class TwilioService {
    constructor() {
        this.client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
        this.baseUrl = process.env.BASE_URL;
    }

    async makeCall(phoneNumber) {
        try {
            // Validate and format phone number for Morocco
            if (!phoneNumber.startsWith('+')) {
                phoneNumber = phoneNumber.startsWith('0') ? '+212' + phoneNumber.substring(1) : '+212' + phoneNumber;
            }

            console.log('Making call with:', {
                to: phoneNumber,
                from: this.phoneNumber,
                baseUrl: this.baseUrl
            });

            // Create an outbound call using the Twilio client
            const call = await this.client.calls.create({
                to: phoneNumber,
                from: this.phoneNumber,
                url: `${this.baseUrl}/twiml`,  // URL that returns TwiML for call handling
                statusCallback: `${this.baseUrl}/call/status`,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST'
            });

            console.log('Call initiated:', call.sid);
            return call;
        } catch (error) {
            console.error('Error making call:', error);
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

    async getCall(callSid) {
        try {
            return await this.client.calls(callSid).fetch();
        } catch (error) {
            console.error('Error getting call:', error);
            throw error;
        }
    }

    async getRecording(recordingSid) {
        try {
            return await this.client.recordings(recordingSid).fetch();
        } catch (error) {
            console.error('Error getting recording:', error);
            throw error;
        }
    }

    async getTranscription(transcriptionSid) {
        try {
            return await this.client.transcriptions(transcriptionSid).fetch();
        } catch (error) {
            console.error('Error getting transcription:', error);
            throw error;
        }
    }

    async getCallRecordings(callSid) {
        try {
            return await this.client.recordings.list({ callSid: callSid });
        } catch (error) {
            console.error('Error getting call recordings:', error);
            throw error;
        }
    }

    async getCallTranscriptions(callSid) {
        try {
            const recordings = await this.getCallRecordings(callSid);
            const transcriptions = [];
            
            for (const recording of recordings) {
                const recordingTranscriptions = await this.client.transcriptions.list({ 
                    recordingSid: recording.sid 
                });
                transcriptions.push(...recordingTranscriptions);
            }
            
            return transcriptions;
        } catch (error) {
            console.error('Error getting call transcriptions:', error);
            throw error;
        }
    }
}

export const twilioService = new TwilioService();
