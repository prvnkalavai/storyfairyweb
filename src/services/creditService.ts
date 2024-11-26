import { getAuthToken } from '../utils/auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log('API_BASE_URL:', API_BASE_URL);

export const getUserCredits = async (): Promise<number> => {
    const token = await getAuthToken();
    const apiUrl = `${API_BASE_URL}/api/credits`;
    console.log('Calling API URL:', apiUrl);
    //console.log('Token being passed as part of the authorization header in the api call:', token);
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-ms-token-aad-access-token': `Bearer ${token}`
            }
        });
  
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Response:', errorText);
            console.error('Response status:', response.status);
            console.error('Response headers:', Object.fromEntries(response.headers));
            throw new Error(`Failed to fetch credits: ${response.status}`);
        }
  
        const data = await response.json();
        return data.credits;
    } catch (error) {
        console.error('Full error:', error);
        throw error;
    }
  };

export const deductCredits = async (amount: number, description: string): Promise<number> => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/credits/deduct`, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-ms-token-aad-access-token': `Bearer ${token}`
      },
      body: JSON.stringify({ amount, description })
  });

  if (!response.ok) {
      if (response.status === 402) {
          throw new Error('Insufficient credits');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to deduct credits');
  }

  const data = await response.json();
  return data.credits;
};