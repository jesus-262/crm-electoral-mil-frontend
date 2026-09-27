import axios from 'axios';
import { handleAuthError } from '../../axiosConfig.js';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/escrutinio`,
  timeout: 120000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  handleAuthError
);

export async function uploadPdfs(files, existingRecords, tipo) {
  const formData = new FormData();
  files.forEach(f => formData.append('pdfs', f));
  formData.append('existingRecords', JSON.stringify(existingRecords));
  if (tipo) formData.append('tipo', tipo);
  const { data } = await api.post('/upload', formData);
  return data;
}

export async function getRecords(tipo) {
  const params = tipo ? { tipo } : {};
  const { data } = await api.get('/records', { params });
  return data;
}

export async function deleteRecord(id) {
  await api.delete(`/records/${id}`);
}

export async function clearAllRecords() {
  const { data } = await api.delete('/records');
  return data;
}

export async function checkHealth() {
  const { data } = await api.get('/health');
  return data;
}

export function getPdfProxyUrl(cloudinaryUrl) {
  return `${api.defaults.baseURL}/pdf-proxy?url=${encodeURIComponent(cloudinaryUrl)}`;
}

export async function uploadConcejoPdfs(files, existingRecords) {
  const formData = new FormData();
  files.forEach(f => formData.append('pdfs', f));
  formData.append('existingRecords', JSON.stringify(existingRecords));
  const { data } = await api.post('/concejo/upload', formData);
  return data;
}

export async function getConcejoRecords() {
  const { data } = await api.get('/concejo/records');
  return data;
}

export async function deleteConcejoRecord(id) {
  await api.delete(`/concejo/records/${id}`);
}

export async function clearConcejoRecords() {
  const { data } = await api.delete('/concejo/records');
  return data;
}

export function getConcejoPdfProxyUrl(cloudinaryUrl) {
  return `${api.defaults.baseURL}/concejo/pdf-proxy?url=${encodeURIComponent(cloudinaryUrl)}`;
}
