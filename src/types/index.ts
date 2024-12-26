export interface StoryData {
  id: string;
    userId: string;
    title: string;
    storyText: string;
    detailedStoryText: string;
    storyUrl: string;
    detailedStoryUrl: string;
    images: {
      imageUrl: string;
      prompt: string;
      imageData?: string;
    }[];
    coverImages: {
      frontCover: CoverImage | null;
      backCover: CoverImage | null;
    };
    voiceName: string;
    createdAt: Date;
    metadata: {
      topic?: string;
      storyLength: string;
      imageStyle: string;
      storyModel: string;
      imageModel: string;
      storyTheme: string;
      creditsUsed: number;
    }
}

export type CoverImage = {
  url: string;
  prompt: string;
  imageData?: string;
};

export interface LocationState {
  storyData: StoryData;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export interface StoriesResponse {
  stories: StoryData[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}