import axios from 'axios';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept requests to attach Bearer Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses for token expiration handling
api.interceptors.response.use((response) => response, (error) => {
  if (error.response && error.response.status === 401) {
    // If unauthorized, clean invalid token
    if (localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

export default api;
