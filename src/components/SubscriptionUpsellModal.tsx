// components/SubscriptionUpsellModal.tsx
import React from 'react';
import { getAuthToken } from '../utils/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log('API_BASE_URL:', API_BASE_URL);

export const SubscriptionUpsellModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const handleSubscribe = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/subscribe`, {
        method: 'POST',
        headers: {
          'X-My-Auth-Token': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: process.env.REACT_APP_STRIPE_SUBSCRIPTION_PRICE_ID })
      });
      
      if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || errorText);
          } catch (jsonError) {
            throw new Error(errorText || response.statusText);
          }
      }

      const { sessionUrl } = await response.json();
      window.location.href = sessionUrl; // Redirect to Stripe checkout
    } catch (error) {
      console.error('Failed to create subscription:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Upgrade to Premium</h2>
        <ul className="benefits-list">
          <li>✨ Access to My Stories collection</li>
          <li>🎨 Personalized story characters with your photos</li>
          <li>🔄 Image regeneration capability</li>
          <li>📚 Unlimited story generation</li>
        </ul>
        <div className="modal-actions">
          <button onClick={handleSubscribe}>Subscribe Now</button>
          <button onClick={onClose}>Later</button>
        </div>
      </div>
    </div>
  );
};