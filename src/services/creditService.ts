import { getAuthToken } from '../utils/auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const getUserCredits = async (): Promise<number> => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/credits`, {
      headers: {
          'Authorization': `Bearer ${token}`
      }
  });

  if (!response.ok) {
      throw new Error('Failed to fetch credits');
  }

  const data = await response.json();
  return data.credits;
};

export const deductCredits = async (amount: number, description: string): Promise<number> => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/credits/deduct`, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount, description })
  });

  if (!response.ok) {
      if (response.status === 402) {
          throw new Error('Insufficient credits');
      }
      throw new Error('Failed to deduct credits');
  }

  const data = await response.json();
  return data.credits;
};