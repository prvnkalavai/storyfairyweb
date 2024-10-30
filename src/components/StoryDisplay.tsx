import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography, Box, Button } from '@mui/material';
import { Download, Share2, MicOff, Mic  } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Slider from "react-slick";
import { jsPDF } from "jspdf";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import whimsicalDots from '../assets/whimsical-dots.png';
import disneyStars from '../assets/disney-stars.png';
import pixarSquares from '../assets/pixar-squares.png';
import ghibliLeaves from '../assets/ghibli-leaves.png';
import animeLines2 from '../assets/anime-lines2.png';
import fantasySwirls from '../assets/fantasy-swirls.png';
import retroGeometric from '../assets/retro-geometric.png';
import cartoonBubbles from '../assets/cartoon-bubbles.png';
import stopmotionTexture from '../assets/stopmotion-texture.png';
import defaultSubtle from '../assets/default-subtle.png';

interface StoryData {
  StoryText: string;
  title: string;
  images: Array<{ imageUrl: string }>;
}

interface LocationState {
  storyData: StoryData;
}

// Pattern library with base64 encoded PNG patterns
const patternLibrary: Record<string, string> = {
  whimsical: whimsicalDots,
  disney: disneyStars,
  pixar: pixarSquares,
  studioghibli: ghibliLeaves,
  anime: animeLines2,
  fantasy: fantasySwirls,
  retro: retroGeometric,
  cartoon: cartoonBubbles,
  stopmotion: stopmotionTexture,
  default: defaultSubtle
};

