import React, { useEffect } from 'react';
import { Typography, Box, styled, Paper, Button } from '@mui/material';
import { StoryData } from '../App';
import { useLocation, useNavigate } from 'react-router-dom';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css"

const StoryDisplay: React.FC = () => {
    const location = useLocation();
    const { storyData } = location.state as { storyData: StoryData };
    const navigate = useNavigate();
    
    useEffect(() => {
        const speak = async () => {
            if (!storyData || !('speechSynthesis' in window)) {
                console.warn('SpeechSynthesis API not supported in this browser.');
                return; // Exit early if not supported
            }

            // Create a single utterance for the entire story
            const utterance = new SpeechSynthesisUtterance(storyData.StoryText); // Correct text to use.
            speechSynthesis.cancel();
            try {
                await new Promise<void>((resolve, reject) => {       
                    utterance.onend = (ev) => { // Correct type annotation for event parameter.
                        console.log('Speech utterance finished:', ev.type);
                        resolve();
                    };
                    utterance.onerror = (event) => { // onerror expects a SpeechSynthesisErrorEvent
                        console.error('Speech synthesis error:', event.error);
                        resolve();
                    
                    };
                    const voices = window.speechSynthesis.getVoices()
                    if (voices && voices.length>0){
                        utterance.voice = voices.find(voice => voice.name === 'Google US English Female' && voice.lang === 'en-US') || voices[2];
                    }
                    speechSynthesis.speak(utterance); // Correct placement. Speak is called only once.
                });
            } 
            catch (error) {
                console.error("Error during speech synthesis:", error);

            }
        };
        const fetchDataAndSpeak = async () => {
           
            if(storyData){                               
                await speak(); // Speak the story
            }
        }
        fetchDataAndSpeak().catch(error => {
            console.error('Error in fetchDataAndSpeak:', error);
        })
    
         
        return () => {
            if ('speechSynthesis' in window) { //Check if supported before calling cancel
                speechSynthesis.cancel();
            }
        };
    }, [storyData]);

    const sliderSettings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        adaptiveHeight: true,  // Adjust height based on image size

    };
    const handleGenerateNewStory = () => {
        navigate('/')
    }

    if (!storyData ) {  // Check for both
        return <div>Loading story...</div> // Display loading message until both story and image urls are fetched.
    }
    const StyledImageContainer = styled(Paper)(({ theme }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(2),
        margin: 'auto',
        marginBottom: theme.spacing(2), // Add margin at bottom
        maxWidth: 800,
        width: '90%',
    }));
    return (
        <Box sx={{ flexGrow: 1, padding: '20px', justifyContent: 'center', alignItems: 'center' }}> {/* Center content */}
            
            <Slider {...sliderSettings}> {/* Use Slider component from react-slick */}
                {storyData.images.map((image, index) => (
                    <div key={index}> {/* Important: Wrap each slide in a div */}
                        {image.imageUrl ? (
                            <StyledImageContainer elevation={3}>
                                <img
                                    src={image.imageUrl}
                                    alt={`Story illustration ${index + 1}`}
                                    style={{ maxWidth: '100%', maxHeight: 500 }}
                                />
                            </StyledImageContainer>
                        ) : (
                            <p>Loading image...</p>
                        )}
                    </div>
                ))}
            </Slider>
            <Typography variant="h4" component="h1" gutterBottom align="center">
                {storyData.StoryText}
            </Typography>
            <Button variant="contained" color="primary" onClick={handleGenerateNewStory}>
                Generate New Story
            </Button>
        </Box>
    );
};

export default StoryDisplay;
