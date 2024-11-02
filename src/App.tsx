import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { StoryGenerator } from './components/StoryGenerator';
import { StoryDisplay } from './components/StoryDisplay';

const App: React.FC = () => (
  <Router>
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        <Route path="/" element={<StoryGenerator />} />
        <Route path="/story" element={<StoryDisplay />} />
      </Routes>
    </div>
  </Router>
);

export default App;