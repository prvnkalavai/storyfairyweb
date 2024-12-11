import React, { useEffect, useState, useRef } from 'react';    
import { useParams } from 'react-router-dom';    
import { getStoryById } from '../../services/api';    
import { StoryBookViewer } from '../../components/StoryBookViewer';    
import { StoryData } from '../../types';    
import ErrorBoundary from '../../components/ErrorBoundary';    

export const StoryViewerPage: React.FC = () => {    
  const { storyId } = useParams<{ storyId: string }>();    
  const [story, setStory] = useState<StoryData | null>(null);    
  const [loading, setLoading] = useState(true);  
  const fetchRef = useRef(false);   

  useEffect(() => {    
    const fetchStory = async () => {  
      if (fetchRef.current) return;  
        fetchRef.current = true;    
      try {    
        setLoading(true);    
        const fetchedStory = await getStoryById(storyId!);    
        console.log('Fetched story:', fetchedStory);    
        setStory(fetchedStory);    
      } catch (error) {    
        console.error('Error fetching story:', error);    
      } finally {    
        setLoading(false);    
      }    
    };    

    fetchStory();   
    return () => {  
      fetchRef.current = false;  
    };   
  }, [storyId]);    

  if (loading) {    
    return <div>Loading...</div>;    
  }    

  if (!story) {    
    return <div>Story not found</div>;    
  }    

  return (  
    <ErrorBoundary>  
      <StoryBookViewer story={story} />  
    </ErrorBoundary>  
  );  
};  