import { openaiService } from '../services/openaiService.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { pipeline } from 'stream/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

export default async function routes(fastify, options) {
    // WebSocket endpoint for media streaming
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        console.log('Client connected to WebSocket');

        connection.socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'start') {
                    console.log('Client started recording');
                } else if (data.type === 'stop') {
                    console.log('Client stopped recording');
                }
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        });

        connection.socket.on('close', () => {
            console.log('Client disconnected from WebSocket');
        });
    });

    // Speech to text endpoint
    fastify.post('/speech-to-text', {
        config: {
            // Enable multipart support for this route
            multipart: true,
        },
        handler: async (request, reply) => {
            try {
                const data = await request.file();
                if (!data) {
                    return reply.status(400).send({
                        success: false,
                        error: 'No audio file provided'
                    });
                }

                const text = await openaiService.transcribeAudio(await data.toBuffer());
                return { success: true, text };
            } catch (error) {
                request.log.error('Error in speech-to-text:', error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to convert speech to text'
                });
            }
        }
    });

    // Chat with audio endpoint
    fastify.post('/chat-with-audio', {
        config: {
            multipart: true
        },
        handler: async (request, reply) => {
            try {
                const data = await request.file();
                
                if (!data) {
                    throw new Error('No audio file provided');
                }

                console.log('Received file:', {
                    fieldname: data.fieldname,
                    filename: data.filename,
                    mimetype: data.mimetype
                });

                // Create a temporary file path
                const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${data.filename}`);
                
                // Create a readable stream from the file buffer
                const chunks = [];
                for await (const chunk of data.file) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);

                // Write the buffer to a temporary file
                await fs.writeFile(tempFilePath, buffer);
                console.log('Wrote file to:', tempFilePath);

                try {
                    // Get language from form fields
                    const language = request.body?.language || 'english';
                    console.log('Using language:', language);

                    // Process the audio file
                    const result = await openaiService.processAudioChat(tempFilePath, language);
                    return result;
                } finally {
                    // Clean up: remove the temporary file
                    await fs.unlink(tempFilePath).catch(console.error);
                }
            } catch (error) {
                console.error('Error in chat-with-audio:', error);
                request.log.error(error);
                reply.status(500).send({
                    success: false,
                    error: error.message || 'Failed to process audio chat'
                });
            }
        }
    });

    // Audio preview endpoint using GPT-4V
    fastify.post('/audio-preview', {
        config: {
            multipart: true
        },
        handler: async (request, reply) => {
            try {
                const chunks = [];
                const file = await request.file();
                
                // Create temporary files for both input and output
                const tempInputPath = path.join(os.tmpdir(), `input-${Date.now()}.webm`);
                const tempOutputPath = path.join(os.tmpdir(), `output-${Date.now()}.wav`);

                // Read the uploaded file
                for await (const chunk of file.file) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);

                // Write the buffer to a temporary input file
                await fs.writeFile(tempInputPath, buffer);
                console.log('Wrote input file to:', tempInputPath);

                try {
                    // Convert to WAV using ffmpeg
                    await new Promise((resolve, reject) => {
                        ffmpeg(tempInputPath)
                            .toFormat('wav')
                            .on('error', (err) => {
                                console.error('Error converting audio:', err);
                                reject(err);
                            })
                            .on('end', () => {
                                console.log('Audio conversion finished');
                                resolve();
                            })
                            .save(tempOutputPath);
                    });

                    // Get language from form fields
                    const language = request.body?.language || 'english';
                    console.log('Using language:', language);

                    // Process the converted WAV file with GPT-4V
                    const result = await openaiService.processAudioPreview(tempOutputPath, language);
                    return result;
                } finally {
                    // Clean up: remove both temporary files
                    await Promise.all([
                        fs.unlink(tempInputPath).catch(console.error),
                        fs.unlink(tempOutputPath).catch(console.error)
                    ]);
                }
            } catch (error) {
                console.error('Error in audio-preview:', error);
                return reply.status(500).send({
                    success: false,
                    error: error.message || 'Failed to process audio preview'
                });
            }
        }
    });
}
