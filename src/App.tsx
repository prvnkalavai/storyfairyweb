// src/App.tsx
import React from 'react';
import StoryGenerator from './components/StoryGenerator';
import StoryDisplay from './components/StoryDisplay' 
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { blue, pink } from '@mui/material/colors';

export interface StoryData {
  StoryText: string;
  storyUrl: string;
  detailedStoryUrl: string;
  images: { imageUrl: string; prompt: string }[];
  imageContainerName: string;
  blobStorageConnectionString: string;
}

const theme = createTheme({
    palette: {
      primary: blue,
      secondary: pink,
    },
  });

const App: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <Router>
                <Routes>
                    <Route path="/" element={<StoryGenerator />} />
                    <Route path="/story" element={<StoryDisplay />} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;