import WebSocket from 'ws';
import { config } from '../config/config.js';
import fs from 'fs/promises';
import path from 'path';

class OpenAIService {
    constructor() {
        this.knowledgeBase = '';
        this.loadKnowledgeBase();
    }

    async loadKnowledgeBase() {
        try {
            const files = await fs.readdir('./knowledge_base');
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const content = await fs.readFile(path.join('./knowledge_base', file), 'utf-8');
                    this.knowledgeBase += content + '\n';
                }
            }
            console.log('Knowledge base loaded successfully');
        } catch (error) {
            console.error('Error loading knowledge base:', error);
        }
    }

    createWebSocketConnection(connection, streamSid) {
        const openAiWs = new WebSocket(config.websocket.openaiEndpoint + '?model=' + config.websocket.model, {
            headers: {
                Authorization: `Bearer ${config.openai.apiKey}`,
                "OpenAI-Beta": "realtime=v1"
            }
        });

        let latestMediaTimestamp = 0;
        let lastAssistantItem = null;
        let responseStartTimestampTwilio = null;

        const initializeSession = () => {
            const systemMessage = this.knowledgeBase 
                ? config.openai.systemMessage + '\n\nKnowledge Base:\n' + this.knowledgeBase
                : config.openai.systemMessage;

            const sessionUpdate = {
                type: 'session.update',
                session: {
                    turn_detection: { type: 'server_vad' },
                    input_audio_format: 'g711_ulaw',
                    output_audio_format: 'g711_ulaw',
                    voice: config.openai.voice,
                    instructions: systemMessage,
                    modalities: ["text", "audio"],
                    temperature: 0.7,
                }
            };

            console.log('Initializing OpenAI session');
            openAiWs.send(JSON.stringify(sessionUpdate));
        };

        openAiWs.on('open', () => {
            console.log('Connected to OpenAI Realtime API');
            setTimeout(initializeSession, 100);
        });

        openAiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data);

                if (response.type === 'response.audio.delta' && response.delta) {
                    const audioDelta = {
                        event: 'media',
                        streamSid: streamSid,
                        media: { payload: Buffer.from(response.delta, 'base64').toString('base64') }
                    };
                    connection.send(JSON.stringify(audioDelta));

                    if (!responseStartTimestampTwilio) {
                        responseStartTimestampTwilio = latestMediaTimestamp;
                    }

                    if (response.item_id) {
                        lastAssistantItem = response.item_id;
                    }
                }

                if (response.type === 'input_audio_buffer.speech_started') {
                    lastAssistantItem = null;
                    responseStartTimestampTwilio = null;
                }

                // Log important events
                if (['error', 'response.content.done', 'session.created'].includes(response.type)) {
                    console.log(`OpenAI Event: ${response.type}`, response);
                }
            } catch (error) {
                console.error('Error processing OpenAI message:', error);
            }
        });

        openAiWs.on('error', (error) => {
            console.error('OpenAI WebSocket error:', error);
        });

        return { openAiWs, handleMediaMessage: (data) => {
            latestMediaTimestamp = data.media.timestamp;
            if (openAiWs.readyState === WebSocket.OPEN) {
                const audioAppend = {
                    type: 'input_audio_buffer.append',
                    audio: data.media.payload
                };
                openAiWs.send(JSON.stringify(audioAppend));
            }
        }};
    }
}

export const openaiService = new OpenAIService();
