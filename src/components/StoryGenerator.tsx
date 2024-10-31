import React, { useState, useEffect } from 'react';
import { Button, TextField, MenuItem, Select, SelectChangeEvent, FormControl, InputLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff } from 'lucide-react';

// Define the WebkitSpeechRecognition types
interface IWebkitSpeechRecognition extends EventTarget {
    new (): IWebkitSpeechRecognition;
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((this: IWebkitSpeechRecognition, ev: IWebkitSpeechRecognitionEvent) => any) | null;
    onend: ((this: IWebkitSpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: IWebkitSpeechRecognition, ev: Event) => any) | null;
    onaudiostart: ((this: IWebkitSpeechRecognition, ev: Event) => any) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

interface IWebkitSpeechRecognitionEvent extends Event {
    results: {
        item(index: number): { item(index: number): { transcript: string } };
        [index: number]: { [index: number]: { transcript: string } };
        length: number;
    };
    resultIndex: number;
}

declare global {
    interface Window {
        webkitSpeechRecognition: {
            new (): IWebkitSpeechRecognition;
        };
    }
}

interface StoryGeneratorProps {}

const StoryGenerator: React.FC<StoryGeneratorProps> = () => {
    const [topic, setTopic] = useState('');
    const [storyLength, setStoryLength] = useState('short');
    const [imageStyle, setImageStyle] = useState('whimsical');
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<IWebkitSpeechRecognition | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const {hostname} = window.location;

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognitionInstance = new window.webkitSpeechRecognition();
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            
            recognitionInstance.onresult = (event: IWebkitSpeechRecognitionEvent) => {
                const results = Array.from({ length: event.results.length }, (_, i) => event.results[i]);
                const transcript = results
                    .map(result => result[0].transcript)
                    .join('');
                setTopic(transcript);
            };
            
            recognitionInstance.onend = () => {
                setIsListening(false);
            };
            
            setRecognition(recognitionInstance);
        } else {
            console.warn('Speech recognition is not supported in this browser.');
        }
    }, []);
    
    const handleVoiceInput = () => {
        if (!recognition) return;
        
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            setTopic('');
            recognition.start();
            setIsListening(true);
            
            let silenceTimeout: ReturnType<typeof setTimeout>;
            
            recognition.onaudioend = () => {
                silenceTimeout = setTimeout(() => {
                    recognition.stop();
                }, 3000);
            };
            
            recognition.onaudiostart = () => {
                if (silenceTimeout) clearTimeout(silenceTimeout);
            };
        }
    };

    const handleGenerate = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const localDev = hostname === "localhost"
            const baseUrl = localDev ? `https://storyfairy.azurewebsites.net/api/GenerateStory?code=${process.env.REACT_APP_FUNCTION_KEY}` : '/api/GenerateStory';
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const queryParams = new URLSearchParams({
                topic: topic || '""',
                storyLength: storyLength,
                imageStyle: imageStyle
            });

            const queryUrl = localDev ? `${baseUrl}&${queryParams.toString()}` : `${baseUrl}?${queryParams.toString()}`;
        
            //console.log('API Request URL:', queryUrl);

            const response = await fetch(queryUrl, {
                method: 'POST',
                headers
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    const errorMessage = errorJson.error || errorText;
                    throw new Error(errorMessage);
                } catch(jsonError) {
                    throw new Error(errorText || response.statusText);
                }
            }

            const data = await response.json();

            // Log the complete response data
            //console.log('API Response:', {
            //totalImages: data.images.length,
            //images: data.images,
            //textLength: data.StoryText.length,
            //sentences: data.StoryText.split(/(?<=[.!?])\s+/).length
        //});
            navigate('/story', { state: { storyData: data } });

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

    const handleStoryLengthChange = (event: SelectChangeEvent) => {
        setStoryLength(event.target.value);
    };

    const handleImageStyleChange = (event: SelectChangeEvent) => {
        setImageStyle(event.target.value);
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
                    onClick={handleVoiceInput}
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
                    onChange={handleStoryLengthChange}
                >
                    <MenuItem value="short">Short</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="long">Long</MenuItem>
                </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
                <InputLabel id="image-style-label">Image Style</InputLabel>
                <Select
                    labelId="image-style-label"
                    id="image-style"
                    value={imageStyle}
                    label="Image Style"
                    onChange={handleImageStyleChange}
                >
                    <MenuItem value="whimsical">Whimsical</MenuItem>
                    <MenuItem value="realistic">Realistic</MenuItem>
                    <MenuItem value="animation">Animation</MenuItem>
                    <MenuItem value="disney">Disney</MenuItem>
                    <MenuItem value="pixar">Pixar</MenuItem>
                    <MenuItem value="studioghibli">StudioGhibli</MenuItem>
                    <MenuItem value="anime">Anime</MenuItem>
                    <MenuItem value="fantasy">Fantasy</MenuItem>
                    <MenuItem value="retro">Retro</MenuItem>
                    <MenuItem value="cartoon">Cartoon</MenuItem>
                    <MenuItem value="stopmotion">Stopmotion</MenuItem>
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

export default StoryGenerator;