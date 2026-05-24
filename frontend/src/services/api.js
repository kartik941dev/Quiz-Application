import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
// Clean baseURL by removing trailing slashes to prevent dual-slash issues
const cleanBaseURL = rawBaseURL.replace(/\/$/, "");

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
