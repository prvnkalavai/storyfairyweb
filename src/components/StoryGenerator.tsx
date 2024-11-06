import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, MenuItem, SelectChangeEvent, FormControl, InputLabel, Select, Alert, Snackbar } from '@mui/material';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateStory } from '../services/api';
import { IMAGE_STYLES, STORY_LENGTHS, STORY_MODELS, IMAGE_MODELS } from '../constants/config';

export const StoryGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">(STORY_LENGTHS.SHORT);
  const [imageStyle, setImageStyle] = useState(IMAGE_STYLES.WHIMSICAL);
  const [storyModel, setStoryModel] = useState(STORY_MODELS.GEMINI_1_5_FLASH);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS.FLUX_SCHNELL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { isListening, toggleListening, error: speechError } = useSpeechRecognition((transcript) => {
    setTopic(transcript);
  });

  const handleGenerate = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const storyData = await generateStory(topic, storyLength, imageStyle, storyModel, imageModel);
      navigate('/story', { state: { storyData } });
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomStory = () => {
    setTopic('');
    handleGenerate();
  };
  return (
    <div className="max-w-4xl mx-auto p-6 pt-36">
      <h1 className="text-3xl font-bold mb-6 text-white">Story Generator</h1>
      <div className="p-6 bg-white/60 backdrop-blur-sm rounded-lg shadow-lg"> 
      <div className="flex items-center">
      <TextField
            label="Topic (Optional)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            fullWidth
            margin="normal"
            placeholder="Enter a topic or use voice input"
          />
          <Button
            onClick={toggleListening}
            className="ml-2 min-w-[48px] h-14"
            color={isListening ? "secondary" : "primary"}
            disabled={!!speechError}
            title={speechError || 'Toggle voice input'}
          >
            {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
      </div>

      <FormControl fullWidth margin="normal">
        <InputLabel id="story-length-label">Story Length</InputLabel>
        <Select
          labelId="story-length-label"
          id="story-length"
          value={storyLength}
          label="Story Length"
          onChange={(e: SelectChangeEvent<"short" | "medium" | "long">) => setStoryLength(e.target.value as "short" | "medium" | "long")}
        >
          {Object.entries(STORY_LENGTHS).map(([key, value]) => (
            <MenuItem key={value} value={value}>
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel id="image-style-label">Image Style</InputLabel>
        <Select
          labelId="image-style-label"
          id="image-style"
          value={imageStyle}
          label="Image Style"
          onChange={(e: SelectChangeEvent<"whimsical">) => setImageStyle(e.target.value as "whimsical")}
        >
          {Object.entries(IMAGE_STYLES).map(([key, value]) => (
            <MenuItem key={value} value={value}>
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel id="story-model-label">Story Model</InputLabel>
        <Select
          labelId="story-model-label"
          id="story-model"
          value={storyModel}
          label="Story Model"
          onChange={(e: SelectChangeEvent<"gemini">) => setStoryModel(e.target.value as "gemini")}
        >
          {Object.entries(STORY_MODELS).map(([key, value]) => (
            <MenuItem key={value} value={value}>
              {key 
              .split('_')  
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) 
              .join('_')  
              }
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel id="image-model-label">Image Model</InputLabel>
        <Select
          labelId="image-model-label"
          id="image-model"
          value={imageModel}
          label="Image Model"
          onChange={(e: SelectChangeEvent<"flux_schnell">) => setImageModel(e.target.value as "flux_schnell")}
        >
          {Object.entries(IMAGE_MODELS).map(([key, value]) => (
            <MenuItem key={value} value={value}>
              {key 
              .split('_')  
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) 
              .join('_')  
              }
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <div className="mt-6 flex gap-4">
      <Button 
            variant="contained" 
            color="primary" 
            onClick={handleGenerate} 
            disabled={isLoading}
            fullWidth
          >
            {isLoading ? 'Generating...' : 'Generate Story'}
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleRandomStory} 
            disabled={isLoading}
            fullWidth
          >
            Random Story
          </Button>
      </div>
    </div> 
    <Snackbar open={!!error || !!speechError} autoHideDuration={6000} onClose={() => setError(null)}>
    <Alert severity="error" onClose={() => setError(null)}>
      {error || speechError}
    </Alert>
  </Snackbar>
</div>
  );
};
