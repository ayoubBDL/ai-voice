import { OpenAI } from 'openai';
import { saveAudioFile, validateAudioFile } from '../utils/fileManager.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const chatWithAudio = async (req, res, next) => {
    try {
        const { prompt, voice } = req.body;
        
        if (!prompt) {
            throw new Error('Prompt is required');
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4-audio-preview",
            modalities: ["text", "audio"],
            audio: {
                voice: voice || "alloy",
                format: "wav"
            },
            messages: [
                { role: "user", content: prompt }
            ]
        });

        const audioBuffer = Buffer.from(response.choices[0].message.audio.data, 'base64');
        const fileName = await saveAudioFile(audioBuffer);

        res.json({
            text: response.choices[0].message.content,
            audioUrl: `/audio/${fileName}`
        });
    } catch (error) {
        next(error);
    }
};

export const speechToText = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new Error('No audio file provided');
        }

        validateAudioFile(req.file);
        const base64Audio = req.file.buffer.toString('base64');

        const response = await openai.chat.completions.create({
            model: "whisper-1",
            modalities: ["text", "audio"],
            audio: { voice: "alloy", format: "wav" },
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "What is in this recording?" },
                        { type: "input_audio", input_audio: { data: base64Audio, format: "wav" }}
                    ]
                }
            ]
        });

        res.json({
            transcription: response.choices[0].message.content
        });
    } catch (error) {
        next(error);
    }
};
