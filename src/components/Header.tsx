//..\..\storyfairyweb\src\components\Header.tsx
import React, { useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';  
import { SubscriptionUpsellModal } from './SubscriptionUpsellModal';

export const Header: React.FC = () => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const { subscription } = useSubscription();
  const [showUpsell, setShowUpsell] = useState(false);

  // Navigation items configuration
  const navigationItems = [
    { label: 'Home', path: '/story-generator' },
    { label: 'My Stories', path: '/mystories', 
      onClick: () => {
        if (!subscription.isSubscribed) {  
          setShowUpsell(true);  
          return;  
        }  
        navigate('/mystories');
      }
    },
    { label: 'About', path: '/about' }
  ];

  // Update active tab based on current location
  useEffect(() => {
    const pathToTabIndex: {[key: string]: number} = {
      "/story-generator": 0,
      "/mystories": 1,
      "/about": 2
    };
    setActiveTab(pathToTabIndex[location.pathname] || 0);
  }, [location]);

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

      const tokenRenewal = setInterval(() => {
        instance.acquireTokenSilent(silentRequest).catch(error => {
          console.error('Token renewal error:', error);
        });
      }, 3600000);

      return () => clearInterval(tokenRenewal);
    }
  }, [instance, accounts, isAuthenticated]);

  return (
    <>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/50 backdrop-blur-sm shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-2 flex justify-between items-center">
            {/* Logo */}
            <img 
            src="./Storyfairy-logo2.png" 
            alt="Logo" 
            className="h-16 w-auto" 
            />

            {/* Navigation Tabs */}
            <nav className="flex items-center h-full">
            {navigationItems.map((item, index) => (
                <button
                key={item.label}
                onClick={item.onClick || (() => navigate(item.path))}
                className={`
                    h-full px-3 flex items-center
                    transition-colors duration-200
                    ${activeTab === index 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'}
                `}
                >
                {item.label}
                </button>
            ))}
            </nav>

            {/* Authentication Button */}
            <div className="flex items-center space-x-4">
            {isAuthenticated ? (
                <>
                <span className="text-gray-700 text-sm">
                    {accounts[0]?.username}
                </span>
                <button
                    onClick={handleLogout}
                    disabled={inProgress !== InteractionStatus.None}
                    className={`
                    px-4 h-16 border border-gray-300 
                    text-gray-700 hover:bg-gray-100 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${inProgress !== InteractionStatus.None ? 'cursor-wait' : ''}
                    `}
                >
                    Sign Out
                </button>
                </>
            ) : (
                <button
                onClick={handleLogin}
                disabled={inProgress !== InteractionStatus.None}
                className={`
                    px-4 h-16 bg-blue-600 text-white
                    hover:bg-blue-700 focus:outline-none focus:ring-2 
                    focus:ring-blue-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${inProgress === InteractionStatus.None ? 'animate-pulse' : ''}
                `}
                >
                Sign In
                </button>
            )}
            </div>
        </div>
        </header>
        <SubscriptionUpsellModal 
            isOpen={showUpsell}
            onClose={() => setShowUpsell(false)}
        />
    </>
  );
};