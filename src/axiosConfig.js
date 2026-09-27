import axios from 'axios';

export function handleAuthError(error) {
  const status = error.response?.status;
  if (status === 401) {
    localStorage.removeItem('token');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
}

axios.interceptors.response.use(
  (response) => response,
  handleAuthError
);

export default axios;
