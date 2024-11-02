import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { StoryData } from '../types';
import { getRandomPattern } from '../utils/patterns';

export const usePdfGeneration = (storyData: StoryData) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const sentences = storyData.StoryText.split(/(?<=[.!?])\s+/);
  
  const generateStoryBook = useCallback(async () => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF({
        format: [210, 210],
        unit: 'mm'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Helper function to load images
      const loadImage = (imageUrl: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = imageUrl;
        });
      };

      // Helper function to add images to PDF
      const addImageToPdf = async (imageUrl: string, x: number, y: number, width: number, height: number, opacity: number = 1) => {
        try {
          const img = await loadImage(imageUrl);
          
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
          throw error;
        }
      };
  
      // Cover page - ensure image is loaded before adding
      const coverImageUrl = storyData.images[0]?.imageUrl;
      if (coverImageUrl) {
        await addImageToPdf(coverImageUrl, 0, 0, pageWidth, pageHeight);
      }
      
      doc.setFontSize(25);
      doc.setFont("Helvetica", "bold");
      doc.text(storyData.title, pageWidth / 2, 30, { align: 'center' });
      
      // Story pages - wait for each image to load before proceeding
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
        const textX = 25;
        const textY = pageHeight / 3;
        doc.text(sentence, textX, textY, { align: 'left', maxWidth: pageWidth - 40 });
  
        // Right page (image) - ensure image is loaded before adding
        if (imageData?.imageUrl) {
          doc.addPage();
          await addImageToPdf(imageData.imageUrl, 0, 0, pageWidth, pageHeight);
        }        
      }
      
      // Rear cover page - ensure image is loaded before adding
      doc.addPage();
      const rearCoverImageUrl = storyData.images[0]?.imageUrl;
      if (rearCoverImageUrl) {
        await addImageToPdf(rearCoverImageUrl, 0, 0, pageWidth, pageHeight);
      }

      const pdfOutput = doc.output('blob');
      setPdfBlob(pdfOutput);
      return pdfOutput;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sentences, storyData.images, storyData.title]);

  return { pdfBlob, isGenerating, generateStoryBook };
};