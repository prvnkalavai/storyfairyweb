import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { StoryControls } from './StoryControls';
import { usePdfGeneration } from '../hooks/usePdfGeneration';
import { useAzureSpeech } from '../hooks/useAzureSpeech';
import { canShare } from '../utils/sharing';
import type { LocationState, StoryData } from '../types';
import { useSubscription } from '../context/SubscriptionContext';
import { regenerateImage, getStoryById, getBlob } from '../services/api';

const splitIntoSentences = (text: string): string[] => {
  const exceptions = /(?:[A-Z][a-z]*\.|Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)/g;
  let processedText = text;
  const foundExceptions: string[] = [];
  let match;
  
  while ((match = exceptions.exec(text)) !== null) {
    const placeholder = `__EXC${foundExceptions.length}__`;
    foundExceptions.push(match[0]);
    processedText = processedText.replace(match[0], placeholder);
  }
  
  const sentences = processedText.split(/(?<=[.!?])\s+/);
  
  return sentences.map(sentence => {
    let restoredSentence = sentence;
    foundExceptions.forEach((exc, i) => {
      restoredSentence = restoredSentence.replace(`__EXC${i}__`, exc);
    });
    return restoredSentence;
  });
};

export const StoryDisplay: React.FC = () => {
  const location = useLocation();
  const { storyData } = location.state as LocationState;
  const navigate = useNavigate();
  const sliderRef = useRef<Slider>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const sentences = splitIntoSentences(storyData.storyText);
  const normalizedImageCount = Math.min(storyData.images.length, sentences.length);
    const [images, setImages] = useState(storyData.images.slice(0, normalizedImageCount));
    const mountedRef = useRef(true);
    const { subscription } = useSubscription();
    const storyRef = useRef<StoryData | null>(storyData);

  const handleSentenceStart = useCallback((index: number) => {
    if (!mountedRef.current) {
      console.log("Component not mounted, ignoring sentence update");
      return;
    }
    
    setCurrentSentenceIndex(index);
    if (sliderRef.current) {
      const imageIndex = Math.min(index, images.length - 1);
      console.log("Updating slider to image ", imageIndex)
      sliderRef.current.slickGoTo(imageIndex);
    }
  }, [images.length]);

  const {
    speak,
    stop,
    cleanup: cleanupSpeech,
    error: speechError,
    isPlaying,
    loadingAudio
  } = useAzureSpeech({
    region: process.env.REACT_APP_AZURE_REGION!,
    subscriptionKey: process.env.REACT_APP_AZURE_SPEECH_KEY!,
    onSentenceStart: handleSentenceStart,
    isMounted: mountedRef
  });
    
  const { pdfBlob, generateStoryBook } = usePdfGeneration(storyData);
  
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      cleanupSpeech();
    };
  }, [cleanupSpeech]);

  const handleNarration = useCallback(async () => {
    try {
      if (isPlaying) {
        stop();
        setCurrentSentenceIndex(0);
      } else {
        await speak(sentences, storyData.voiceName);
      }
    } catch (error) {
      console.error('Narration failed:', error);
    }
  }, [isPlaying, sentences, speak, stop, storyData.voiceName]);

  const handleNewStory = useCallback(async () => {
    stop();
    navigate('/');
  }, [stop, navigate]);

  const downloadFile = useCallback((blob: Blob) => {
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${storyData.title}.pdf`;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  }, [storyData.title]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      if (pdfBlob) {
        downloadFile(pdfBlob);
      } else {
        const newPdfBlob = await generateStoryBook();
        if (newPdfBlob) {
          downloadFile(newPdfBlob);
        }
      }
    } finally {
      setIsDownloading(false);
    }
  }, [pdfBlob, downloadFile, generateStoryBook]);

  const handleShare = useCallback(async () => {
    if (!canShare()) {
      handleDownload();
      return;
    }

    try {
      setIsSharing(true);
      if (!pdfBlob) {
        console.warn('PDF blob not available for sharing');
        return;
      }

      const file = new File([pdfBlob], `${storyData.title}.pdf`, { 
        type: 'application/pdf' 
      });

      await navigator.share({
        title: storyData.title,
        files: [file]
      });
    } catch (error) {
      console.error('Share failed:', error);
      if (pdfBlob) {
        downloadFile(pdfBlob);
      }
    } finally {
      setIsSharing(false);
    }
  }, [pdfBlob, storyData.title, handleDownload, downloadFile]);
   const fetchStory = async (id: string) => {
        try {
            const fetchedStory = await getStoryById(id);
             if(fetchedStory){
                setImages(fetchedStory.images)
                 storyRef.current = fetchedStory;
            }
        } catch (error) {
            console.error('Error fetching story:', error);
        }
    };
   

  const handleRegenerate = async (index: number) => {
    if (!subscription.isSubscribed) return;

    try {
      const { url } = await regenerateImage(
        images[index].prompt,
        storyData.metadata.imageStyle,
        storyData.metadata.imageModel,
        storyData.id,
        index
      );
       const newImages = [...images];
        newImages[index] = {
           ...newImages[index],
           imageUrl: url
         };
        setImages([...newImages]);
      await fetchStory(storyData.id);

    } catch (error) {
      console.error('Failed to regenerate image:', error);
    }
  };
  
  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    arrows: true,
    swipe: !isPlaying,
  };
    useEffect(() => {
            const loadImages = async () => {
                const processImage = async (image: any) => {
                    if (image.imageData) return image;
                    if (image.imageUrl) {
                         try {
                             const blobName = image.imageUrl.split('/')[3].split('?')[0];
                            const blob = await getBlob(blobName, 'storyfairy-images');
                            return { ...image, imageData: URL.createObjectURL(blob) };
                        } catch (e) {
                            return image;
                        }
                    }
                    return image;
                };
               const processedImages = await Promise.all(images.map(processImage));
               setImages(processedImages);
            };

           loadImages()
        },[images]);


  return (
    <div className="w-full min-h-screen pt-40 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {speechError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {speechError}
          </div>
        )}
        <StoryControls
          onNewStory={handleNewStory}
          onNarration={handleNarration}
          onDownload={handleDownload}
          onShare={canShare() ? handleShare : undefined}
          isPlaying={isPlaying}
          isDownloading={isDownloading}
          isSharing={isSharing}
          disabled={loadingAudio}
        />

        <div className="mt-4">
          <Slider ref={sliderRef} {...sliderSettings}>
            {images.map((image, index) => (
              <div key={index} className="px-2 relative">
                {image.imageData ? (
                  <div className="relative">
                    <img
                      src={image.imageData }
                      alt={`Story illustration ${index + 1} - ${image.prompt}`}
                      className="w-full h-auto rounded-lg shadow-lg mx-auto object-contain max-h-[100vh]"
                      onError={(e) => {
                        console.error(`Failed to load image at index ${index}:`, image.imageData);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {subscription.isSubscribed && (
                      <button
                        onClick={() => handleRegenerate(index)}
                        className="absolute top-2 right-2 bg-white/80 p-2 rounded-full shadow-md"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-red-500">No image available</div>
                )}
              </div>
            ))}
          </Slider>
        </div>

        <div className="mt-6 p-4 bg-purple-200 backdrop-blur-sm rounded-lg shadow-lg">
          <Typography variant="body1" className="text-lg leading-relaxed text-justify">
            {sentences.map((sentence, index) => (
              <span
                key={index}
                className={`${index === currentSentenceIndex && isPlaying
                  ? 'bg-purple-300'
                  : ''
                  } transition-colors duration-200`}
              >
                {sentence}{' '}
              </span>
            ))}
          </Typography>
        </div>
      </div>
    </div >
  );
};