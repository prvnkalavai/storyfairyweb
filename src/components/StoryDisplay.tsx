import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { StoryControls } from './StoryControls';
import { usePdfGeneration } from '../hooks/usePdfGeneration';
import { canShare } from '../utils/sharing';
import type { LocationState } from '../types';

export const StoryDisplay: React.FC = () => {
  const location = useLocation();
  const { storyData } = location.state as LocationState;
  const navigate = useNavigate();
  const sliderRef = useRef<Slider | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentences = storyData.StoryText.split(/(?<=[.!?])\s+/);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const { pdfBlob, generateStoryBook } = usePdfGeneration(storyData);

  // Pre-generate PDF when component mounts
  useEffect(() => {
    generateStoryBook();
  }, [generateStoryBook]);

  // Cleanup function for speech synthesis and timeouts
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Function to speak a single sentence with image sync
  const speakSentence = useCallback((index: number) => {
    if (!utteranceRef.current || index >= sentences.length) {
      setIsPlaying(false);
      setCurrentSentenceIndex(0);
      return;
    }

    setCurrentSentenceIndex(index);

    // Update slider position
    if (sliderRef.current) {
      const imageIndex = Math.floor(index * (storyData.images.length / sentences.length));
      sliderRef.current.slickGoTo(imageIndex);
    }

    utteranceRef.current.text = sentences[index];
    
    // Set up the onend handler for this sentence
    utteranceRef.current.onend = () => {
      timeoutRef.current = setTimeout(() => {
        speakSentence(index + 1);
      }, 100); // Reduced to 500ms delay between sentences
    };

    window.speechSynthesis.speak(utteranceRef.current);
  }, [sentences, storyData.images.length]);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      utteranceRef.current = new SpeechSynthesisUtterance();
      const voices = window.speechSynthesis.getVoices();
      if (utteranceRef.current) {
        utteranceRef.current.voice = voices.find(voice => voice.name === 'Google US English Female') || voices[0];
        utteranceRef.current.rate = 1.0; // Normal rate
      }
    }
  }, []);

  const handleNarration = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsPlaying(false);
      setCurrentSentenceIndex(0);
    } else {
      setIsPlaying(true);
      speakSentence(currentSentenceIndex);
    }
  }, [isPlaying, speakSentence, currentSentenceIndex]);

  const downloadFile = useCallback((blob: Blob) => {
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${storyData.title}.pdf`;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  }, [storyData.title]);

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

  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    arrows: true,
    swipe: !isPlaying // Disable swipe when narration is playing
  };

  return (
    <div className="w-full min-h-screen pt-40 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <StoryControls
          onNewStory={() => navigate('/')}
          onNarration={handleNarration}
          onDownload={handleDownload}
          onShare={canShare() ? handleShare : undefined}
          isPlaying={isPlaying}
          isDownloading={isDownloading}
          isSharing={isSharing}
        />

        <div className="mt-4">
          <Slider ref={sliderRef} {...sliderSettings}>
            {storyData.images.map((image, index) => (
              <div key={index} className="px-2">
                <img
                  src={image.imageUrl}
                  alt={`Story illustration ${index + 1}`}
                  className="w-full h-auto rounded-lg shadow-lg mx-auto object-contain max-h-[100vh]"
                />
              </div>
            ))}
          </Slider>
        </div>

        <div className="mt-6 p-4 bg-purple-200 backdrop-blur-sm rounded-lg shadow-lg">
          <Typography variant="body1" className="text-lg leading-relaxed text-justify">
            {sentences.map((sentence, index) => (
              <span
                key={index}
                className={`${
                  index === currentSentenceIndex && isPlaying
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
    </div>
  );
};