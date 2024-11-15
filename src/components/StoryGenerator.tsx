import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, MenuItem, SelectChangeEvent, FormControl, InputLabel, Select, Alert, Snackbar } from '@mui/material';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateStory } from '../services/api';
import { InteractionStatus, InteractionRequiredAuthError } from '@azure/msal-browser';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { IMAGE_STYLES, STORY_LENGTHS, STORY_MODELS, IMAGE_MODELS, STORY_STYLES } from '../constants/config';
import { STORY_CREDIT_COSTS, CREDIT_PACKAGES } from '../constants/credits';
import { tokenRequest } from '../authConfig';
import { ConfirmationDialog, PurchaseDialog } from './CreditDialogs';

export const StoryGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long" | "epic"| "saga">(STORY_LENGTHS.SHORT);
  const [imageStyle, setImageStyle] = useState(IMAGE_STYLES.WHIMSICAL);
  const [storyModel, setStoryModel] = useState(STORY_MODELS.GEMINI_1_5_FLASH);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS.FLUX_SCHNELL);
  const [storyStyle, setStoryStyle] = useState(STORY_STYLES.ADVENTURE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [userCredits, setUserCredits] = useState(15); // Initial credits, in production this should come from backend
  const navigate = useNavigate();
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { isListening, toggleListening, error: speechError } = useSpeechRecognition((transcript) => {
    setTopic(transcript);
  });

  const getRequiredCredits = (length: keyof typeof STORY_CREDIT_COSTS) => {
    return STORY_CREDIT_COSTS[length];
  };

  const handleGenerate = async (isRandom: boolean = false) => {
    if (!isAuthenticated) {
      setError('Please sign in to generate stories');
      return;
    }

    const requiredCredits = getRequiredCredits(storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS);
    
    if (userCredits < requiredCredits) {
      setShowPurchaseDialog(true);
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmGeneration = async () => {
    setShowConfirmDialog(false);
    setError(null);
    setIsLoading(true);

    try {
      const account = instance.getAllAccounts()[0];
      if (!account) {
        throw new Error('No account found');
      }

      let tokenResponse;
      try {
        tokenResponse = await instance.acquireTokenSilent({
          ...tokenRequest,
          account
        });
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          tokenResponse = await instance.acquireTokenRedirect({
            ...tokenRequest,
            account
          });
          return;
        }
        throw error;
      }

      const storyData = await generateStory(topic, storyLength, imageStyle, storyModel, imageModel, storyStyle, tokenResponse.accessToken);
      
      // Deduct credits immediately after successful generation
      const requiredCredits = getRequiredCredits(storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS);
      setUserCredits(prevCredits => {
        const newCredits = prevCredits - requiredCredits;
        console.log(`Credits deducted: ${requiredCredits}, New balance: ${newCredits}`);
        return newCredits;
      });

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

  const handlePurchaseCredits = async (packageId: string) => {
    // In production, this would integrate with a payment system
    const selectedPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (selectedPackage) {
      setUserCredits(prev => {
        const newCredits = prev + selectedPackage.credits;
        console.log(`Credits purchased: ${selectedPackage.credits}, New balance: ${newCredits}`);
        return newCredits;
      });
      setShowPurchaseDialog(false);
    }
  };

  const isButtonDisabled = !isAuthenticated || isLoading || inProgress !== InteractionStatus.None;
  
  return (
    <div className="max-w-4xl mx-auto p-6 pt-36">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-6 text-white">Story Generator</h1>
        <div className="bg-white/80 px-4 py-2 rounded-full">
          <span className="font-medium">Credits: {userCredits}</span>
        </div>
      </div>
    
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
          onChange={(e: SelectChangeEvent<"short" | "medium" | "long" | "epic" | "saga">) => setStoryLength(e.target.value as "short" | "medium" | "long" | "epic" | "saga")}
        >
          {Object.entries(STORY_LENGTHS).map(([key, value]) => (
            <MenuItem key={value} value={value}>
              {key.charAt(0) + key.slice(1).toLowerCase()}
              ({STORY_CREDIT_COSTS[key as keyof typeof STORY_CREDIT_COSTS]} credits)
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
      <FormControl fullWidth margin="normal">
        <InputLabel id="story-style-label">Story Style</InputLabel>
        <Select
          labelId="story-style-label"
          id="story-style"
          value={storyStyle}
          label="story Style"
          onChange={(e: SelectChangeEvent<"adventure">) => setStoryStyle(e.target.value as "adventure")}
        >
          {Object.entries(STORY_STYLES).map(([key, value]) => (
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
          onClick={() => handleGenerate(false)} 
          disabled={isButtonDisabled}
          fullWidth
        >
          {isLoading ? 'Generating...' : `Generate Story (${getRequiredCredits(storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS)} credits)`}
        </Button>
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={handleRandomStory} 
          disabled={isButtonDisabled}
          fullWidth
        >
          {`Random Story (${getRequiredCredits(storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS)} credits)`}
        </Button>
      </div>
      </div>
      <ConfirmationDialog
        open={showConfirmDialog}
        creditsNeeded={getRequiredCredits(storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS)}
        onConfirm={handleConfirmGeneration}
        onClose={() => setShowConfirmDialog(false)}
      />

      <PurchaseDialog
        open={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        onPurchase={handlePurchaseCredits}
        currentCredits={userCredits}
        creditsNeeded={getRequiredCredits(storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS)}
        packages={CREDIT_PACKAGES}
      />
    
    <Snackbar open={!!error || !!speechError} autoHideDuration={6000} onClose={() => setError(null)}>
    <Alert severity="error" onClose={() => setError(null)}>
      {error || speechError}
    </Alert>
  </Snackbar>
</div>
  );
};
