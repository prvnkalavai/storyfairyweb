import { StoryData } from "../types";
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log('API_BASE_URL:', API_BASE_URL);


export const generateStory = async (
  topic: string,
  storyLength: string,
  imageStyle: string,
  storyModel: string,
  imageModel: string,
  storyStyle: string,
  voiceName: string,
  accessToken: string
): Promise<StoryData> => {
  const localDev = window.location.hostname === "localhost";
  //const baseUrl = localDev 
  //  ? `https://storyfairy.azurewebsites.net/api/GenerateStory?code=${process.env.REACT_APP_FUNCTION_KEY}` 
  //  : '/api/GenerateStory';

  const baseUrl = localDev 
    ? `http://localhost:7071/api/GenerateStory` 
    : '/api/GenerateStory';

  const queryParams = new URLSearchParams({
    topic: topic || '""',
    storyLength,
    imageStyle,
    storyModel,
    imageModel, 
    storyStyle, 
    voiceName
  });

  //console.log("access token: ", accessToken)
  //console.log("query params: ", queryParams.toString())
  const apiURL = localDev ? `${baseUrl}?${queryParams.toString()}` : `${baseUrl}?${queryParams.toString()}`;
  const response = await fetch(apiURL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'x-ms-token-aad-access-token': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || errorText);
    } catch(jsonError) {
      throw new Error(errorText || response.statusText);
    }
  }

  return response.json();
};


// Add these functions to src/services/api.ts

export const getUserStories = async (filters: any) => {
  const token = await getAuthToken();
  const queryParams = new URLSearchParams({
    ...filters,
    dateRange: filters.dateRange ? JSON.stringify(filters.dateRange) : ''
  }).toString();
  const response = await fetch(`${API_BASE_URL}/api/stories?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-ms-token-aad-access-token': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch stories');
  }

  return response.json();
};

export const deleteStory = async (storyId: string) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-ms-token-aad-access-token': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete story');
  }

  return response.json();
};