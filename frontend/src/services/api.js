import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// 1. Clean trailing slashes
let cleanBaseURL = rawBaseURL.trim().replace(/\/+$/, "");

// 2. Self-Healing Prefix Resolution: Ensure it ends with '/api' for MERN routes
if (!cleanBaseURL.endsWith('/api')) {
  console.warn('⚠️ Centralized API: VITE_API_URL is missing the "/api" suffix. Appending "/api" dynamically to ensure route synchronization.');
  cleanBaseURL = cleanBaseURL + '/api';
}

console.log('🔌 Centralized API: Initialized with baseURL:', cleanBaseURL);

const api = axios.create({
  baseURL: cleanBaseURL,
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
