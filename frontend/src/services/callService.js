import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050/api';

export const makeCall = async (phoneNumber) => {
  try {
    const response = await axios.post(`${API_URL}/call`, { phoneNumber });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to make call');
  }
};

export const getCallStatus = async (callSid) => {
  try {
    const response = await axios.get(`${API_URL}/call/${callSid}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to get call status');
  }
};

export const setupWebSocket = (onMessage) => {
  const ws = new WebSocket(`ws://localhost:5050/media-stream`);

  ws.onopen = () => {
    console.log('WebSocket connection established');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };

  return ws;
};
