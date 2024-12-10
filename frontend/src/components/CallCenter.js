import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  useToast,
  Card,
  CardBody,
  Icon,
  Badge,
} from '@chakra-ui/react';
import { FaPhone, FaSpinner } from 'react-icons/fa';
import { makeCall } from '../services/callService';

const CallCenter = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const toast = useToast();

  const handleCall = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await makeCall(phoneNumber);
      setActiveCall(response);
      toast({
        title: 'Success',
        description: 'Call initiated successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate call',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <VStack spacing={6} align="stretch">
          <Text fontSize="xl" fontWeight="bold" color="gray.700">
            Make a Call
          </Text>
          
          <HStack>
            <Input
              placeholder="Enter phone number (+1234567890)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="tel"
              size="lg"
            />
            <Button
              leftIcon={isLoading ? <FaSpinner /> : <FaPhone />}
              onClick={handleCall}
              isLoading={isLoading}
              size="lg"
              loadingText="Calling..."
            >
              Call
            </Button>
          </HStack>

          {activeCall && (
            <Box p={4} bg="gray.50" borderRadius="md">
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Text fontWeight="medium">Call Status:</Text>
                  <Badge colorScheme={activeCall.status === 'completed' ? 'green' : 'blue'}>
                    {activeCall.status}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  Call ID: {activeCall.callSid}
                </Text>
              </VStack>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default CallCenter;
