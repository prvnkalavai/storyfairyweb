//storyfairyweb/src/types/story.ts
export interface Story {
    id: string;
    userId: string;
    title: string;
    storyText: string;
    detailedStoryText: string;
    images: {
      url: string;
      prompt: string;
      index: number;
    }[];
    coverImages: {
      frontCover: {
        url: string;
        prompt: string;
      };
      backCover?: {
        url: string;
        prompt: string;
      };
    };
    createdAt: Date;
    metadata: {
      topic?: string;
      storyLength: string;
      imageStyle: string;
      storyModel: string;
      imageModel: string;
      storyStyle: string;
      voiceName: string;
      creditsUsed: number;
    }
  }
  
  export interface StoriesResponse {
    stories: Story[];
    totalCount: number;
    pageSize: number;
    currentPage: number;
  }