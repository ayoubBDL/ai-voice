import Fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { config } from './src/config/config.js';
import callRoutes from './src/routes/callRoutes.js';
import { handleWebSocket } from './src/services/websocketHandler.js';

// Initialize Fastify
const fastify = Fastify();

// Register plugins
fastify.register(fastifyFormBody);
fastify.register(fastifyCors, {
    origin: true
});
fastify.register(fastifyWs);

// Register routes
fastify.register(callRoutes);

// WebSocket route for media streaming
fastify.register(async (fastify) => {
    fastify.get('/media-stream', { websocket: true }, (connection, req) => {
        handleWebSocket(connection, req);
    });
});

// Root route
fastify.get('/', async (request, reply) => {
    reply.send({ 
        status: 'running',
        message: 'AI Call Center Server is running!'
    });
});

// Start the server
const start = async () => {
    try {
        await fastify.listen({ 
            port: config.server.port,
            host: config.server.host
        });
        console.log(`Server is running on port ${config.server.port}`);
    } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
};

start();