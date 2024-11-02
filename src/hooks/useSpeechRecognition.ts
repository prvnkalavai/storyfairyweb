import { useState, useCallback, useEffect, SetStateAction } from 'react';

export const useSpeechRecognition = (onTranscript: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (error) return;

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: { error: SetStateAction<string | null>; }) => {
      setError(event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: { results: string | any[]; }) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;
      onTranscript(transcript);
    };

    if (!isListening) {
      try {
        recognition.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
        setError('Failed to start speech recognition');
      }
    } else {
      recognition.stop();
    }
  }, [isListening, error, onTranscript]);

  return {
    isListening,
    toggleListening,
    error
  };
};
