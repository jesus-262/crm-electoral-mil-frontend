import axios from 'axios';

export function handleAuthError(error) {
  const status = error.response?.status;

  if (status === 401) {
    localStorage.removeItem('token');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // 🔒 Sesión cortada por bloqueo global (Líderes y Sublíderes).
  // Guardamos el motivo para que el login lo muestre al llegar.
  if (status === 403 && error.response?.data?.code === 'ACCESO_BLOQUEADO') {
    localStorage.removeItem('token');

    const mensaje =
      error.response?.data?.message ||
      'El acceso a la plataforma está cerrado. Contacta al administrador.';

    try {
      sessionStorage.setItem('mensajeBloqueo', mensaje);
    } catch (e) {
      // sessionStorage puede fallar en modo privado; no es crítico.
    }

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
