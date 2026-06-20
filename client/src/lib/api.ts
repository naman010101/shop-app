import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid, handle redirection or clearing of state if necessary
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // Redirection can be handled by contexts or middleware
      }
    }
    return Promise.reject(error);
  }
);
