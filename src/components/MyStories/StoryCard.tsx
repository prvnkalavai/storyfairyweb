import React, { useState } from 'react';
import { Story } from '../../types/story';
import { deleteStory } from '../../services/api';
import { Trash2 } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  onDelete: (storyId: string) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, onDelete }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get the image source - either imageData (blob URL) or fallback to original url
  const imageSource = story.coverImages?.frontCover?.imageData || 
                     story.coverImages?.frontCover?.url

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteStory(story.id);
      onDelete(story.id);
    } catch (error) {
      console.error('Error deleting story:', error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div>
      {/* Story Card */}
      <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden h-full flex flex-col relative">
        {/* Cover Image */}
        <div className="h-48 w-full overflow-hidden">
          <img 
            src={imageSource}
            alt={story.title}                         
            className="w-full h-full object-cover"
          />
        </div>

        {/* Card Content */}
        <div className="p-4 flex-grow flex flex-col">
          <h2 className="text-lg font-semibold mb-2 line-clamp-2">
            {story.title}
          </h2>
          <p className="text-sm text-gray-500">
            Created: {new Date(story.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Delete Button */}
        <button 
          onClick={() => setDeleteDialogOpen(true)}
          className="absolute top-2 right-2 bg-white/80 hover:bg-white/90 rounded-full p-2 shadow-sm transition-colors"
        >
          <Trash2 className="w-5 h-5 text-red-500" />
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Delete Story</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{story.title}"? This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-2">
                <button 
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};