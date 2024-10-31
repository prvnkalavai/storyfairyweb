import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography, Box } from '@mui/material';
import { Download, Share2, MicOff, Mic } from 'lucide-react';
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

// Type guard for Web Share API
const canShare = (): boolean => {
  return !!(
    typeof navigator !== 'undefined' && 
    navigator.share && 
    typeof navigator.share === 'function'
  );
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
  const [isSharing, setIsSharing] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const shareActionRef = useRef<(() => Promise<void>) | null>(null);
const sentences = storyData.StoryText.split(/(?<=[.!?])\s+/);

  const getRandomPattern = (): string => {
    const patterns = Object.values(patternLibrary);
    return patterns[Math.floor(Math.random() * patterns.length)];
  };
   
  // Narration setup with improved mobile support
  useEffect(() => {
    if ('speechSynthesis' in window) {
      utteranceRef.current = new SpeechSynthesisUtterance();
      
      utteranceRef.current.onend = () => {
        setIsPlaying(false);
      };
      
      utteranceRef.current.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'sentence' || event.name === 'word') {
          const index = Math.floor(event.charIndex / (storyData.StoryText.length / sentences.length));
          if (sliderRef.current) {
            sliderRef.current.slickGoTo(index);
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

  const handleNarration = useCallback(() => {
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
  }, [isPlaying, storyData.StoryText]);

  const downloadFile = useCallback((blob: Blob) => {
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${storyData.title}.pdf`;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  }, [storyData.title]);  

  const generateStoryBook = useCallback(async () => {
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
        doc.setFontSize(30);
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
      const pdfOutput = doc.output('blob');
      setPdfBlob(pdfOutput);
      return pdfOutput;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [storyData.title, storyData.images, sentences]);

  // Modified share handler to ensure user gesture
  const handleDownload = useCallback(async () => {
    if (pdfBlob) {
      downloadFile(pdfBlob);
    } else {
      const newPdfBlob = await generateStoryBook();
      if (newPdfBlob) {
        downloadFile(newPdfBlob);
      }
    }
  }, [pdfBlob, downloadFile, generateStoryBook]);

  const handleShare = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canShare()) {
      handleDownload();
      return;
    }

    try {
      setIsSharing(true);

      // If we already have a PDF, share it immediately
      if (pdfBlob) {
        const file = new File([pdfBlob], `${storyData.title}.pdf`, { 
          type: 'application/pdf' 
        });

        await navigator.share({
          title: storyData.title,
          files: [file]
        });
        return;
      }

      // If no PDF exists, generate it first
      const newPdfBlob = await generateStoryBook();
      if (!newPdfBlob) {
        throw new Error('Failed to generate PDF');
      }

      // Store the PDF for future use
      setPdfBlob(newPdfBlob);

      // Create share action that maintains the user gesture
      const shareAction = async () => {
        const file = new File([newPdfBlob], `${storyData.title}.pdf`, { 
          type: 'application/pdf' 
        });

        await navigator.share({
          title: storyData.title,
          files: [file]
        });
      };

      // Store the share action for the click handler
      shareActionRef.current = shareAction;

      // Trigger a new click on the share button
      if (shareButtonRef.current) {
        shareButtonRef.current.click();
      }
      
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback to download
      if (pdfBlob) {
        downloadFile(pdfBlob);
      }
    } finally {
      setIsSharing(false);
      shareActionRef.current = null;
    }
  }, [pdfBlob, storyData.title, generateStoryBook, downloadFile, handleDownload]);

  // Click handler that executes the stored share action
  const handleShareClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (shareActionRef.current) {
      try {
        await shareActionRef.current();
      } catch (error) {
        console.error('Share execution failed:', error);
        if (pdfBlob) {
          downloadFile(pdfBlob);
        }
      }
      shareActionRef.current = null;
      return;
    }

    handleShare(e);
  }, [handleShare, pdfBlob, downloadFile]);


  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true
  };

  

  return (
    <Box className="max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
          Generate New
        </button>
        
        <button
          onClick={handleNarration}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          disabled={isGeneratingPdf}
        >
          {isPlaying ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Start'} Narration</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          disabled={isGeneratingPdf}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </button>

        {canShare() && (
          <button
            ref={shareButtonRef}
            onClick={handleShareClick}
            disabled={isGeneratingPdf || isSharing}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isGeneratingPdf || isSharing ? 'Preparing...' : 'Share'}
            </span>
          </button>
        )}
      </div>

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

      <Box className="mt-4 p-4 bg-purple-100 rounded-lg shadow">
        <Typography variant="body1" className="text-lg leading-relaxed">
          {storyData.StoryText}
        </Typography>
      </Box>
    </Box>
  );
};

export default StoryDisplay;