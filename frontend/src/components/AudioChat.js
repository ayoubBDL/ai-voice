import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  useToast,
  Container,
  Flex,
  IconButton,
  List,
  ListItem,
  Avatar,
  HStack,
  Spacer,
  Badge,
  Select
} from '@chakra-ui/react';
import { FaMicrophone, FaStop, FaPlay, FaPause, FaUser, FaRobot } from 'react-icons/fa';

const AudioChat = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [responseAudio, setResponseAudio] = useState(null);
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const audioPlayer = useRef(new Audio());
  const responsePlayer = useRef(new Audio());
  const chatEndRef = useRef(null);
  const toast = useToast();

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000
        }
      });
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setCurrentTranscription('');
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start recording: ' + error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const playAudio = (url, isResponse = false) => {
    const player = isResponse ? responsePlayer.current : audioPlayer.current;
    const setPlayingState = isResponse ? setIsPlayingResponse : setIsPlaying;
    
    if (player.paused) {
      player.src = url;
      player.play();
      setPlayingState(true);
      
      player.onended = () => {
        setPlayingState(false);
      };
    } else {
      player.pause();
      setPlayingState(false);
    }
  };

  const sendAudio = async () => {
    if (!audioURL) return;

    try {
      setIsLoading(true);
      const audioBlob = await fetch(audioURL).then(r => r.blob());
      
      // Create form data with WebM file and language
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('language', selectedLanguage);

      console.log('Sending audio:', {
        size: audioBlob.size,
        type: audioBlob.type,
        language: selectedLanguage
      });

      const response = await fetch('http://localhost:5050/api/chat-with-audio', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response from server' }));
        throw new Error(errorData.error || errorData.details || 'Failed to get response from server');
      }

      const responseData = await response.json();
      
      // Create audio URL from the response buffer
      const audioBuffer = Uint8Array.from(atob(responseData.audio), c => c.charCodeAt(0));
      const audioUrl = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mpeg' }));

      // Add to conversation history
      setConversations(prev => [...prev, {
        timestamp: new Date().toISOString(),
        userAudio: audioURL,
        responseAudio: audioUrl,
        transcription: responseData.transcription,
        aiResponse: responseData.response,
        language: responseData.language
      }]);

      toast({
        title: 'Success',
        description: 'Received response from AI',
        status: 'success',
        duration: 3000,
      });

      // Clear current audio and transcription
      setAudioURL(null);
      setCurrentTranscription('');
    } catch (error) {
      console.error('Error sending audio:', error);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const MessageBubble = ({ isUser, audio, transcription, timestamp }) => {
    const [audioDuration, setAudioDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(new Audio());
    const progressRef = useRef(null);

    useEffect(() => {
      const audioElement = audioRef.current;
      audioElement.src = audio;

      const handleLoadedMetadata = () => {
        setAudioDuration(audioElement.duration);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audioElement.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      audioElement.addEventListener('ended', handleEnded);

      return () => {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
        audioElement.removeEventListener('ended', handleEnded);
      };
    }, [audio]);

    const handleProgressClick = (e) => {
      if (!progressRef.current) return;
      
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * audioDuration;
      
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const togglePlay = () => {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };

    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
      <Flex 
        direction="column" 
        alignItems={isUser ? 'flex-end' : 'flex-start'}
        maxW="80%"
        alignSelf={isUser ? 'flex-end' : 'flex-start'}
        mb={6}
      >
        <HStack 
          spacing={2} 
          mb={2}
          px={2}
        >
          <Avatar 
            size="sm" 
            icon={isUser ? <FaUser /> : <FaRobot />}
            bg={isUser ? 'blue.500' : 'green.500'}
          />
          <Text fontSize="xs" color="gray.500">
            {new Date(timestamp).toLocaleTimeString()}
          </Text>
        </HStack>

        <Box
          bg={isUser ? 'blue.500' : 'green.500'}
          color="white"
          borderRadius="xl"
          p={4}
          position="relative"
          boxShadow="md"
          _before={{
            content: '""',
            position: 'absolute',
            borderWidth: '10px',
            borderStyle: 'solid',
            borderColor: isUser 
              ? 'transparent blue.500 transparent transparent'
              : 'transparent transparent transparent green.500',
            right: isUser ? '-20px' : 'auto',
            left: isUser ? 'auto' : '-20px',
            top: '20px',
          }}
        >
          {/* Audio Player */}
          <Flex 
            bg={isUser ? 'blue.600' : 'green.600'} 
            p={3} 
            borderRadius="lg" 
            align="center"
            mb={transcription ? 3 : 0}
          >
            <IconButton
              icon={isPlaying ? <FaPause /> : <FaPlay />}
              onClick={togglePlay}
              variant="ghost"
              colorScheme="whiteAlpha"
              mr={3}
              size="md"
              isRound
            />
            <Box flex="1" mx={3}>
              <Box
                ref={progressRef}
                w="100%"
                h="4px"
                bg="whiteAlpha.300"
                borderRadius="full"
                position="relative"
                cursor="pointer"
                onClick={handleProgressClick}
                _hover={{
                  '& > div': {
                    height: '6px',
                    marginTop: '-1px'
                  }
                }}
              >
                <Box
                  position="absolute"
                  left="0"
                  top="0"
                  h="100%"
                  bg="whiteAlpha.900"
                  borderRadius="full"
                  transition="all 0.2s"
                  w={`${(currentTime / audioDuration) * 100}%`}
                />
              </Box>
            </Box>
            <Text fontSize="sm" color="whiteAlpha.900" fontFamily="mono">
              {formatTime(currentTime)} / {formatTime(audioDuration)}
            </Text>
          </Flex>

          {/* Transcription */}
          {transcription && (
            <Box 
              mt={3} 
              pt={3}
              borderTopWidth="1px" 
              borderColor="whiteAlpha.300"
            >
              <Text 
                fontSize="md" 
                color="whiteAlpha.900"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
                lineHeight="tall"
              >
                {transcription}
              </Text>
            </Box>
          )}
        </Box>
      </Flex>
    );
  };

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'Arabic' },
    { value: 'fr', label: 'French' }
  ];

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch" h="calc(100vh - 200px)">
        {/* Chat Messages */}
        <Box 
          flex="1" 
          overflowY="auto" 
          borderWidth={1} 
          borderRadius="xl" 
          bg="gray.50" 
          p={6}
          sx={{
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              width: '8px',
              bg: 'gray.100',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'gray.400',
              borderRadius: '24px',
              '&:hover': {
                background: 'gray.500',
              }
            },
          }}
        >
          <VStack spacing={6} align="stretch">
            {conversations.map((conv, index) => (
              <React.Fragment key={conv.timestamp}>
                <MessageBubble
                  isUser={true}
                  audio={conv.userAudio}
                  transcription={conv.transcription}
                  timestamp={conv.timestamp}
                />
                <MessageBubble
                  isUser={false}
                  audio={conv.responseAudio}
                  transcription={conv.aiResponse}
                  timestamp={conv.timestamp}
                />
              </React.Fragment>
            ))}
            {audioURL && (
              <MessageBubble
                isUser={true}
                audio={audioURL}
                transcription={currentTranscription}
                timestamp={new Date().toISOString()}
              />
            )}
            <div ref={chatEndRef} />
          </VStack>
        </Box>

        {/* Recording Controls */}
        <Box 
          p={6} 
          borderWidth={1} 
          borderRadius="xl" 
          bg="white"
          boxShadow="lg"
        >
          <VStack spacing={4}>
            <HStack spacing={6} width="100%">
              <Select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                width="200px"
                size="lg"
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <IconButton
                icon={isRecording ? <FaStop /> : <FaMicrophone />}
                colorScheme={isRecording ? 'red' : 'blue'}
                onClick={isRecording ? stopRecording : startRecording}
                isLoading={isLoading}
                aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                size="lg"
                isRound
                w="60px"
                h="60px"
                _hover={{
                  transform: 'scale(1.05)'
                }}
                transition="all 0.2s"
              />
              
              {audioURL && (
                <Button
                  colorScheme="green"
                  onClick={sendAudio}
                  isLoading={isLoading}
                  leftIcon={<FaPlay />}
                  size="lg"
                  px={8}
                  h="50px"
                  _hover={{
                    transform: 'scale(1.02)'
                  }}
                  transition="all 0.2s"
                >
                  Send Message
                </Button>
              )}
              
              <Spacer />
              
              {isRecording && (
                <Badge 
                  colorScheme="red" 
                  variant="solid" 
                  px={6} 
                  py={2}
                  borderRadius="full"
                  fontSize="md"
                  animation="pulse 2s infinite"
                  sx={{
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 }
                    }
                  }}
                >
                  Recording...
                </Badge>
              )}
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default AudioChat;
