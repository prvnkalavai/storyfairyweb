import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, MenuItem, SelectChangeEvent, FormControl, InputLabel, Select } from '@mui/material';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateStory } from '../services/api';
import { IMAGE_STYLES, STORY_LENGTHS } from '../constants/config';

export const StoryGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">(STORY_LENGTHS.SHORT);
  const [imageStyle, setImageStyle] = useState(IMAGE_STYLES.WHIMSICAL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { isListening, toggleListening } = useSpeechRecognition((transcript) => {
    setTopic(transcript);
  });

  const handleGenerate = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const storyData = await generateStory(topic, storyLength, imageStyle);
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
      <h1 className="text-3xl font-bold mb-6">Story Generator</h1>

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
          className="ml-2"
          color={isListening ? "secondary" : "primary"}
        >
          {isListening ? <MicOff className="h-10 w-5" /> : <Mic className="h-10 w-5" />}
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

      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleGenerate} 
        disabled={isLoading}
      >
        Generate Story
      </Button>
      <Button 
        variant="outlined" 
        color="secondary" 
        onClick={handleRandomStory} 
        disabled={isLoading} 
        style={{ marginLeft: 10 }}
      >
        Random Story
      </Button>
      {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
    </div>
  );
};
