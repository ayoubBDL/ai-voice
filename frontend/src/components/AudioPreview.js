import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Select,
  Text,
  VStack,
  HStack,
  Spinner,
  useColorModeValue
} from '@chakra-ui/react';
import { FaMicrophone, FaStop } from 'react-icons/fa';

const AudioPreview = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState('english');
  const [response, setResponse] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendAudioToServer(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording. Please make sure you have given microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToServer = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('language', language);

      const response = await fetch('/api/audio-preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Server response was not ok');
      }

      const data = await response.json();
      if (data.success) {
        setResponse(data);
        if (data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audio.play();
        }
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error sending audio:', error);
      alert('Error processing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch" w="100%" maxW="800px" mx="auto">
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={2}>
          Audio Preview (GPT-4V)
        </Text>
        <Text color="gray.600" mb={6}>
          This page uses the GPT-4V model with audio preview capabilities. Speak into your microphone and get AI-powered responses.
        </Text>
      </Box>

      <Box mb={6}>
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          bg={bgColor}
          borderColor={borderColor}
        >
          <option value="english">English</option>
          <option value="arabic">Arabic</option>
          <option value="french">French</option>
        </Select>
      </Box>

      <HStack spacing={4} mb={6}>
        <Button
          colorScheme={isRecording ? "red" : "blue"}
          onClick={isRecording ? stopRecording : startRecording}
          leftIcon={isRecording ? <FaStop /> : <FaMicrophone />}
          isDisabled={isProcessing}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      </HStack>

      {isProcessing && (
        <HStack spacing={2} mb={4}>
          <Spinner size="sm" />
          <Text>Processing audio...</Text>
        </HStack>
      )}

      {response && (
        <VStack spacing={4} align="stretch">
          <Box>
            <Text fontWeight="bold" mb={2}>Response:</Text>
            <Box
              p={4}
              bg={bgColor}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
              whiteSpace="pre-wrap"
            >
              {response.response}
            </Box>
          </Box>

          {response.transcription && (
            <Box>
              <Text fontWeight="bold" mb={2}>Transcription:</Text>
              <Box
                p={4}
                bg={bgColor}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
              >
                {response.transcription}
              </Box>
            </Box>
          )}
        </VStack>
      )}
    </VStack>
  );
};

export default AudioPreview;
