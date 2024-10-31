import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography, Box } from '@mui/material';
import { Download, Share2, MicOff, Mic } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Slider from "react-slick";
import { jsPDF } from "jspdf";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import dots from '../assets/dots.png';
import stars from '../assets/stars.png';
import clouds from '../assets/clouds.png';
import bubbles from '../assets/bubbles.png';
import balloons from '../assets/balloons.png';
import lines from '../assets/lines.png';
import leaves from '../assets/leaves.png';
import arrows from '../assets/arrows.png';
import rockets from '../assets/rockets.png';
import hearts from '../assets/hearts.png';
import planets from '../assets/planets.png';
import shapes from '../assets/shapes.png';
import keys from '../assets/keys.png';
import candy from '../assets/candy.png';
import ribbons from '../assets/ribbons.png';
import flowers from '../assets/flowers.png';
import school from '../assets/school.png';
import whales from '../assets/whales.png';
import purple from '../assets/purple.png';

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
  dots: dots,
  stars: stars,
  clouds: clouds,
  bubbles: bubbles,
  balloons: balloons,
  lines: lines,
  leaves: leaves,
  arrows: arrows,
  rockets: rockets,
  hearts: hearts,
  planets: planets,
  shapes: shapes,
  keys: keys,
  candy: candy,
  ribbons: ribbons,
  flowers: flowers,
  school: school,
  whales: whales,
  purple: purple
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
  const sentences = storyData.StoryText.split(/(?<=[.!?])\s+/);
  const currentSentenceIndexRef = useRef<number>(0);

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
        currentSentenceIndexRef.current = 0;
      };
      
      // Enhanced boundary detection for mobile Chrome
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

      // Fallback for mobile Chrome using word boundaries
      utteranceRef.current.onmark = () => {
        if (sliderRef.current) {
          sliderRef.current.slickGoTo(currentSentenceIndexRef.current);
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
    } else {
      if (utteranceRef.current) {
        // Add SSML marks for better mobile Chrome sync
        const ssmlText = sentences.map((sentence, index) => 
          `${sentence}`
        ).join(' ');
        
        utteranceRef.current.text = ssmlText;
        const voices = window.speechSynthesis.getVoices();
        utteranceRef.current.voice = voices.find(voice => voice.name === 'Google US English Female') || voices[2];
        window.speechSynthesis.speak(utteranceRef.current);
        setIsPlaying(true);
      }
    }
  }, [isPlaying, sentences]);

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
      //setPdfBlob(pdfOutput);
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
      setIsGeneratingPdf(true);
      const newPdfBlob = await generateStoryBook();
      setIsGeneratingPdf(false);
      if (newPdfBlob) {
        setPdfBlob(newPdfBlob);
        downloadFile(newPdfBlob);
      }
    }

  }, [pdfBlob, downloadFile, generateStoryBook]);

  const handleShare = useCallback(async () => {
    if (!canShare()) {
      handleDownload();
      return;
    }

    try {
      setIsSharing(true);
      let shareableBlob = pdfBlob;

      if (!shareableBlob) {
        setIsGeneratingPdf(true);
        shareableBlob = await generateStoryBook();
        if (shareableBlob) {
          setPdfBlob(shareableBlob);
        }
        setIsGeneratingPdf(false);
      }

      if (!shareableBlob) {
        throw new Error('Failed to generate PDF');
      }

      const file = new File([shareableBlob], `${storyData.title}.pdf`, { 
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
  }, [pdfBlob, storyData.title, generateStoryBook, downloadFile, handleDownload]);

  // Pre-generate PDF when component mounts
  useEffect(() => {
    const generateInitialPDF = async () => {
      try {
        setIsGeneratingPdf(true);
        const blob = await generateStoryBook();
        if (blob) {
          setPdfBlob(blob);
          setIsGeneratingPdf(false);
        }
      } catch (error) {
        console.error('Error generating initial PDF:', error);
      } finally {
        setIsGeneratingPdf(false);
      }
    };

    generateInitialPDF();
  }, [generateStoryBook]);
  
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
        >
          {isPlaying ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Start'} Narration</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          //disabled={isGeneratingPdf}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </button>

        {canShare() && (
          <button
            onClick={handleShare}
            disabled={isGeneratingPdf && isSharing}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {(isGeneratingPdf || isSharing) ? 'Share' : 'Share'}
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