const StoryDisplay = () => {
  const location = useLocation();
  const { storyData } = (location.state as LocationState);
  const navigate = useNavigate();
  const sliderRef = useRef<Slider | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareAfterGeneration, setShareAfterGeneration] = useState(false);
  const sentences = storyData.StoryText.split(/(?<=[.!?])\s+/);

  const getRandomPattern = (): string => {
    const patterns = Object.values(patternLibrary);
    return patterns[Math.floor(Math.random() * patterns.length)];
  };
   
  useEffect(() => {
    if ('speechSynthesis' in window) {
      utteranceRef.current = new SpeechSynthesisUtterance();
      
      utteranceRef.current.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'sentence') {
          const currentSentenceIndex = Math.floor(event.charIndex / (storyData.StoryText.length / sentences.length));
          if (sliderRef.current) {
            sliderRef.current.slickGoTo(currentSentenceIndex);
          }
        }
      };
      
      return () => {
        if (utteranceRef.current) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [storyData.StoryText, sentences.length]);

  const handleNarration = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (utteranceRef.current) {
        utteranceRef.current.text = storyData.StoryText;
        const voices = window.speechSynthesis.getVoices();
        utteranceRef.current.voice = voices.find(voice => voice.name === 'Google US English Female') || voices[2];
        window.speechSynthesis.speak(utteranceRef.current);
        setIsPlaying(true);
      }
    }
  };

  const downloadFile = useCallback((blob: Blob) => {
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${storyData.title}.pdf`;
    downloadLink.click();
  }, [storyData.title]);

  const shareFile = useCallback(async (blob: Blob) => {
    if (navigator.share) {
      try {
        const file = new File([blob], `${storyData.title}.pdf`, { type: 'application/pdf' });
        await navigator.share({
          title: storyData.title,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fall back to download if sharing fails
        downloadFile(blob);
      }
    } else {
      downloadFile(blob);
    }
  }, [storyData.title, downloadFile]);

  useEffect(() => {
    // Attempt to share when PDF generation completes
    if (!isGeneratingPdf && shareAfterGeneration && pdfBlob) {
      setShareAfterGeneration(false);
      shareFile(pdfBlob);
    }
  }, [isGeneratingPdf, shareAfterGeneration, pdfBlob, shareFile]);

  const generateStoryBook = useCallback(async (shouldDownload: boolean = true) => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({
        format: [210, 210],
        unit: 'mm'
      });
  
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
  
      const addImageToPdf = async (imageUrl: string, x: number, y: number, width: number, height: number, opacity: number = 1) => {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = imageUrl;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          
          if (opacity !== 1) {
            const gState = doc.GState({ opacity: opacity });
            doc.setGState(gState);
          }
          
          doc.addImage(img, 'PNG', x, y, width, height, undefined, 'FAST');
          
          if (opacity !== 1) {
            const defaultGState = doc.GState({ opacity: 1 });
            doc.setGState(defaultGState);
          }
        } catch (error) {
          console.error('Failed to load image:', error);
        }
      };
  
      // Cover page
      const coverImageUrl = storyData.images[0].imageUrl;
      if (coverImageUrl) {
        await addImageToPdf(coverImageUrl, 0, 0, pageWidth, pageHeight);
      }
      
      doc.setFontSize(25);
      doc.setFont("Helvetica", "bold");
      doc.text(storyData.title, pageWidth / 2, 30, { align: 'center' });
      
      // Story pages
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const imageData = storyData.images[i];
  
        // Left page (text)
        doc.addPage();
        
        // Add random background pattern
        const randomPattern = getRandomPattern();
        await addImageToPdf(randomPattern, 0, 0, pageWidth, pageHeight, 0.4);
        
        // Add text
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(20);
        doc.setFont("Helvetica", "BoldOblique");
        const textX = 20;
        const textY = pageHeight / 2;
        doc.text(sentence, textX, textY, { align: 'left', maxWidth: pageWidth - 40 });
  
        // Right page (image)
        if (imageData && imageData.imageUrl) {
          doc.addPage();
          await addImageToPdf(imageData.imageUrl, 0, 0, pageWidth, pageHeight);
        }        
      }
      
      // Rear cover page
      doc.addPage();
      const rearCoverImageUrl = storyData.images[0].imageUrl;
      if (rearCoverImageUrl) {
        await addImageToPdf(rearCoverImageUrl, 0, 0, pageWidth, pageHeight);
      }
  
      // Save PDF blob for sharing
      // Save PDF blob for sharing
      const pdfOutput = doc.output('blob');
      setPdfBlob(pdfOutput);
      
      if (shouldDownload) {
        doc.save(storyData.title + '.pdf');
      }
      
      return pdfOutput;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [storyData.title, storyData.images, sentences]); 

  const handleShare = useCallback(async () => {
    if (pdfBlob) {
      // If PDF exists, share immediately
      shareFile(pdfBlob);
    } else {
      // Set flag to share after generation and start generating PDF
      setShareAfterGeneration(true);
      generateStoryBook(false);
    }
  }, [pdfBlob, shareFile, generateStoryBook]);

  const handleDownload = useCallback(() => {
    if (pdfBlob) {
      downloadFile(pdfBlob);
    } else {
      generateStoryBook(true);
    }
  }, [pdfBlob, downloadFile, generateStoryBook]);

  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    beforeChange: (_: any, next: number) => setCurrentSlide(next)
  };

  // Use setCurrentSlide in a function to avoid the unused variable error
  const setCurrentSlide = (slideIndex: number) => {
    // Update current slide index for narration synchronization
    if (sliderRef.current && utteranceRef.current && isPlaying) {
      const sentenceIndex = Math.floor(slideIndex);
      const text = sentences.slice(0, sentenceIndex + 1).join(' ');
      utteranceRef.current.text = text;
    }
  };

  return (
    <Box className="max-w-4xl mx-auto p-6">
      <div className="flex justify-center gap-1 mb-0 mt-6">
        <Button 
          variant="contained" 
          onClick={() => navigate('/')}
          className="mt-0"
        >
          Generate New Story
        </Button>
        <Button 
          variant="contained" 
          onClick={handleNarration}
          startIcon={isPlaying ? <MicOff /> : <Mic />} 
          disabled={isGeneratingPdf}
        >
          {isPlaying ? 'Stop Narration' : 'Start Narration'}
        </Button>
        <Button 
          variant="contained" 
          onClick={handleDownload}
          startIcon={<Download />}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? 'Generating PDF...' : 'Download Story Book'}
        </Button>
        <Button 
          variant="contained" 
          onClick={handleShare}
          startIcon={<Share2 />}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? 'Preparing...' : 'Share Story'}
        </Button>
      </div>
      <Slider ref={sliderRef} {...sliderSettings}>
        {storyData.images.map((image, index) => (
          <div key={index} className="p-4">
            <img
              src={image.imageUrl}
              alt={`Story illustration ${index + 1}`}
              className="max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        ))}
      </Slider>

      <Box className="mt-6 p-4 bg-purple-100 rounded-lg shadow">
        <Typography variant="body1" className="text-lg leading-relaxed">
          {storyData.StoryText}
        </Typography>
      </Box>

      
    </Box>
  );
};

export default StoryDisplay;
