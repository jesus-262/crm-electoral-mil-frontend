import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import LoginAlert from "../Alert/LoginAlert"
import { enviroments } from '../../env';
export default function Login() {
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(enviroments.backendUrl + "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cedula, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setAlertMessage(data.message || "Error al iniciar sesión");
        setShowAlert(true);
        return;
      }

      // Guardar token
      localStorage.setItem("token", data.token);

      // Decodificar token para extraer el rol
      const decoded = jwtDecode(data.token);
      const userRole = decoded.role;

      // Redirigir según el rol
      if (userRole === "Administrador") {
        navigate("/admin");
      } else if (userRole === "Escrutinio") {
        navigate("/escrutinio/presidenciales");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Error de red:", error);
      setAlertMessage("Error de conexión con el servidor");
      setShowAlert(true);
    }
  };

  return (
    <div className="  h-screen bg-[#0F172A] flex items-center justify-center px-2 relative">
      <div className="w-full max-w-[220px] text-white">
        <div className="flex flex-col items-center mb-3">

          <h2 className="text-base font-semibold text-center">CRM</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-300 mb-1">Cédula</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={20}
              className="w-full bg-[#1E293B] text-white border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Ej: 123456789"
              value={cedula}
              onChange={(e) => {
                const valor = e.target.value;
                if (/^[0-9]*$/.test(valor)) setCedula(valor);
              }}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-300">Contraseña</label>
              
            </div>
            <input
              type="password"
              maxLength={30}
              className="w-full bg-[#1E293B] text-white border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[rgba(133,59,206,0.27)] hover:bg-purple-700 text-white text-xs font-medium py-1.5 rounded transition"
          >
            Iniciar sesión
          </button>
        </form>

      </div>

      {showAlert && (
        <LoginAlert
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
}