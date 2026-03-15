import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const googleAuthService = {
  // Get Google OAuth URL
  getGoogleAuthUrl: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/google/url`);
      return response.data;
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      throw error;
    }
  },

  // Handle Google OAuth redirect
  handleGoogleCallback: (token) => {
    if (token) {
      // Store token in localStorage
      localStorage.setItem('token', token);
      return true;
    }
    return false;
  },

  // Initialize Google Sign In
  initiateGoogleSignIn: () => {
    const authUrl = `${API_BASE_URL}/api/auth/google`;
    window.location.href = authUrl;
  }
};
