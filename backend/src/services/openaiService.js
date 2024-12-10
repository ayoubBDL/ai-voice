import OpenAI from 'openai';
import WebSocket from 'ws';
import { config } from '../config/config.js';
import fs from 'fs/promises';
import path from 'path';

class OpenAIService {
    constructor() {
        this.knowledgeBase = '';
        this.activeConnections = new Map(); // Store active connections
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.loadKnowledgeBase();
    }

    async loadKnowledgeBase() {
        try {
            const knowledgeBase = {
                introduction: '',
                scenarios: '',
                companyInfo: '',
                troubleshooting: '',
                conversationSkills: ''
            };

            const files = await fs.readdir('./knowledge_base');
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const content = await fs.readFile(path.join('./knowledge_base', file), 'utf-8');
                    
                    // Categorize content based on filename
                    if (file.includes('introduction')) {
                        knowledgeBase.introduction = content;
                    } else if (file.includes('scenarios')) {
                        knowledgeBase.scenarios = content;
                    } else if (file.includes('company_info')) {
                        knowledgeBase.companyInfo = content;
                    } else if (file.includes('troubleshooting')) {
                        knowledgeBase.troubleshooting = content;
                    } else if (file.includes('conversation')) {
                        knowledgeBase.conversationSkills = content;
                    }
                }
            }

            // Format knowledge base for the AI
            this.knowledgeBase = `
# AI Call Center Assistant Knowledge Base

## Introduction and Role
${knowledgeBase.introduction}

## Common Scenarios and Responses
${knowledgeBase.scenarios}

## Company Information
${knowledgeBase.companyInfo}

## Troubleshooting Guidelines
${knowledgeBase.troubleshooting}

## Conversation Skills
${knowledgeBase.conversationSkills}

Important Guidelines:
1. Always use the knowledge above to provide accurate and consistent information
2. Follow the conversation skills and best practices in every interaction
3. Use the troubleshooting guidelines when helping with technical issues
4. Reference company information when discussing services and policies
5. Handle scenarios according to the provided guidelines
`;

            console.log('Knowledge base loaded successfully');
        } catch (error) {
            console.error('Error loading knowledge base:', error);
        }
    }

    createWebSocketConnection(connection, streamSid) {
        console.log(`Creating OpenAI WebSocket connection for stream: ${streamSid}`);

        const openAiWs = new WebSocket(config.openai.apiUrl, {
            headers: {
                Authorization: `Bearer ${config.openai.apiKey}`,
                "OpenAI-Beta": "assistants=v1"
            }
        });

        let conversationContext = {
            messages: [],
            lastTimestamp: Date.now()
        };

        openAiWs.on('open', () => {
            console.log(`OpenAI WebSocket connected for stream: ${streamSid}`);
            
            // Initialize the conversation with system message
            const systemMessage = this.knowledgeBase 
                ? `${config.openai.systemMessage}\n\nKnowledge Base:\n${this.knowledgeBase}`
                : config.openai.systemMessage;

            openAiWs.send(JSON.stringify({
                type: 'message',
                message: {
                    role: 'system',
                    content: systemMessage
                }
            }));
        });

        openAiWs.on('message', async (data) => {
            try {
                const response = JSON.parse(data.toString());
                
                if (response.type === 'message') {
                    // Store assistant's message in context
                    conversationContext.messages.push({
                        role: 'assistant',
                        content: response.message.content,
                        timestamp: Date.now()
                    });

                    // Convert text to speech and send to Twilio
                    if (response.message.content) {
                        const audioBuffer = await this.textToSpeech(response.message.content);
                        connection.socket.send(audioBuffer);
                    }
                }
            } catch (error) {
                console.error('Error processing OpenAI message:', error);
            }
        });

        // Handle incoming audio from Twilio
        connection.socket.on('message', async (data) => {
            try {
                // Convert audio to text
                const text = await this.transcribeAudio(data);
                
                if (text) {
                    // Store user's message in context
                    conversationContext.messages.push({
                        role: 'user',
                        content: text,
                        timestamp: Date.now()
                    });

                    // Send to OpenAI
                    openAiWs.send(JSON.stringify({
                        type: 'message',
                        message: {
                            role: 'user',
                            content: text
                        }
                    }));
                }
            } catch (error) {
                console.error('Error processing audio message:', error);
            }
        });

        // Clean up on connection close
        connection.socket.on('close', () => {
            console.log(`Closing OpenAI connection for stream: ${streamSid}`);
            openAiWs.close();
            this.activeConnections.delete(streamSid);
        });

        // Store the connection
        this.activeConnections.set(streamSid, {
            twilioWs: connection.socket,
            openAiWs,
            context: conversationContext
        });
    }

    async transcribeAudio(audioBuffer) {
        try {
            const response = await this.openai.audio.transcriptions.create({
                file: audioBuffer,
                model: "whisper-1",
                language: "fr"
            });
            return response.text;
        } catch (error) {
            console.error('Error transcribing audio:', error);
            throw error;
        }
    }

    async textToSpeech(text) {
        try {
            const response = await this.openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: text,
                response_format: "mp3"
            });

            // Convert the response to a buffer
            const buffer = Buffer.from(await response.arrayBuffer());
            return buffer;
        } catch (error) {
            console.error('Error converting text to speech:', error);
            throw error;
        }
    }

    async getResponse(text) {
        try {
            const response = await this.openai.chat.completions.create({
                model: config.openai.model,
                messages: [
                    {
                        role: "system",
                        content: config.openai.systemMessage
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error getting AI response:', error);
            throw error;
        }
    }
}

export const openaiService = new OpenAIService();
