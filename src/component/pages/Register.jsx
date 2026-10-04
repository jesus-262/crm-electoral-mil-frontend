import { useState, useEffect } from "react";
import RegisterAlert from "../Alert/RegisterAlert";
import { useNavigate } from "react-router-dom";
import { enviroments } from '../../env';
import axios from "axios";

export default function Register() {
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Estados del formulario
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Lider");
  const [id_lider, setIdLider] = useState("");
  const [subCategoriasList, setSubCategoriasList] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // 🔹 Traer líderes si el rol es Sublíder
  useEffect(() => {
    if (role === "Sublider") {
      const fetchSubcategorias = async () => {
        try {
          const res = await axios.get(enviroments.backendUrl + "/api/auth/categorias", {
            headers: getAuthHeaders(),
          });
          setSubCategoriasList(res.data);
        } catch (error) {
          console.error("Error cargando líderes:", error);
        }
      };

      fetchSubcategorias();
    } else {
      setIdLider("");
    }
  }, [role]);

  // 🔹 Manejo del envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setAlertMessage("Las contraseñas no coinciden");
      setShowAlert(true);
      return;
    }

    try {
      // Preparar el body dinámicamente (email opcional)
      const body = {
        nombre,
        cedula,
        password,
        role
      };

      if (email.trim()) {
        body.email = email.trim();
      }

      if (role === "Sublider") {
        body.id_lider = id_lider;
      }

      const res = await fetch(enviroments.backendUrl + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      setAlertMessage(data.message);
      setShowAlert(true);

      if (res.ok && data.token) {
        setTimeout(() => navigate("/admin"), 2000);
      }
    } catch (error) {
      console.error("Error al conectar con el backend:", error);
      setAlertMessage("Error de conexión con el servidor");
      setShowAlert(true);
    }
  };

  return (
    <>
      <br /><br />
      <div className="flex items-center justify-center overflow-y-hidden w-full">
        <div className="w-full max-w-[240px] text-white">
          <div className="flex flex-col items-center mb-3">
            <h2 className="text-base font-semibold text-center">Registro</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Nombre completo</label>
              <input
                type="text"
                maxLength={40}
                className="w-full bg-[#1E293B] text-white px-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Cédula</label>
              <input
                type="text"
                maxLength={30}
                className="w-full bg-[#1E293B] text-white px-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Correo (Opcional)</label>
              <input
                type="email"
                maxLength={40}
                className="w-full bg-[#1E293B] text-white px-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Contraseña</label>
              <input
                type="password"
                maxLength={30}
                className="w-full bg-[#1E293B] text-white px-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                maxLength={30}
                className="w-full bg-[#1E293B] text-white px-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Rol</label>
              <select
                className="w-full bg-[#1E293B] text-white px-2 py-1 rounded text-xs focus:outline-none"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Lider">Líder</option>
                <option value="Sublider">Sublíder</option>
                <option value="Administrador">Administrador</option>
                <option value="Escrutinio">Escrutinio</option>
              </select>
            </div>

            {/* Select dinámico de líderes */}
            {role === "Sublider" && (
              <div>
                <label className="block text-xs text-gray-300 mb-1">Asignar a líder</label>
                <select
                  className="w-full bg-[#1E293B] text-white px-2 py-1 rounded text-xs focus:outline-none"
                  value={id_lider}
                  onChange={(e) => setIdLider(e.target.value)}
                >
                  <option value="">Seleccione un líder</option>
                  {subCategoriasList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[rgba(133,59,206,0.27)] hover:bg-[rgba(133,59,206,0.5)] text-white text-xs font-medium py-1.5 rounded transition"
            >
              Registrarse
            </button>
          </form>

          {showAlert && (
            <RegisterAlert
              message={alertMessage}
              onClose={() => setShowAlert(false)}
            />
          )}
        </div>
      </div>
    </>
  );
}
