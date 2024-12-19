import React, { useEffect, useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { usePdfGeneration } from '../hooks/usePdfGeneration';
import { StoryData } from '../types';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface StoryBookViewerProps {
  story: StoryData;
}

export const StoryBookViewer: React.FC<StoryBookViewerProps> = ({ story }) => {
  const { isGenerating, generateStoryBook } = usePdfGeneration(story);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState(400);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const generationRef = useRef(false);
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const generatePdf = async () => {
      console.log("Current state of generationRef: ", generationRef.current)
      // Check if we've already generated for this story  
      if (generationRef.current) return;
      generationRef.current = true;
      console.log("generationRef set to True")
      try {
        const pdf = await generateStoryBook();
        if (pdf && mounted) {
          // Cleanup previous URL if it exists  
          if (pdfUrlRef.current) {
            URL.revokeObjectURL(pdfUrlRef.current);
          }

          const newUrl = URL.createObjectURL(pdf);
          pdfUrlRef.current = newUrl;
          setPdfUrl(newUrl);
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    };
    console.log("generating story book");
    generatePdf();

    // Cleanup function  
    return () => {
      mounted = false;
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
      generationRef.current = false;
      console.log("generationRef set to False")
    };
  }, [story.id, generateStoryBook]);

  // Responsive page width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setPageWidth(containerRef.current.clientWidth / 2 - 20);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageTurn = (direction: 'next' | 'prev') => {
    if (numPages === null) return;

    if (direction === 'next' && pageNumber + 2 <= numPages) {
      setPageNumber(prev => prev + 2);
    } else if (direction === 'prev' && pageNumber > 1) {
      setPageNumber(prev => Math.max(1, prev - 2));
    }
  };

  const handleCornerClick = (side: 'left' | 'right') => {
    handlePageTurn(side === 'right' ? 'next' : 'prev');
  };

  const touchStartRef = React.useRef<{ startX: number; startY: number }>({
    startX: 0,
    startY: 0
  });

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartRef.current.startX = e.touches[0].clientX;
    touchStartRef.current.startY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current.startX) return;

    const currentX = e.touches[0].clientX;
    const diffX = touchStartRef.current.startX - currentX;

    if (Math.abs(diffX) > 50) {
      handlePageTurn(diffX > 0 ? 'next' : 'prev');
      touchStartRef.current.startX = 0;
    }
  };

  if (isGenerating) {
    return <div className="text-center p-4">Generating PDF...</div>;
  }

  if (!pdfUrl) {
    return <div className="text-center p-4">Loading PDF...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] flex justify-center items-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex justify-center items-center"
      >
        <div className="flex items-center justify-center">
          {/* Left Page */}
          {pageNumber > 0 && numPages && pageNumber <= numPages && (
            <div
              className="relative mr-4 cursor-pointer"
              onClick={() => handleCornerClick('left')}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              <div className="absolute bottom-0 right-0 w-12 h-12 opacity-30 hover:opacity-50">
                <svg viewBox="0 0 24 24" className="text-gray-500">
                  <path
                    fill="currentColor"
                    d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Right Page */}
          {numPages && pageNumber + 1 <= numPages && (
            <div
              className="relative ml-4 cursor-pointer"
              onClick={() => handleCornerClick('right')}
            >
              <Page
                pageNumber={pageNumber + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              <div className="absolute bottom-0 left-0 w-12 h-12 opacity-30 hover:opacity-50">
                <svg viewBox="0 0 24 24" className="text-gray-500">
                  <path
                    fill="currentColor"
                    d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </Document>

      {/* Page Number Indicator */}
      <div className="absolute bottom-4 text-gray-600">
        Page {pageNumber} - {pageNumber + 1} of {numPages || 'N/A'}
      </div>
    </div>
  );
};