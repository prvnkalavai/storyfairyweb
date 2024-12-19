import { useState, useCallback, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { StoryData } from '../types';
import { getRandomPattern } from '../utils/patterns';

export const usePdfGeneration = (storyData: StoryData) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const isGeneratingRef = useRef(false);
  const sentences = useMemo(() =>
    storyData.storyText.split(/(?<=[.!?])\s+/),
    [storyData.storyText]
  );

  // Helper function to load images - handles both URL and base64 data  
  const loadImage = (imageSource: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        console.error('Image load error:', error);
        reject(error);
      };

      // If the source starts with data: or blob:, it's already processed  
      if (imageSource.startsWith('blob:')) {
        img.src = imageSource;
      } else if (imageSource.startsWith('data:')) {
        img.src = imageSource;
      }
      else {
        // For URLs (new stories), load directly  
        img.src = imageSource;
      }
    });
  };

  const generateStoryBook = useCallback(async () => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    try {
      const doc = new jsPDF({ format: [210, 210], unit: 'mm' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Helper function to add images to PDF  
      const addImageToPdf = async (imageSource: string | undefined, x: number, y: number, width: number, height: number, opacity: number = 1) => {
        if (!imageSource) return;

        try {
          const img = await loadImage(imageSource);

          if (opacity !== 1) {
            const gState = doc.GState({ opacity: opacity });
            doc.setGState(gState);
          }

          doc.addImage(img, 'PNG', x, y, width, height, undefined, 'NONE');

          if (opacity !== 1) {
            const defaultGState = doc.GState({ opacity: 1 });
            doc.setGState(defaultGState);
          }
        } catch (error) {
          console.error('Failed to load image:', error);
          throw error;
        }
      };

      // Cover page - try imageData first, fall back to URL  
      const frontCover = storyData.coverImages.frontCover;
      const frontCoverImageSource = frontCover?.imageData || frontCover?.url;
      if (frontCoverImageSource) {
        console.log("adding front cover image to pdf", frontCoverImageSource)
        await addImageToPdf(frontCoverImageSource, 0, 0, pageWidth, pageHeight);
      }

      //doc.setFontSize(25);  
      //doc.setFont("Helvetica", "bold");  
      //sdoc.text(storyData.title, pageWidth / 2, 30, { align: 'center' });  

      // Story pages  
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const imageData = storyData.images[i];

        // Left page (text)  
        doc.addPage();

        // Add random background pattern  
        const randomPattern = getRandomPattern();
        console.log("adding random pattern to pdf", randomPattern)
        await addImageToPdf(randomPattern, 0, 0, pageWidth, pageHeight, 0.4);

        // Add text  
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(30);
        doc.setFont("Helvetica", "BoldOblique");
        const textX = 25;
        const textY = pageHeight / 3;
        console.log("adding text to pdf", sentence)
        doc.text(sentence, textX, textY, { align: 'left', maxWidth: pageWidth - 40 });

        // Right page (image) - try imageData first, fall back to imageUrl  
        if (imageData) {
          doc.addPage();
          const imageSource = imageData.imageData || imageData.imageUrl;
          if (imageSource) {
            console.log("adding image[i] to pdf", imageSource)
            await addImageToPdf(imageSource, 0, 0, pageWidth, pageHeight);
          }
        }
      }

      // Rear cover page - try imageData first, fall back to URL  
      doc.addPage();
      const backCover = storyData.coverImages.backCover;
      const rearCoverImageSource = backCover?.imageData || backCover?.url;
      if (rearCoverImageSource) {
        console.log("adding rear cover image to pdf", rearCoverImageSource)
        await addImageToPdf(rearCoverImageSource, 0, 0, pageWidth, pageHeight);
      }

      const pdfOutput = doc.output('blob');
      setPdfBlob(pdfOutput);
      return pdfOutput;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    } finally {
      isGeneratingRef.current = false;
      console.log("PDF generation completed. Cleaning up now.");
    }
  }, [storyData.coverImages, storyData.images, sentences]);

  return { pdfBlob, isGenerating: isGeneratingRef.current, generateStoryBook };
};  