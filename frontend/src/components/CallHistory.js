import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  VStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Icon,
  HStack,
  Spinner,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Box,
} from '@chakra-ui/react';
import { FaPhoneAlt, FaPhoneSlash, FaFileAlt } from 'react-icons/fa';
import { formatDistance } from 'date-fns';
import axios from 'axios';

const TranscriptionModal = ({ isOpen, onClose, callSid }) => {
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        const response = await axios.get(`http://localhost:5050/api/calls/${callSid}/transcriptions`);
        setTranscriptions(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching transcriptions:', err);
        setError('Failed to load transcriptions');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && callSid) {
      fetchTranscriptions();
    }
  }, [isOpen, callSid]);

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Call Transcription</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="center" spacing={4} py={4}>
              <Spinner />
              <Text>Loading transcription...</Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Call Transcription</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {error ? (
            <Text color="red.500">{error}</Text>
          ) : transcriptions.length === 0 ? (
            <Text>No transcription available for this call.</Text>
          ) : (
            <VStack align="stretch" spacing={4} pb={4}>
              {transcriptions.map((transcription, index) => (
                <Box key={transcription.sid} p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold" mb={2}>
                    Part {index + 1}
                  </Text>
                  <Text>{transcription.text}</Text>
                  <Text fontSize="sm" color="gray.500" mt={2}>
                    {formatDistance(new Date(transcription.timestamp), new Date(), {
                      addSuffix: true,
                    })}
                  </Text>
                </Box>
              ))}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

const CallHistory = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCallSid, setSelectedCallSid] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchCallHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5050/api/calls');
      const callData = response.data.data || response.data;
      setCalls(callData);
      setError(null);
    } catch (err) {
      console.error('Error fetching call history:', err);
      setError(err.response?.data?.error || 'Failed to load call history. Please try again later.');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCallHistory();

    // Setup WebSocket connection
    const ws = new WebSocket('ws://localhost:5050/ws');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'newCall') {
        setCalls(prevCalls => [data.call, ...prevCalls]);
      } else if (data.type === 'newTranscription') {
        // Optionally handle real-time transcription updates
        if (selectedCallSid === data.callSid) {
          // Refresh transcriptions if the modal is open for this call
          fetchCallHistory();
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [selectedCallSid]);

  const handleViewTranscription = (callSid) => {
    setSelectedCallSid(callSid);
    onOpen();
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'in-progress':
      case 'ringing':
        return 'blue';
      case 'busy':
      case 'failed':
      case 'no-answer':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody>
          <VStack align="center" spacing={4}>
            <Spinner />
            <Text>Loading call history...</Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <Text color="red.500">{error}</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="xl" fontWeight="bold">
              Call History
            </Text>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Direction</Th>
                  <Th>Phone Number</Th>
                  <Th>Status</Th>
                  <Th>Duration</Th>
                  <Th>Time</Th>
                  <Th>Transcription</Th>
                </Tr>
              </Thead>
              <Tbody>
                {calls.map((call) => (
                  <Tr key={call.sid}>
                    <Td>
                      <HStack>
                        <Icon
                          as={call.direction === 'inbound' ? FaPhoneAlt : FaPhoneSlash}
                          color={call.direction === 'inbound' ? 'green.500' : 'blue.500'}
                        />
                        <Text>{call.direction}</Text>
                      </HStack>
                    </Td>
                    <Td>{call.phoneNumber}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(call.status)}>
                        {call.status}
                      </Badge>
                    </Td>
                    <Td>{call.duration}s</Td>
                    <Td>
                      {formatDistance(new Date(call.timestamp), new Date(), {
                        addSuffix: true,
                      })}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        leftIcon={<FaFileAlt />}
                        onClick={() => handleViewTranscription(call.sid)}
                      >
                        View
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </VStack>
        </CardBody>
      </Card>

      <TranscriptionModal
        isOpen={isOpen}
        onClose={onClose}
        callSid={selectedCallSid}
      />
    </>
  );
};

export default CallHistory;
