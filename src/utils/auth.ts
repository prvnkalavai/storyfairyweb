import { msalInstance, tokenRequest } from '../authConfig';
import {
  AccountInfo,
  InteractionRequiredAuthError,
  SilentRequest,
  AuthenticationResult,
} from '@azure/msal-browser';


export const getAuthToken = async (): Promise<string> => {
  const account = msalInstance.getAllAccounts()[0];

  if (!account) {
      throw new Error('No active account! Please sign in first.');
  }

  const silentRequest: SilentRequest = {
      ...tokenRequest,
      account: account as AccountInfo
  };

  try {
      const authResult: AuthenticationResult = await msalInstance.acquireTokenSilent(silentRequest);
      return authResult.accessToken;
  } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
          // fallback to interaction when silent call fails
          await msalInstance.acquireTokenRedirect(tokenRequest);
          return ""; //This will never be reached as acquireTokenRedirect redirects.
      }
      throw error;
  }
};

export const getUserInfo = (): AccountInfo | null => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
      return accounts[0];
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return msalInstance.getAllAccounts().length > 0;
};

export const login = async (): Promise<void> => {
  try {
      await msalInstance.loginRedirect(tokenRequest);
  } catch (error) {
      console.error('Login failed:', error);
      throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
      await msalInstance.logoutRedirect();
  } catch (error) {
      console.error('Logout failed:', error);
      throw error;
  }
};

export const handleRedirectCallback = async (): Promise<void> => {
  try {
      await msalInstance.handleRedirectPromise();
  } catch (error) {
      console.error('Error handling redirect:', error);
      throw error;
  }
};

// Function to refresh token
export const refreshToken = async (): Promise<string> => {
  const account = msalInstance.getAllAccounts()[0];
  if (!account) {
      throw new Error('No active account');
  }

  try {
      const silentRequest: SilentRequest = {
          ...tokenRequest,
          account: account as AccountInfo
      };
      const authResult: AuthenticationResult = await msalInstance.acquireTokenSilent(silentRequest);
      return authResult.accessToken;
  } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
  }
};

// Setup automatic token refresh
export const setupTokenRefresh = (refreshInterval: number = 3600000): () => void => {
  const intervalId = setInterval(async () => {
      try {
          if (isAuthenticated()) {
              await refreshToken();
          }
      } catch (error) {
          console.error('Auto token refresh failed:', error);
      }
  }, refreshInterval);

  // Return cleanup function
  return () => clearInterval(intervalId);
};
