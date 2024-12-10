import dotenv from 'dotenv';

dotenv.config();

export const config = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4-turbo-preview',
        voice: 'alloy',
        systemMessage: process.env.SYSTEM_MESSAGE || 'You are a helpful AI assistant who helps customers with their inquiries. You are knowledgeable about the company\'s products and services.',
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    server: {
        port: process.env.PORT || 5050,
        host: process.env.HOST || 'localhost',
    },
    websocket: {
        openaiEndpoint: 'wss://api.openai.com/v1/realtime',
        model: 'gpt-4o-realtime-preview-2024-10-01',
    },
};
