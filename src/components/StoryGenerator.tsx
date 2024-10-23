// src/components/StoryGenerator.tsx
import React, { useState, ChangeEvent } from 'react';
import { Button, TextField, MenuItem, Select, SelectChangeEvent, FormControl, InputLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // For navigation

interface StoryGeneratorProps {

}

const StoryGenerator: React.FC<StoryGeneratorProps> = () => {
    const [topic, setTopic] = useState('');
    const [storyLength, setStoryLength] = useState('short'); // Default story length
    const [imageStyle, setImageStyle] = useState('whimsical'); // Default image style
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const {hostname} = window.location;


    const handleGenerate = async () => {
        setError(null);
        setIsLoading(true);
        try {
            // Use /api/GenerateStory for Azure Static Web Apps. 
            // Use http://localhost:7071/api/GenerateStory for local testing
            const localDev = hostname === "localhost"
            const apiUrl = localDev ? `https://storyfairy.azurewebsites.net/api/GenerateStory?code=${process.env.REACT_APP_FUNCTION_KEY}` : '/api/GenerateStory';
            const headers = {
                'Content-Type': 'application/json'
              };
              
            console.log("API Endpoint: ", apiUrl);
            console.log("Topic: ", topic);
            console.log("Story Length: ", storyLength);
            console.log("Image Style: ", imageStyle);
              
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({ topic: topic || '""', storyLength, imageStyle }),
            });
                        
            if (!response.ok) {
                const errorText = await response.text();
                try{
                    const errorJson = JSON.parse(errorText);
                    const errorMessage = errorJson.error || errorText;
                    throw new Error(errorMessage);
                } catch(jsonError){
                    throw new Error(errorText || response.statusText);
                }
            }

            const data = await response.json();

            navigate('/story', { state: { storyData: data } }) // Navigate with state

        } catch (error) {
            console.error('Error:', error);
            setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
        }finally {
            setIsLoading(false); // Set loading to false after request finishes, irrespective of success or failure. Enable the button.
        }
    };

    const handleRandomStory = () => {
        setTopic(''); // Clear the topic input
        handleGenerate(); // Call handleGenerate with empty topic
    };

    const handleTopicChange = (event: ChangeEvent<HTMLInputElement>) => {
        setTopic(event.target.value);
    };

    const handleStoryLengthChange = (event: SelectChangeEvent) => {
        setStoryLength(event.target.value);
    };

    const handleImageStyleChange = (event: SelectChangeEvent) => {
        setImageStyle(event.target.value);
    };

    return (
        <div> {/* Use a div for the container */}
            <h1>Story Generator</h1>

            <TextField
                label="Topic (Optional)"
                value={topic}
                onChange={handleTopicChange}
                fullWidth
                margin="normal"
                placeholder="Enter a topic or leave blank for random"
            />

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



            <Button variant="contained" color="primary" onClick={handleGenerate} disabled={isLoading}> {/* Disable button if loading */}
                Generate Story
            </Button>
            <Button variant="outlined" color="secondary" onClick={handleRandomStory} disabled={isLoading} style={{ marginLeft: 10 }}>
                Random Story
            </Button>
            {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>} {/* Error display */}
        </div>
    );

};

export default StoryGenerator;