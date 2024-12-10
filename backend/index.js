import Fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { config } from './src/config/config.js';
import callRoutes from './src/routes/callRoutes.js';
import twimlRoutes from './src/routes/twimlRoutes.js';
import audioRoutes from './src/routes/audioRoutes.js';

// Initialize Fastify with logging
const fastify = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty'
        }
    }
});

// Register plugins
await fastify.register(fastifyFormBody);  // For parsing form data from Twilio webhooks

// Register WebSocket with specific configuration
await fastify.register(fastifyWs, {
    options: { 
        maxPayload: 1048576
    }
});

// Register CORS
await fastify.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
});

// Register routes
// API routes (with /api prefix)
await fastify.register(async function (fastify) {
    await fastify.register(callRoutes, { prefix: '/api' });
});

// Webhook routes (no prefix)
await fastify.register(async function (fastify) {
    await fastify.register(callRoutes, { prefix: '' });
    await fastify.register(twimlRoutes, { prefix: '' });
});

// Audio routes (including WebSocket)
await fastify.register(audioRoutes);

// Root route
fastify.get('/', async (request, reply) => {
    return { 
        status: 'running',
        message: 'AI Call Center Server is running!'
    };
});

// Error handler
fastify.setErrorHandler(function (error, request, reply) {
    fastify.log.error(error);
    reply.status(error.statusCode || 500).send({
        error: {
            message: error.message,
            type: error.name,
            statusCode: error.statusCode || 500
        }
    });
});

// Start the server
const start = async () => {
    try {
        const address = await fastify.listen({ 
            port: config.server.port, 
            host: config.server.host 
        });
        console.log(`Server listening at ${address}`);
        console.log('Configuration:', {
            baseUrl: process.env.BASE_URL,
            port: config.server.port,
            host: config.server.host
        });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();