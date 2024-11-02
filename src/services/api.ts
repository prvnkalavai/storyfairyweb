import { StoryData } from "../types";

//const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export const generateStory = async (
  topic: string,
  storyLength: string,
  imageStyle: string
): Promise<StoryData> => {
  const localDev = window.location.hostname === "localhost";
  const baseUrl = localDev 
    ? `https://storyfairy.azurewebsites.net/api/GenerateStory?code=${process.env.REACT_APP_FUNCTION_KEY}` 
    : '/api/GenerateStory';

  const queryParams = new URLSearchParams({
    topic: topic || '""',
    storyLength,
    imageStyle
  });
  const apiURL = localDev ? `${baseUrl}&${queryParams.toString()}` : `${baseUrl}?${queryParams.toString()}`;
  const response = await fetch(apiURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
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