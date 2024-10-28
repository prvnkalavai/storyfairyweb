import React, { useState, useEffect, useRef } from 'react';
import { Typography, Box, Button } from '@mui/material';
import { Download, Share2, MicOff, Mic } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Slider from "react-slick";
import { jsPDF } from "jspdf";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const StoryDisplay = () => {
  const location = useLocation();
  const { storyData } = location.state;
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Split story text into sentences
  const sentences = storyData.StoryText.split(/(?<=[.!?])\s+/);
   
 
  useEffect(() => {
    if ('speechSynthesis' in window) {
      utteranceRef.current = new SpeechSynthesisUtterance();
      
      utteranceRef.current.onboundary = (event) => {
        if (event.name === 'sentence') {
          const currentSentenceIndex = Math.floor(event.charIndex / (storyData.StoryText.length / sentences.length));
          if (sliderRef.current) {
            (sliderRef.current as Slider).slickGoTo(currentSentenceIndex); 
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
        utteranceRef.current.text = storyData.StoryText as string;
        const voices = window.speechSynthesis.getVoices();
        utteranceRef.current.voice = voices.find(voice => voice.name === 'Google US English Female') || voices[0];
        window.speechSynthesis.speak(utteranceRef.current);
        setIsPlaying(true);
      }
    }
  };

  const generateStoryBook = async () => {
    try {
      const doc = new jsPDF({
        format: [210, 210], // Half letter size in mm (8.2 x 8.2 inches)
        unit: 'mm'
      });
  
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
  
      const addImageToPdf = async (imageUrl: string, x: number, y: number, width: number, height: number) => {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = imageUrl;
          await new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = reject;
          });
          doc.addImage(img, 'PNG', x, y, width, height);
        } catch (error) {
          console.error('Failed to load image:', error);
        }
      };
  
      // Cover page
      const coverImageUrl = storyData.images[0].imageUrl;
      if (coverImageUrl) {
        await addImageToPdf(coverImageUrl, 0, 0, pageWidth, pageHeight); // Fit image to full page with top and bottom margin
      }
      doc.setFontSize(24);
      doc.text("My Story", pageWidth / 2, pageHeight / 2, { align: 'center' });
  
      // Story pages
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const imageData = storyData.images[i];
  
        // Left page (text)
        doc.addPage();
        const textX = 20;
        const textY = pageHeight / 2;
        doc.setFontSize(16);
        doc.text(sentence, textX, textY, { align: 'left', maxWidth: pageWidth - 40 });
  
        // Right page (image)
        if (imageData && imageData.imageUrl) {
          doc.addPage();
          await addImageToPdf(imageData.imageUrl, 0, 0, pageWidth, pageHeight); // Fit image to full page with top and bottom margin
        }
      }
  
      doc.save('my-story.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };
  

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Story',
          text: storyData.StoryText,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    beforeChange: (_: any, next: React.SetStateAction<number>) => setCurrentSlide(next)
  };

  return (
    <Box className="max-w-4xl mx-auto p-6">
      <div className="flex justify-end gap-4 mb-6">
        <Button 
          variant="contained" 
          onClick={handleNarration}
          startIcon={isPlaying ? <MicOff /> : <Mic />} 
        >
          {isPlaying ? 'Stop Narration' : 'Start Narration'}
        </Button>
        <Button 
          variant="contained" 
          onClick={generateStoryBook}
          startIcon={<Download />}
        >
          Download Story Book
        </Button>
        <Button 
          variant="contained" 
          onClick={handleShare}
          startIcon={<Share2 />}
        >
          Share Story
        </Button>
      </div>

      <Slider ref={sliderRef} {...sliderSettings}>
        {storyData.images.map((image: { imageUrl: string | undefined; }, index: number) => (
          <div key={index} className="p-4">
            <img
              src={image.imageUrl}
              alt={`Story illustration ${index + 1}`}
              className="max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        ))}
      </Slider>

      <Box className="mt-6 p-4 bg-white rounded-lg shadow">
        <Typography variant="body1" className="text-lg leading-relaxed">
          {storyData.StoryText}
        </Typography>
      </Box>

      <Button 
        variant="contained" 
        onClick={() => navigate('/')}
        className="mt-6"
      >
        Generate New Story
      </Button>
    </Box>
  );
};

export default StoryDisplay;
