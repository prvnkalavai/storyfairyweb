import { useRef, useCallback, useState, MutableRefObject, useEffect } from 'react';
import { Howl } from 'howler';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

interface UseAzureSpeechProps {
  region: string;
  subscriptionKey: string;
  onSentenceStart?: (index: number) => void;
  isMounted: MutableRefObject<boolean>;
}

interface Mark {
  time: number;
  name: string;
}

export const useAzureSpeech = ({
  region,
  subscriptionKey,
  onSentenceStart,
  isMounted
}: UseAzureSpeechProps) => {
  const audioPlayer = useRef<Howl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeUrlRef = useRef<string | null>(null);
  const currentSentenceRef = useRef<number>(-1);
  const marksRef = useRef<Mark[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);
  const lastTimeUpdateRef = useRef<number>(0);
  const synthesisStartTimeRef = useRef<number>(0);

  const stop = useCallback(async () => {
    return new Promise<void>((resolve) => {
        if (audioPlayer.current) {
            audioPlayer.current.once('stop', () => {
                resolve();
            });
            audioPlayer.current.stop();
        } else {
            resolve();
        }
        setIsPlaying(false);
    });
}, []);

// Modify the cleanup function to be more thorough
const cleanup = useCallback(() => {
    return new Promise<void>((resolve) => {
        if (audioPlayer.current) {
            audioPlayer.current.once('unload', () => {
                if (activeUrlRef.current) {
                    URL.revokeObjectURL(activeUrlRef.current);
                    activeUrlRef.current = null;
                }
                audioBlobRef.current = null;
                currentSentenceRef.current = -1;
                marksRef.current = [];
                setIsPlaying(false);
                resolve();
            });
            audioPlayer.current.unload();
            audioPlayer.current = null;
        } else {
            resolve();
        }
    });
}, []);

  const createHowl = useCallback((audioBlob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const blobUrl = URL.createObjectURL(audioBlob);
        console.log('Created new blob URL:', blobUrl);
        
        if (activeUrlRef.current) {
          URL.revokeObjectURL(activeUrlRef.current);
        }
        activeUrlRef.current = blobUrl;

        const howl = new Howl({
          src: [blobUrl],
          format: ['mp3'],
          html5: true,
          onload: () => {
            console.log('Howl loaded successfully');
            resolve();
          },
          onloaderror: (_, error) => {
            console.error('Howl load error:', error);
            reject(new Error('Failed to load audio'));
          },
          onplay: () => {
            console.log('Audio started playing');
            setIsPlaying(true);
            synthesisStartTimeRef.current = Date.now();
          },
          onend: () => {
            console.log('Audio ended');
            setIsPlaying(false);
            currentSentenceRef.current = -1;
          },
          onstop: () => {
            console.log('Audio stopped');
            setIsPlaying(false);
          }
        });

        audioPlayer.current = howl;

        const timeUpdateInterval = setInterval(() => {
          if (howl.playing()) {
              if (!audioPlayer.current) return;
              
              const currentTime = audioPlayer.current.seek() as number;
              if (Math.abs(currentTime - lastTimeUpdateRef.current) < 0.05) return;
              lastTimeUpdateRef.current = currentTime;
              
              const currentMarks = marksRef.current;
              
              for (let i = 0; i < currentMarks.length; i++) {
                  const mark = currentMarks[i];
                  if (mark.name.startsWith('sentence_')) {
                      const nextMark = currentMarks[i + 1];
                      const markTime = mark.time;
                      const nextMarkTime = nextMark ? nextMark.time : Infinity;
                      
                      console.log(`Current Time: ${currentTime}, Mark Time: ${markTime}, Next Mark Time: ${nextMarkTime}`);
                      
                      if (currentTime >= markTime && (nextMark ? currentTime < nextMarkTime : true)) {
                          const index = parseInt(mark.name.split('_')[1]);
                          if (currentSentenceRef.current !== index) {
                              currentSentenceRef.current = index;
                              console.log(`Triggering sentence start for index: ${index}`);
                              onSentenceStart?.(index);
                          }
                          break;
                      }
                  }
              }
          }
      }, 50);

        howl.on('end', () => clearInterval(timeUpdateInterval));

      } catch (err) {
        console.error('Error creating Howl instance:', err);
        reject(err);
      }
    });
  }, [onSentenceStart]);

  const speak = useCallback(async (sentences: string[]): Promise<void> => {
    let synthesizer: sdk.SpeechSynthesizer | null = null;
    
    try {
        await stop();
        await cleanup();
        
        setLoadingAudio(true);
        marksRef.current = [];
        currentSentenceRef.current = -1;

        const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
        // Configure for audio data output only
        speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        speechConfig.speechSynthesisVoiceName = "en-US-AvaNeural";

        // Create a pull audio output stream to prevent direct audio output
        const pullStream = sdk.AudioOutputStream.createPullStream();
        const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream);
        
        // Create synthesizer with pull stream audio config
        synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
            <voice name="en-US-AvaNeural">
                <prosody rate="1" pitch="0%">
                    ${sentences.map((sentence, index) => `
                        <mark name="sentence_${index}"/>
                        ${sentence.trim()}
                        ${index < sentences.length - 1 ? '<break time="300ms"/>' : ''}
                    `).join('')}
                </prosody>
            </voice>
        </speak>`.trim();

        // Reset marks array
        marksRef.current = [];

        synthesizer.bookmarkReached = (sender, event) => {
            if (event.text.startsWith('sentence_')) {
                const timeInSeconds = event.audioOffset / 10000000; // Convert to seconds
                marksRef.current.push({
                    time: timeInSeconds,
                    name: event.text
                });
                console.log(`Mark reached: ${event.text} at time ${timeInSeconds}s`);
            }
        };

        let isProcessing = false;
        
        await new Promise<void>((resolve, reject) => {
            if (!synthesizer || isProcessing) {
                reject(new Error('Invalid synthesizer state'));
                return;
            }

            isProcessing = true;

            synthesizer.speakSsmlAsync(
                ssml,
                result => {
                    if (!isMounted.current || !result) {
                        isProcessing = false;
                        resolve();
                        return;
                    }

                    if (result.errorDetails) {
                        isProcessing = false;
                        reject(new Error(`Synthesis failed: ${result.errorDetails}`));
                        return;
                    }

                    const audioBuffer = new Uint8Array(result.audioData);
                    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
                    audioBlobRef.current = audioBlob;
                    
                    createHowl(audioBlob)
                        .then(() => {
                            if (audioPlayer.current && isMounted.current) {
                                audioPlayer.current.play();
                                isProcessing = false;
                                resolve();
                            }
                        })
                        .catch(error => {
                            isProcessing = false;
                            reject(error);
                        });
                },
                error => {
                    isProcessing = false;
                    console.error('Synthesis failed:', error);
                    reject(error);
                }
            );
        });

    } catch (err) {
        console.error('Speech synthesis error:', err);
        setError(err instanceof Error ? err.message : 'Speech synthesis failed');
        await cleanup();
    } finally {
        if (synthesizer) {
            synthesizer.close();
            synthesizer = null;
        }
        setLoadingAudio(false);
    }
}, [region, subscriptionKey, stop, cleanup, createHowl, isMounted]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    speak,
    stop,
    cleanup,
    error,
    isPlaying,
    currentSentence: currentSentenceRef.current,
    loadingAudio,
  };
};
