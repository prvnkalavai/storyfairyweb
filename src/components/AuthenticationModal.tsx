import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { CustomDialog } from './CustomDialog';

export const AuthenticationModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { instance } = useMsal();

  // Trigger modal after 10 seconds of inactivity on the home page
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only show if not already authenticated
      const isAuthenticated = instance.getAllAccounts().length > 0;
      if (!isAuthenticated) {
        setIsOpen(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [instance]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(error => {
      console.error('Login error:', error);
    });
  };

  return (
    <CustomDialog 
      open={isOpen} 
      onClose={() => setIsOpen(false)}
      title="Welcome to StoryFairy!🧚‍♀️"
      description="Sign In/Sign Up to generate magical bedtime stories:"
    >
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleLogin}
            fullWidth
          >
            Sign In
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleLogin}
            fullWidth
          >
            Sign Up
          </Button>
        </div>
        
        <div className="text-center text-sm text-gray-500 mt-4">
          <p>Continue exploring without an account</p>
          <Button 
            variant="text" 
            color="primary" 
            onClick={() => setIsOpen(false)}
          >
            Maybe Later
          </Button>
        </div>
      </div>
      
      <div className="text-xs text-center text-gray-400 mt-2">
        <p>Let Your Imagination Fly!✨</p>
      </div>
    </CustomDialog>
  );
};