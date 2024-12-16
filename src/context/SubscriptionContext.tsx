// context/SubscriptionContext.tsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { SubscriptionState } from '../types/subscription';
import { getAuthToken } from '../utils/auth';
import { useMsal } from '@azure/msal-react';


interface SubscriptionContextType {
  subscription: SubscriptionState;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({ 
  subscription: { tier: 'FREE', isSubscribed: false }, 
  checkSubscription: async () => {} 
});

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log('API_BASE_URL:', API_BASE_URL);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionState>({
    tier: 'FREE',
    isSubscribed: false
  });
    const { accounts } = useMsal();

  const checkSubscription = useCallback(async () => {
      if (!accounts || accounts.length === 0) {
          console.log("No user is signed in. Skipping subscription check.");
          return;
      }
     try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/check-subscription`, {
           headers: {
              'X-My-Auth-Token': `Bearer ${token}`,
                'Content-Type': 'application/json'
          }
        });
         if (!response.ok) {
             console.error('Failed to check subscription:', response.statusText);
             return;
         }
        const data = await response.json();
        setSubscription(data);
      } catch (error) {
        console.error('Failed to check subscription:', error);
      }
    }, [accounts]);

  useEffect(() => {
    checkSubscription();
  }, [accounts, checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscription, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Add this export for the useSubscription hook
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Export the context if needed elsewhere
export default SubscriptionContext;