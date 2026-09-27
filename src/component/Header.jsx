import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

export default function Header() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setNombre(decoded.nombre);
        setRole(decoded.role);
      } catch (e) {
        console.error("Token inválido");
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  }, []);

  const handleLogout = () => {
    if (confirm("¿Deseas cerrar sesión?")) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  return (
    <header className="bg-[#0F172A] text-white py-3 px-4 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Navegación izquierda */}
        <nav className="space-x-4 text-sm">
          <Link to="/" className="hover:underline">Inicio</Link>

          {role === "Administrador" && (
            <>
              <Link to="/register" className="hover:underline">Registro</Link>
              <Link to="/admin" className="hover:underline">Cuentas</Link>
            </>
          )}

          {nombre && (
            <Link to="/grafica" className="hover:underline">Gráfica</Link>
          )}
          {role === "Escrutinio" && (
            <Link to="/escrutinio" className="hover:underline">Escrutinio</Link>
          )}
        </nav>

        {/* Info usuario + salir */}
        <div className="flex items-center space-x-4 text-sm">
          {nombre && (
            <span className="text-white">
              Bienvenido {nombre} <span className="text-gray-300">({role})</span>
            </span>
          )}
          {nombre && (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-xs px-3 py-1 rounded transition"
            >
              Salir
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
