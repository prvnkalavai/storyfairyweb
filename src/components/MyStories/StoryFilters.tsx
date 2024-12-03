import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';

interface StoryFiltersProps {
  filters: {
    dateRange: [Dayjs | null, Dayjs | null];
    storyLength: string;
    style: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  onFilterChange: (filters: StoryFiltersProps['filters']) => void;
}

export const StoryFilters: React.FC<StoryFiltersProps> = ({ filters, onFilterChange }) => {
  const handleFromDateChange = (newFromDate: Dayjs | null) => {
    onFilterChange({ 
      ...filters, 
      dateRange: [newFromDate, filters.dateRange[1]] 
    });
  };

  const handleToDateChange = (newToDate: Dayjs | null) => {
    onFilterChange({ 
      ...filters, 
      dateRange: [filters.dateRange[0], newToDate] 
    });
  };

  const handleSelectChange = (key: keyof Omit<StoryFiltersProps['filters'], 'dateRange'>) => 
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFilterChange({ 
        ...filters, 
        [key]: e.target.value 
      });
    };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="bg-white shadow-md rounded-lg p-40">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <DatePicker
                label="From Date"
                value={filters.dateRange[0]}
                onChange={handleFromDateChange}
                slots={{ textField: (props) => (
                  <input 
                    {...props} 
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}}
              />
            </div>
            <div className="flex-1">
              <DatePicker
                label="To Date"
                value={filters.dateRange[1]}
                onChange={handleToDateChange}
                slots={{ textField: (props) => (
                  <input 
                    {...props} 
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}}
              />
            </div>
          </div>

          <div>
            <label htmlFor="story-length" className="block text-sm font-medium text-gray-700">
              Story Length
            </label>
            <select
              id="story-length"
              value={filters.storyLength}
              onChange={handleSelectChange('storyLength')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">All</option>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>

          <div>
            <label htmlFor="story-style" className="block text-sm font-medium text-gray-700">
              Style
            </label>
            <select
              id="story-style"
              value={filters.style}
              onChange={handleSelectChange('style')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">All</option>
              <option value="whimsical">Whimsical</option>
              <option value="adventure">Adventure</option>
              <option value="educational">Educational</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700">
              Sort By
            </label>
            <select
              id="sort-by"
              value={filters.sortBy}
              onChange={handleSelectChange('sortBy')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="createdAt">Date Created</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700">
              Order
            </label>
            <select
              id="sort-order"
              value={filters.sortOrder}
              onChange={handleSelectChange('sortOrder')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>
    </LocalizationProvider>
  );
};