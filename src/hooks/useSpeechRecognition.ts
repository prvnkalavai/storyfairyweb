import { useState, useEffect } from 'react';

interface IWebkitSpeechRecognitionResult {
  0: { transcript: string };
}

interface IWebkitSpeechRecognitionEvent extends Event {
  results: IWebkitSpeechRecognitionResult[];
}

interface IWebKitSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: IWebkitSpeechRecognitionEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export const useSpeechRecognition = (onTranscriptChange: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<IWebKitSpeechRecognition | undefined>(undefined);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognitionInstance = new (window as any).webkitSpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      
      recognitionInstance.onresult = (event: IWebkitSpeechRecognitionEvent) => {
        const transcript = event.results.map(result => result[0].transcript).join('');
        onTranscriptChange(transcript);
      };
      
      recognitionInstance.onend = () => setIsListening(false);
      setRecognition(recognitionInstance);
    }
  }, [onTranscriptChange]);

  const toggleListening = () => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      onTranscriptChange('');
      recognition.start();
      setIsListening(true);
    }
  };

  return { isListening, toggleListening };
};
