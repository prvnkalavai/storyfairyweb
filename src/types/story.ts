//storyfairyweb/src/types/story.ts
export interface Story {
    id: string;
    userId: string;
    title: string;
    storyText: string;
    detailedStoryText: string;
    storyUrl: string;
    detailedStoryUrl: string;
    images: {
      url: string;
      prompt: string;
    }[];
    coverImages: {
      frontCover: {
        url: string;
        prompt: string;
        imageData?: string;
      };
      backCover?: {
        url: string;
        prompt: string;
      };
    };
    voiceName: string;
    createdAt: Date;
    metadata: {
      topic?: string;
      storyLength: string;
      imageStyle: string;
      storyModel: string;
      imageModel: string;
      storyStyle: string;
      creditsUsed: number;
    }
  }
  
  export interface StoriesResponse {
    stories: Story[];
    totalCount: number;
    pageSize: number;
    currentPage: number;
  }