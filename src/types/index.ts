export interface StoryData {
  StoryText: string;
  title: string;
  images: Array<{ imageUrl: string }>;
  voiceName: string;
}
  
export interface LocationState {
  storyData: StoryData;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}