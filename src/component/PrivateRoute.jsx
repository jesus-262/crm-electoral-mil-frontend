import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/login" replace />;

  try {
    const decoded = jwtDecode(token);

    // Token expirado (exp viene en segundos) → limpiar y volver al login
    if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }

    // Verificar si el rol del usuario está permitido
    if (!allowedRoles.includes(decoded.role)) {
      return <Navigate to="/unauthorized" replace />;
    }

    return children;
  } catch (error) {
    console.error("Token inválido:", error);
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }
}