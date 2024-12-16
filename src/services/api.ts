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
    ? `${API_BASE_URL}/api/GenerateStory` 
    : `${API_BASE_URL}/api/GenerateStory`;

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
      'X-My-Auth-Token': `Bearer ${accessToken}`
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

export const getUserStories = async (filters: any) => {
  const token = await getAuthToken();
  const queryParams = new URLSearchParams({
      ...filters,
      dateRange: filters.dateRange ? JSON.stringify(filters.dateRange) : ''
  }).toString();

  const response = await fetch(`${API_BASE_URL}/api/stories?${queryParams}`, {
      headers: {
        'X-My-Auth-Token': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
  });

  if (!response.ok) {
      throw new Error('Failed to fetch stories');
  }

  const data = await response.json();

  // Process stories to load images
  if (data.stories) {
    const processedStories = await Promise.all(data.stories.map(async (story: any) => {
    if (story.coverImages?.frontCover?.url) {
      try {
        console.log('Fetching image: ', story.coverImages.frontCover.url)
        const imageResponse = await fetch(`${API_BASE_URL}`+story.coverImages.frontCover.url, {
          headers: {
            'X-My-Auth-Token': `Bearer ${token}`
          }
        });
  
        if (imageResponse.ok) {
          // Convert blob to base64 or URL
          const blob = await imageResponse.blob();
          story.coverImages.frontCover.imageData = URL.createObjectURL(blob);
        } else {
          console.error(`Failed to fetch image for story ${story.id}`);
        }
      } catch (error) {
        console.error(`Error fetching image for story ${story.id}:`, error);
      }
    }
    return story;
    }));
  
    data.stories = processedStories;
  }
  
  return data;
};

export const deleteStory = async (storyId: string) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {
    method: 'DELETE',
    headers: {
      'X-My-Auth-Token': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete story');
  }

  return response.json();
};

export const getBlob = async (blobName: string, container: string = 'storyfairy-images') => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/blob/${blobName}?container=${container}`, {
    headers: {
      'X-My-Auth-Token': `Bearer ${token}`
    }
    });
  
    if (!response.ok) {
      throw new Error('Failed to fetch blob');
    }
  
    return response.blob();
};

export const getStoryById = async (storyId: string): Promise<StoryData> => {    
  const token = await getAuthToken();    
  const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {    
    method: 'GET',    
    headers: {    
      'X-My-Auth-Token': `Bearer ${token}`,    
      'Content-Type': 'application/json',    
    },    
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

  const data = await response.json();  

  // Process images to load their content  
  if (data.images) {  
    const processedImages = await Promise.all(data.images.map(async (image: any) => {  
      if (image.imageUrl) {  
        try {  
          const imageResponse = await fetch(`${API_BASE_URL}${image.imageUrl}`, {  
            headers: {  
              'X-My-Auth-Token': `Bearer ${token}`  
            }  
          });  

          if (imageResponse.ok) {  
            const blob = await imageResponse.blob();  
            image.imageData = URL.createObjectURL(blob);  
          }  
        } catch (error) {  
          console.error('Error fetching image:', error);  
        }  
      }  
      return image;  
    }));  
    data.images = processedImages;  
  }  

  // Process cover images  
  if (data.coverImages) {  
    for (const coverType in data.coverImages) {  
      const cover = data.coverImages[coverType];  
      if (cover?.url) {  
        try {  
          const imageResponse = await fetch(`${API_BASE_URL}${cover.url}`, {  
            headers: {  
              'X-My-Auth-Token': `Bearer ${token}`  
            }  
          });  

          if (imageResponse.ok) {  
            const blob = await imageResponse.blob();  
            cover.imageData = URL.createObjectURL(blob);  
          }  
        } catch (error) {  
          console.error(`Error fetching ${coverType}:`, error);  
        }  
      }  
    }  
  }  

  return data;    
};  


export const createSubscription = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/subscribe`, {
    method: 'POST',
    headers: {
      'X-My-Auth-Token': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to create subscription');
  }

  const data = await response.json();
  return data.sessionUrl;
};

export const uploadReferenceImage = async (file: File) => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/api/upload-reference-image`, {
    method: 'POST',
    headers: {
      'X-My-Auth-Token': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  return response.json();
};

export const regenerateImage = async (
  prompt: string,
  imageStyle: string,
  imageModel: string,
  referenceImageUrl?: string
) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/regenerate-image`, {
    method: 'POST',
    headers: {
      'X-My-Auth-Token': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      imageStyle,
      imageModel,
      referenceImageUrl
    })
  });

  if (!response.ok) {
    throw new Error('Failed to regenerate image');
  }

  return response.json();
};