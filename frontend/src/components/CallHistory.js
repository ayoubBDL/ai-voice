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
} from '@chakra-ui/react';
import { FaPhoneAlt, FaPhoneSlash } from 'react-icons/fa';
import { formatDistance } from 'date-fns';

const CallHistory = () => {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    // TODO: Implement real-time call history updates using WebSocket
    const mockCalls = [
      {
        id: 1,
        phoneNumber: '+1234567890',
        status: 'completed',
        duration: '2:30',
        timestamp: new Date(),
        direction: 'outbound',
      },
      {
        id: 2,
        phoneNumber: '+0987654321',
        status: 'in-progress',
        duration: '1:15',
        timestamp: new Date(),
        direction: 'inbound',
      },
    ];
    setCalls(mockCalls);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in-progress':
        return 'blue';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatTime = (date) => {
    return formatDistance(date, new Date(), { addSuffix: true });
  };

  return (
    <Card>
      <CardBody>
        <VStack spacing={4} align="stretch">
          <Text fontSize="xl" fontWeight="bold" color="gray.700">
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
              </Tr>
            </Thead>
            <Tbody>
              {calls.map((call) => (
                <Tr key={call.id}>
                  <Td>
                    <HStack>
                      <Icon
                        as={call.direction === 'outbound' ? FaPhoneAlt : FaPhoneSlash}
                        color={call.direction === 'outbound' ? 'green.500' : 'blue.500'}
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
                  <Td>{call.duration}</Td>
                  <Td>{formatTime(call.timestamp)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default CallHistory;
