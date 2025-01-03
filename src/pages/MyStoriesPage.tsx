// src/pages/MyStories.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, CircularProgress, Button } from '@mui/material';
import { StoryGrid } from '../components/MyStories/StoryGrid';
import { StoryFilters } from '../components/MyStories/StoryFilters';
import { StoryData } from '../types';
import { getUserStories } from '../services/api';
import { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';

export const MyStories: React.FC = () => {
  const [stories, setStories] = useState<StoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateRange: [null, null] as [Dayjs | null, Dayjs | null], 
    storyLength: '',
    style: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const navigate = useNavigate();

  
  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching stories with filters:', filters);
      const response = await getUserStories(filters);
      setStories(response.stories);
      setError(null);
    } catch (err) {
      setError('Failed to fetch stories. Please try again later.');
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-40">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">My Stories</h1>
        <Button variant="contained" color="primary" onClick={() => navigate("/")}>Create New Story</Button>
      </div>

      {error && (
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
      )}

      <StoryFilters filters={filters} onFilterChange={handleFilterChange} />
      <StoryGrid stories={stories} onStoriesChange={setStories} />
    </div>
  );
};