import { useState, useCallback } from 'react';

export interface CompanyResult {
  id: string;
  name: string;
  domain?: string;
  description?: string;
}

// Predefined list of common companies to ensure good results
const COMMON_COMPANIES = [
  { id: 'tone', name: 'Tone', domain: 'tone.com', description: 'Social Media Platform' },
  { id: 'google', name: 'Google', domain: 'google.com', description: 'Technology Company' },
  { id: 'microsoft', name: 'Microsoft', domain: 'microsoft.com', description: 'Technology Company' },
  { id: 'apple', name: 'Apple', domain: 'apple.com', description: 'Technology Company' },
  { id: 'amazon', name: 'Amazon', domain: 'amazon.com', description: 'E-commerce & Cloud Computing' },
  { id: 'meta', name: 'Meta', domain: 'meta.com', description: 'Social Media & Technology' },
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', description: 'Streaming Service' },
  { id: 'tesla', name: 'Tesla', domain: 'tesla.com', description: 'Electric Vehicles & Energy' },
  { id: 'uber', name: 'Uber', domain: 'uber.com', description: 'Ridesharing & Delivery' },
  { id: 'airbnb', name: 'Airbnb', domain: 'airbnb.com', description: 'Hospitality Service' },
  { id: 'spotify', name: 'Spotify', domain: 'spotify.com', description: 'Music Streaming' },
  { id: 'linkedin', name: 'LinkedIn', domain: 'linkedin.com', description: 'Professional Network' },
  { id: 'twitter', name: 'Twitter', domain: 'twitter.com', description: 'Social Media Platform' },
  { id: 'freelance', name: 'Freelance', domain: '', description: 'Self-employed' },
  { id: 'startup', name: 'Startup', domain: '', description: 'Early-stage company' },
  { id: 'consultant', name: 'Independent Consultant', domain: '', description: 'Consulting Services' }
];

export const useCompanies = () => {
  const [loading, setLoading] = useState(false);

  const searchCompanies = useCallback(async (query: string): Promise<CompanyResult[]> => {
    if (!query || query.length < 2) {
      return [];
    }

    setLoading(true);
    
    try {
      // Filter from predefined companies first
      const filteredCompanies = COMMON_COMPANIES.filter(company =>
        company.name.toLowerCase().includes(query.toLowerCase()) ||
        company.description?.toLowerCase().includes(query.toLowerCase())
      );

      // Always include "Tone" if it matches or if query is empty
      const toneCompany = COMMON_COMPANIES.find(c => c.id === 'tone');
      if (toneCompany && !filteredCompanies.some(c => c.id === 'tone')) {
        if (query.toLowerCase().includes('tone') || query.toLowerCase().includes('social')) {
          filteredCompanies.unshift(toneCompany);
        }
      }

      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 200));

      // Return top results
      return filteredCompanies.slice(0, 8);
    } catch (error) {
      console.error('Error searching companies:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchCompanies,
    loading
  };
};