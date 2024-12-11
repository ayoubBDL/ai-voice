import React from 'react';
import { ChakraProvider, Box, Container, VStack } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { theme } from './styles/theme';
import Navbar from './components/Navbar';
import CallCenter from './components/CallCenter';
import CallHistory from './components/CallHistory';
import AudioChat from './components/AudioChat';
import AudioPreview from './components/AudioPreview';
import '@fontsource/inter';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Box minH="100vh" bg="gray.50">
          <Navbar />
          <Container maxW="container.xl" py={8}>
            <VStack spacing={8} align="stretch">
              <Routes>
                <Route path="/" element={<CallCenter />} />
                <Route path="/history" element={<CallHistory />} />
                <Route path="/audio-chat" element={<AudioChat />} />
                <Route path="/preview" element={<AudioPreview />} />
              </Routes>
            </VStack>
          </Container>
        </Box>
      </Router>
    </ChakraProvider>
  );
}

export default App;
