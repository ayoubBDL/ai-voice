import React from 'react';
import { Box, Flex, Link, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const inactiveLinkColor = useColorModeValue('gray.600', 'gray.200');

  const NavLink = ({ to, children }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        as={RouterLink}
        to={to}
        px={4}
        py={2}
        rounded="md"
        _hover={{
          textDecoration: 'none',
          bg: hoverBg,
        }}
        bg={isActive ? hoverBg : 'transparent'}
        color={isActive ? 'blue.500' : inactiveLinkColor}
        fontWeight={isActive ? 'semibold' : 'normal'}
      >
        {children}
      </Link>
    );
  };

  return (
    <Box bg={bg} px={4} borderBottom={1} borderStyle="solid" borderColor={borderColor}>
      <Flex h={16} alignItems="center" justifyContent="flex-start" gap={4}>
        <NavLink to="/">Call Center</NavLink>
        <NavLink to="/history">Call History</NavLink>
        <NavLink to="/audio-chat">Audio Chat</NavLink>
        <NavLink to="/preview">Audio Preview</NavLink>
      </Flex>
    </Box>
  );
};

export default Navbar;
