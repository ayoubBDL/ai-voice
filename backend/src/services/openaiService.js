import OpenAI from 'openai';
import WebSocket from 'ws';
import { config } from '../config/config.js';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

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
            const filePath = path.join(process.cwd(), 'knowledge_base.txt');
            this.knowledgeBase = await fs.readFile(filePath, 'utf8');
            console.log('Knowledge base loaded successfully');
        } catch (error) {
            console.error('Error loading knowledge base:', error);
            this.knowledgeBase = '';
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
                const transcription = await this.transcribeAudio(data);
                
                if (transcription) {
                    // Store user's message in context
                    conversationContext.messages.push({
                        role: 'user',
                        content: transcription,
                        timestamp: Date.now()
                    });

                    // Generate AI response
                    const language = 'en'; // Default language
                    const aiResponse = await this.generateAIResponse(transcription, language);

                    // Send AI response to OpenAI
                    openAiWs.send(JSON.stringify({
                        type: 'message',
                        message: {
                            role: 'assistant',
                            content: aiResponse
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

    async processAudioChat(audioFilePath, language = 'english') {
        try {
            console.log('Processing audio file:', audioFilePath);
            
            // Create a readable stream from the file
            const fileStream = createReadStream(audioFilePath);

            // Transcribe the audio
            const transcription = await this.transcribeAudio(fileStream);
            console.log('Transcription:', transcription);

            // Generate AI response in the specified language
            const aiResponse = await this.generateAIResponse(transcription, language);
            console.log('AI Response:', aiResponse);

            // Convert AI response to speech
            const audioResponse = await this.textToSpeech(aiResponse);
            console.log('Audio response generated, size:', audioResponse.length);

            // Convert buffer to base64 for sending
            const base64Audio = audioResponse.toString('base64');

            return {
                success: true,
                audio: base64Audio,
                transcription,
                response: aiResponse,
                language
            };
        } catch (error) {
            console.error('Error in processAudioChat:', error);
            throw error;
        }
    }

    async transcribeAudio(fileStream) {
        try {
            const response = await this.openai.audio.transcriptions.create({
                file: fileStream,
                model: "whisper-1"
            });

            return response.text;
        } catch (error) {
            console.error('Error in transcribeAudio:', error);
            throw error;
        }
    }

    async transcribeAudioOld(file) {
        try {
            console.log('Transcribing audio file:', {
                size: file.buffer.length,
                type: file.mimetype
            });

            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.filename || 'audio.webm',
                contentType: file.mimetype
            });
            formData.append('model', 'whisper-1');

            const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                }
            });

            console.log('Transcription received:', response.data);
            return response.data.text;
        } catch (error) {
            console.error('Error in transcribeAudio:', error.response?.data || error.message);
            throw new Error('Failed to transcribe audio: ' + (error.response?.data?.error?.message || error.message));
        }
    }

    async generateAIResponse(text, language = 'english') {
        try {
            // Map common language codes to full names
            const languageMap = {
                'ar': 'Arabic',
                'en': 'English',
                'fr': 'French',
                'arabic': 'Arabic',
                'english': 'English',
                'french': 'French'
            };

            // Get the full language name, default to English if not found
            const fullLanguage = languageMap[language.toLowerCase()] || 'English';
            
            console.log(`Generating AI response in ${fullLanguage}`);
            
            const systemPrompts = {
                'Arabic': 'أنت مساعد ودود ومفيد. يرجى الرد دائمًا باللغة العربية فقط.',
                'English': 'You are a helpful assistant. Always respond in English only.',
                'French': 'Vous êtes un assistant utile. Veuillez toujours répondre en français uniquement.'
            };

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: systemPrompts[fullLanguage]
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.7
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Error in generateAIResponse:', error);
            throw error;
        }
    }

    async textToSpeech(text) {
        try {
            const mp3 = await this.openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: text
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());
            return buffer;
        } catch (error) {
            console.error('Error in textToSpeech:', error);
            throw error;
        }
    }
}

export const openaiService = new OpenAIService();
