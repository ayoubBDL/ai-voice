import React from 'react';
import { Box, Container, Heading, Text, HStack, Icon } from '@chakra-ui/react';
import { FaPhoneAlt } from 'react-icons/fa';

const Header = () => {
  return (
    <Box bg="white" shadow="sm" py={4}>
      <Container maxW="container.xl">
        <HStack spacing={3}>
          <Icon as={FaPhoneAlt} w={8} h={8} color="brand.500" />
          <Box>
            <Heading size="lg" color="gray.800">AI Call Center</Heading>
            <Text color="gray.600">Powered by OpenAI and Twilio</Text>
          </Box>
        </HStack>
      </Container>
    </Box>
  );
};

export default Header;
