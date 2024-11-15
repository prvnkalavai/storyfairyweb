import React from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { Button } from '@mui/material';
import { loginRequest } from '../authConfig';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';

export const Header: React.FC = () => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(error => {
      console.error('Login error:', error);
    });
  };

  const handleLogout = () => {
    instance.logoutRedirect().catch(error => {
      console.error('Logout error:', error);
    });
  };

  // Set up silent token renewal
  React.useEffect(() => {
    const account = accounts[0];
    if (account && isAuthenticated) {
      const silentRequest = {
        ...loginRequest,
        account: account as AccountInfo
      };

      // Set up periodic token refresh
      const tokenRenewal = setInterval(() => {
        instance.acquireTokenSilent(silentRequest).catch(error => {
          console.error('Token renewal error:', error);
        });
      }, 3600000); // Refresh token every hour

      return () => clearInterval(tokenRenewal);
    }
  }, [instance, accounts, isAuthenticated]);

  return (
    <header className="fixed top-0 left-0 right-0 h-36 bg-white/50 backdrop-blur-sm shadow-md z-50">
      <div className="max-w-3xl mx-auto flex justify-between items-center px-4">
        <img src="./Storyfairy-logo2.png" alt="Logo" className="h-36 w-auto" />
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                {accounts[0]?.username}
              </span>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleLogout}
                disabled={inProgress !== InteractionStatus.None}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleLogin}
              disabled={inProgress !== InteractionStatus.None}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};