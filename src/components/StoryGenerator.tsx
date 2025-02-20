import React, { useState, useEffect } from 'react';
import { Howl } from 'howler';
import { Music, Volume2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, TextField, MenuItem, SelectChangeEvent, FormControl, InputLabel, Select, Alert, Snackbar } from '@mui/material';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateStory } from '../services/api';
import { InteractionStatus, InteractionRequiredAuthError } from '@azure/msal-browser';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { IMAGE_STYLES, STORY_LENGTHS, STORY_MODELS, IMAGE_MODELS, STORY_THEMES, VOICES } from '../constants/config';
import { tokenRequest } from '../authConfig';
import InfoIcon from '@mui/icons-material/Info';
import IconButton from '@mui/material/IconButton';
import HelpDialog from './HelpDialog';
import { getUserCredits, deductCredits } from '../services/creditService';
import { STORY_CREDIT_COSTS, CREDIT_PACKAGES } from '../constants/credits';
import { ConfirmationDialog, PurchaseDialog } from './CreditDialogs';
import { useSubscription } from '../context/SubscriptionContext';

export const StoryGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long" | "epic" | "saga">(STORY_LENGTHS.SHORT);
  const [imageStyle, setImageStyle] = useState(IMAGE_STYLES.WHIMSICAL);
  const [storyModel, setStoryModel] = useState(STORY_MODELS.GEMINI_1_5_FLASH);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS.FLUX_SCHNELL);
  const [storyTheme, setStoryTheme] = useState(STORY_THEMES.ADVENTURE);
  const [voiceName, setVoiceName] = useState<typeof VOICES[keyof typeof VOICES]>(VOICES.Ava_US);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { isListening, toggleListening, error: speechError } = useSpeechRecognition((transcript) => {
    setTopic(transcript);
  });
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const getRequiredCredits = (length: keyof typeof STORY_CREDIT_COSTS) => {
    return STORY_CREDIT_COSTS[length];
  };
  const [openHelpDialog, setOpenHelpDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState<{ title: string; content: React.ReactNode }>({
    title: '',
    content: ''
  });
  const location = useLocation();
  const [musicPlayer, setMusicPlayer] = useState<Howl | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const { subscription } = useSubscription();
  const [referenceImage, setReferenceImage] = useState<File | null>(null);


  useEffect(() => {
    // Initialize music player on component mount
    const sound = new Howl({
      src: ["./sounds/ForestLullabye_AsherFulero.mp3"],
      loop: true,
      volume: 0.1,
    });

    setMusicPlayer(sound);

    // Cleanup function to stop music when component unmounts
    return () => {
      sound.stop();
      sound.unload();
    };
  }, []);

  const toggleMusic = () => {
    if (musicPlayer) {
      if (isMusicPlaying) {
        musicPlayer.pause();
        setIsMusicPlaying(false);
      } else {
        musicPlayer.play();
        setIsMusicPlaying(true);
      }
    }
  };

  useEffect(() => {
    // Check for payment-related state
    const state = location.state as {
      paymentSuccess?: boolean,
      paymentError?: string,
      paymentCancelled?: boolean,
      sessionId?: string
    };

    if (state?.paymentSuccess) {
      // Show success message
      setError('Payment successful!');
    }

    if (state?.paymentError) {
      // Show error message
      setError(state.paymentError);
    }

    if (state?.paymentCancelled) {
      // Show cancellation message
      setError('Payment was cancelled');
    }

    // Optional: Clear the state to prevent showing the same message multiple times
    window.history.replaceState({}, document.title);
  }, [location]);

  // Add this effect to fetch user credits on component mount
  useEffect(() => {
    const fetchCredits = async () => {
      if (isAuthenticated) {
        try {
          console.log("About to getUserCredits")
          const credits = await getUserCredits();
          setUserCredits(credits);
        } catch (error) {
          console.error('Failed to fetch credits:', error);
          setError('Failed to fetch credits');
        }
      }
    };

    fetchCredits();
  }, [isAuthenticated]);

  const handleGenerate = async (isRandom: boolean = false) => {
    if (!isAuthenticated) {
      setError('Please sign in to generate stories');
      return;
    }

    const requiredCredits = getRequiredCredits(storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS);

    if (userCredits != null && userCredits < requiredCredits) {
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
      //console.log('Token response:', tokenResponse);

      const storyData = await generateStory(topic, storyLength, imageStyle, storyModel, imageModel, storyTheme, voiceName, tokenResponse.accessToken);

      // Deduct credits immediately after successful generation
      const requiredCredits = getRequiredCredits(storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS);
      try {
        const newBalance = await deductCredits(
          requiredCredits,
          `Story generation - ${storyLength} length story`
        );

        // Update the credits display
        setUserCredits(newBalance);

        // Navigate to story page
        navigate('/story', {
          state: {
            storyData: {
              ...storyData,
              voiceName
            }
          }
        });
      } catch (error) {
        console.error('Failed to deduct credits:', error);
        setError('Story was generated but failed to deduct credits. Please contact support.');
        // You might want to log this situation for administrative review
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Topic/Story flagged")) {
        setStoryError(error.message)
      } else {
        setStoryError("An unexpected error occurred during story generation. Please try again.")
      }
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
    try {
      const selectedPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
      if (!selectedPackage) {
        throw new Error('Invalid Package Selected');
      }
      setUserCredits(prevCredits => {
        if (prevCredits === null) return selectedPackage.credits;
        return prevCredits + selectedPackage.credits;
      });
      setShowPurchaseDialog(false);
    } catch (error) {
      console.error('Error purchasing credits:', error);
      setError('Failed to purchase credits');
    }
  };

  const handleHelpClick = (modelType: 'topic' | 'story' | 'image') => {
    let title = '';
    let content: React.ReactNode = '';

    if (modelType === 'story') {
      title = 'Story Models';
      content = (
        <div className="space-y-4">
          <p><strong>Gemini 1.5 Flash:</strong> Optimized for quick, creative storytelling with consistent narrative flow.</p>
          <p><strong>GPT-4o Turbo:</strong> Advanced model for complex, detailed stories with rich character development.</p>
          <p><strong>Grok:</strong> Specialized in interactive and engaging narrative experiences.</p>
          <p>Choose based on your story's complexity and desired detail level.</p>
        </div>
      );
    } else if (modelType === 'image') {
      title = 'Image Models';
      content = (
        <div className="space-y-4">
          <p><strong>Flux Schnell:</strong> Fast image generation with good quality and consistency.</p>
          <p><strong>Stable Diffusion:</strong> High-quality, detailed images with excellent style consistency.</p>
          <p><strong>Flux Pro:</strong> Creative and artistic images with strong adherence to prompts.</p>
          <p>Choose based on your desired image quality and style preferences.</p>
        </div>
      );
    } else if (modelType === 'topic') {
      title = 'Topic';
      content = (
        <div className="space-y-4">
          <p><strong>Topic</strong> Provide or narrate a topic of your choice for the story (Optional).</p>
          <p><strong>Generate Story</strong> Click 'Generate Story' to breath life into your topic in the form of a bedtime story.</p>
          <p><strong>Random Story</strong> Click 'Random Story' to let AI take the wheel and generate a random bedtime story.</p>
          <p>Choose based on your desired preference for the story.</p>
        </div>
      );
    }

    setDialogContent({ title, content });
    setOpenHelpDialog(true);
  };



  const isButtonDisabled = !isAuthenticated || isLoading || inProgress !== InteractionStatus.None;

  return (
    <div className="max-w-4xl mx-auto p-6 pt-36">
      {storyError ? (
        <Alert
          severity="error"
          onClose={() => setStoryError(null)}
          className="mb-4"
        >
          {storyError}
        </Alert>
      ) : null}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-6 text-white">Story Generator</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleMusic}
            className={`
              relative w-12 h-12 flex items-center justify-center 
              transform transition-all duration-300 ease-in-out
              ${isMusicPlaying
                ? "animate-pulse text-yellow-400"
                : "text-gray-500 hover:text-yellow-500"
              }
            `}
            title={isMusicPlaying ? "Pause Music" : "Play Music"}
          >
            {isMusicPlaying ? (
              <Music className="z-10 w-7 h-7" />
            ) : (
              <Volume2 className="z-10 w-7 h-7" />
            )}
          </button>

          {userCredits !== null && (
            <div className="bg-white/80 px-4 py-2 rounded-full">
              <span className="font-medium">Credits: {userCredits}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg">
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
            title={speechError || "Toggle voice input"}
          >
            {isListening ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          <IconButton
            onClick={() => handleHelpClick("topic")}
            size="small"
            sx={{
              position: "absolute",
              right: -6,
              top: "10%",
              transform: "translateY(-50%)",
              color: "primary.main",
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </div>

        <FormControl fullWidth margin="normal">
          <InputLabel id="story-length-label">Story Length</InputLabel>
          <Select
            labelId="story-length-label"
            id="story-length"
            value={storyLength}
            label="Story Length"
            onChange={(
              e: SelectChangeEvent<"short" | "medium" | "long" | "epic" | "saga">
            ) =>
              setStoryLength(
                e.target.value as "short" | "medium" | "long" | "epic" | "saga"
              )
            }
          >
            {Object.entries(STORY_LENGTHS).map(([key, value]) => (
              <MenuItem key={value} value={value}>
                {key.charAt(0) + key.slice(1).toLowerCase()}(
                {STORY_CREDIT_COSTS[key as keyof typeof STORY_CREDIT_COSTS]}{" "}
                credits)
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
            onChange={(e: SelectChangeEvent<"whimsical">) =>
              setImageStyle(e.target.value as "whimsical")
            }
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
            onChange={(e: SelectChangeEvent<"gemini">) =>
              setStoryModel(e.target.value as "gemini")
            }
          >
            {Object.entries(STORY_MODELS).map(([key, value]) => (
              <MenuItem key={value} value={value}>
                {key
                  .split("_")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  )
                  .join("_")}
              </MenuItem>
            ))}
          </Select>
          <IconButton
            onClick={() => handleHelpClick("story")}
            size="small"
            sx={{
              position: "absolute",
              right: -30,
              top: "50%",
              transform: "translateY(-50%)",
              color: "primary.main",
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel id="image-model-label">Image Model</InputLabel>
          <Select
            labelId="image-model-label"
            id="image-model"
            value={imageModel}
            label="Image Model"
            onChange={(e: SelectChangeEvent<"flux_schnell">) =>
              setImageModel(e.target.value as "flux_schnell")
            }
          >
            {Object.entries(IMAGE_MODELS).map(([key, value]) => (
              <MenuItem key={value} value={value}>
                {key
                  .split("_")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  )
                  .join("_")}
              </MenuItem>
            ))}
          </Select>
          <IconButton
            onClick={() => handleHelpClick("image")}
            size="small"
            sx={{
              position: "absolute",
              right: -30,
              top: "50%",
              transform: "translateY(-50%)",
              color: "primary.main",
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel id="story-theme-label">Story Theme</InputLabel>
          <Select
            labelId="story-theme-label"
            id="story-theme"
            value={storyTheme}
            label="story Theme"
            onChange={(e: SelectChangeEvent<"adventure">) =>
              setStoryTheme(e.target.value as "adventure")
            }
          >
            {Object.entries(STORY_THEMES).map(([key, value]) => (
              <MenuItem key={value} value={value}>
                {key
                  .split("_")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  )
                  .join("_")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel id="voice-name-label">Voice Name</InputLabel>
          <Select
            labelId="voice-name-label"
            id="voice-name"
            value={voiceName}
            label="voice Name"
            onChange={(e: SelectChangeEvent) =>
              setVoiceName(e.target.value as typeof VOICES[keyof typeof VOICES])
            }
          >
            {Object.entries(VOICES).map(([key, value]) => (
              <MenuItem key={value} value={value}>
                {key
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
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
            {isLoading
              ? "Generating..."
              : `Generate Story (${getRequiredCredits(
                storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS
              )} credits)`}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleRandomStory}
            disabled={isButtonDisabled}
            fullWidth
          >
            {`Random Story (${getRequiredCredits(
              storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS
            )} credits)`}
          </Button>
        </div>
        {subscription.isSubscribed && (
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-lg shadow-lg mt-4">
            <h3 className="text-lg font-semibold mb-2">Personalize Your Story</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a photo to make your child the hero of the story!
            </p>
            <input
              title ="image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setReferenceImage(file);
                }
              }}
              className="w-full"
            />
            {referenceImage && (
              <div className="mt-4">
                <img
                  src={URL.createObjectURL(referenceImage)}
                  alt="Preview"
                  className="max-w-xs mx-auto rounded-lg"
                />
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmationDialog
        open={showConfirmDialog}
        creditsNeeded={getRequiredCredits(
          storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS
        )}
        onConfirm={handleConfirmGeneration}
        onClose={() => setShowConfirmDialog(false)}
      />

      <PurchaseDialog
        open={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        onPurchase={handlePurchaseCredits}
        currentCredits={userCredits ?? 0}
        creditsNeeded={getRequiredCredits(
          storyLength.toUpperCase() as keyof typeof STORY_CREDIT_COSTS
        )}
        packages={CREDIT_PACKAGES}
      />

      <Snackbar
        open={!!error || !!speechError}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error || speechError}
        </Alert>
      </Snackbar>
      <HelpDialog
        open={openHelpDialog}
        onClose={() => setOpenHelpDialog(false)}
        title={dialogContent.title}
        content={dialogContent.content}
      />
    </div>
  );
};
