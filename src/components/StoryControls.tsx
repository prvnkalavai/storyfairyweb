import React from 'react';
import { Download, Share2, MicOff, Mic } from 'lucide-react';

interface StoryControlsProps {
  onNewStory: () => void;
  onNarration: () => void;
  onDownload: () => void;
  onShare?: () => void;
  isPlaying: boolean;
  isDownloading: boolean;
  isSharing: boolean;
  disabled?: boolean;
  loadingAudio?: boolean;
}

export const StoryControls: React.FC<StoryControlsProps> = ({
  onNewStory,
  onNarration,
  onDownload,
  onShare,
  isPlaying,
  isDownloading,
  isSharing,
  disabled,
  loadingAudio = false,
}) => (
  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 mb-4">
    <button
      onClick={onNewStory}
      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
    >
      Generate New
    </button>

    <button
      onClick={onNarration}
      disabled={disabled || loadingAudio}
      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
    >
      {isPlaying ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Start'} Narration</span>
    </button>

    <button
      onClick={onDownload}
      disabled={isDownloading}
      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Download</span>
    </button>

    {onShare && (
      <button
        onClick={onShare}
        disabled={isSharing}
        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Share</span>
      </button>
    )}
  </div>
);
