import React from 'react';
import { ChakraProvider, Box, Container, VStack } from '@chakra-ui/react';
import { theme } from './styles/theme';
import Header from './components/Header';
import CallCenter from './components/CallCenter';
import CallHistory from './components/CallHistory';
import '@fontsource/inter';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="gray.50">
        <Header />
        <Container maxW="container.xl" py={8}>
          <VStack spacing={8} align="stretch">
            <CallCenter />
            <CallHistory />
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
