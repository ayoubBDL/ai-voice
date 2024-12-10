import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
const MAX_FILE_AGE = 24 * 60 * 60 * 1000; // 24 hours

export const saveAudioFile = async (buffer, format = 'wav') => {
    const fileName = `audio_${Date.now()}.${format}`;
    const filePath = path.join(AUDIO_DIR, fileName);
    
    await writeFile(filePath, buffer);
    
    // Schedule cleanup
    setTimeout(() => {
        cleanupFile(filePath).catch(console.error);
    }, MAX_FILE_AGE);
    
    return fileName;
};

export const cleanupFile = async (filePath) => {
    try {
        await unlink(filePath);
        console.log(`Cleaned up file: ${filePath}`);
    } catch (error) {
        console.error(`Error cleaning up file ${filePath}:`, error);
    }
};

export const validateAudioFile = (file) => {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const ALLOWED_FORMATS = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm'];
    
    if (!file) {
        throw new Error('No audio file provided');
    }
    
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 25MB limit');
    }
    
    if (!ALLOWED_FORMATS.includes(file.mimetype)) {
        throw new Error('Invalid file format. Supported formats: WAV, MP3, WebM');
    }
    
    return true;
};
