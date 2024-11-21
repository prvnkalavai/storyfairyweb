import { StoryData } from "../types";

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
      'Authorization': `Bearer ${accessToken}`
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