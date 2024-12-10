import express from 'express';
import multer from 'multer';
import { chatWithAudio, speechToText } from '../controllers/audioController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/chat-with-audio', apiLimiter, chatWithAudio);
router.post('/speech-to-text', apiLimiter, upload.single('audio'), speechToText);

export default router;
