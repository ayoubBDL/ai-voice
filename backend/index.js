import Fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { config } from './src/config/config.js';
import callRoutes from './src/routes/callRoutes.js';
import twimlRoutes from './src/routes/twimlRoutes.js';
import audioRoutes from './src/routes/audioRoutes.js';

// Initialize Fastify with logging
const fastify = Fastify({
    logger: {
        level: 'debug',
        transport: {
            target: 'pino-pretty'
        }
    }
});

// Register plugins
await fastify.register(fastifyFormBody);  // For parsing form data from Twilio webhooks

// Register multipart with specific configuration
await fastify.register(fastifyMultipart, {
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

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
    await fastify.register(audioRoutes, { prefix: '/api' }); // Add /api prefix to audio routes
});

// Webhook routes (no prefix)
await fastify.register(async function (fastify) {
    await fastify.register(twimlRoutes, { prefix: '' });
});

// Root route
fastify.get('/', async (request, reply) => {
    return { 
        status: 'running',
        message: 'AI Call Center Server is running!'
    };
});

// Error handler
fastify.setErrorHandler(function (error, request, reply) {
    request.log.error(error);
    reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Internal Server Error'
    });
});

const start = async () => {
    try {
        await fastify.listen({ port: config.server.port, host: config.server.host });
        console.log(`Server is running on port ${config.server.port}`);
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

// Start the server
start();