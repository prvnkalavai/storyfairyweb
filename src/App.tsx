import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { StoryGenerator } from './components/StoryGenerator';
import { StoryDisplay } from './components/StoryDisplay';
import AnimatedBackground from './components/AnimatedBackground';

const App: React.FC = () => (
  <Router>
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <Header />
        <Routes>
          <Route path="/" element={<StoryGenerator />} />
          <Route path="/story" element={<StoryDisplay />} />
        </Routes>
      </div>
    </div>
  </Router>
);

export default App;