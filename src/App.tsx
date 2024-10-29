// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { blue, pink } from '@mui/material/colors';
import StoryGenerator from './components/StoryGenerator';
import StoryDisplay from './components/StoryDisplay' 
import Header from './components/Header';
import './index.css'; 

export interface StoryData {
  title: string;
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
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="container mx-auto py-8">
              <Routes>
                <Route path="/" element={<StoryGenerator />} />
                <Route path="/story" element={<StoryDisplay />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    );
  };

export default App;