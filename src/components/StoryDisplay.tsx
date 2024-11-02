import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography, Box } from '@mui/material';
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
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentences = storyData.StoryText.split(/(?<=[.!?])\s+/);
  const currentSentenceIndexRef = useRef<number>(0);
  
  const { pdfBlob, generateStoryBook } = usePdfGeneration(storyData);

  // Pre-generate PDF when component mounts
  useEffect(() => {
    generateStoryBook();
  }, [generateStoryBook]);

  // Narration setup
  useEffect(() => {
    if ('speechSynthesis' in window) {
      utteranceRef.current = new SpeechSynthesisUtterance();
      
      utteranceRef.current.onend = () => {
        setIsPlaying(false);
        currentSentenceIndexRef.current = 0;
      };
      
      utteranceRef.current.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'sentence') {
          const textUpToChar = storyData.StoryText.substring(0, event.charIndex);
          const sentencesUpToChar = textUpToChar.split(/(?<=[.!?])\s+/);
          currentSentenceIndexRef.current = sentencesUpToChar.length - 1;
          
          if (sliderRef.current) {
            sliderRef.current.slickGoTo(currentSentenceIndexRef.current);
          }
        }
      };

      return () => {
        if (utteranceRef.current) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [storyData.StoryText]);

  const handleNarration = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      currentSentenceIndexRef.current = 0;
    } else if (utteranceRef.current) {
      const ssmlText = sentences.join(' ');
      utteranceRef.current.text = ssmlText;
      const voices = window.speechSynthesis.getVoices();
      utteranceRef.current.voice = voices.find(voice => voice.name === 'Google US English Female') || voices[2];
      window.speechSynthesis.speak(utteranceRef.current);
      setIsPlaying(true);
    }
  }, [isPlaying, sentences]);

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
    adaptiveHeight: true
  };

  return (
    <Box className="max-w-5xl mx-auto p-40">
      <StoryControls
        onNewStory={() => navigate('/')}
        onNarration={handleNarration}
        onDownload={handleDownload}
        onShare={canShare() ? handleShare : undefined}
        isPlaying={isPlaying}
        isDownloading={isDownloading}
        isSharing={isSharing}
      />

      <Slider ref={sliderRef} {...sliderSettings}>
        {storyData.images.map((image, index) => (
          <div key={index} className="p-2">
            <img
              src={image.imageUrl}
              alt={`Story illustration ${index + 1}`}
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        ))}
      </Slider>

      <Box className="mt-6 p-4 bg-purple-100 rounded-lg shadow">
        <Typography variant="body1" className="text-lg leading-relaxed text-justify">
          {storyData.StoryText}
        </Typography>
      </Box>
    </Box>
  );
};