import React from 'react';
import { StoryCard } from './StoryCard';
import { StoryData } from '../../types';

interface StoryGridProps {
  stories: StoryData[];
  onStoriesChange: (stories: StoryData[]) => void;
}

export const StoryGrid: React.FC<StoryGridProps> = ({ stories, onStoriesChange }) => {
  const handleStoryDelete = (deletedStoryId: string) => {
    onStoriesChange(stories.filter(story => story.id !== deletedStoryId));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {stories.map((story) => (
        <div key={story.id} className="w-full">
          <StoryCard story={story} onDelete={handleStoryDelete} />
        </div>
      ))}
    </div>
  );
};