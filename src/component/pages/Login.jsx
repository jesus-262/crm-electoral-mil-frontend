// Deploy: login por cedula 2026-10-03 (reintento)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import LoginAlert from "../Alert/LoginAlert"
import { enviroments } from '../../env';
export default function Login() {
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // ─── Recuperación de contraseña ───
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [cedulaRecuperar, setCedulaRecuperar] = useState("");
  const [pasoRecuperar, setPasoRecuperar] = useState(null); // { estado, mensaje?, correoEnmascarado? }
  const [buscandoRecuperar, setBuscandoRecuperar] = useState(false);

  const navigate = useNavigate();

  // Si llegó aquí porque el bloqueo global cortó su sesión, muestra el motivo.
  useEffect(() => {
    const mensaje = sessionStorage.getItem("mensajeBloqueo");
    if (mensaje) {
      setAlertMessage(mensaje);
      setShowAlert(true);
      sessionStorage.removeItem("mensajeBloqueo");
    }
  }, []);

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

  // Paso 1: buscar la cuenta por cédula → muestra el correo enmascarado
  const buscarCuentaRecuperar = async () => {
    if (!cedulaRecuperar.trim()) return;
    setBuscandoRecuperar(true);
    setPasoRecuperar(null);
    try {
      const res = await fetch(enviroments.backendUrl + "/api/auth/solicitar-recuperacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: cedulaRecuperar }),
      });
      const data = await res.json();
      setPasoRecuperar(data);
    } catch (error) {
      console.error("Error buscando cuenta:", error);
      setPasoRecuperar({ estado: "error", mensaje: "Error de conexión con el servidor" });
    } finally {
      setBuscandoRecuperar(false);
    }
  };

  // Paso 2: confirmar y enviar el enlace al correo
  const enviarEnlaceRecuperar = async () => {
    setBuscandoRecuperar(true);
    try {
      const res = await fetch(enviroments.backendUrl + "/api/auth/solicitar-recuperacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: cedulaRecuperar, enviar: true }),
      });
      const data = await res.json();
      setPasoRecuperar(data);
    } catch (error) {
      console.error("Error enviando enlace:", error);
      setPasoRecuperar({ estado: "error", mensaje: "Error de conexión con el servidor" });
    } finally {
      setBuscandoRecuperar(false);
    }
  };

  const esErrorRecuperar =
    pasoRecuperar &&
    ["no_encontrada", "sin_correo", "limite_envio", "error", "error_correo"].includes(pasoRecuperar.estado);

  // Límite diario de Brevo (300/día): se muestra en ámbar, no como error rojo
  const esLimiteDiario = pasoRecuperar?.estado === "limite_diario";

  return (
    <div className="  h-screen bg-[#0F172A] flex items-center justify-center px-2 relative">
      <div className="w-full max-w-[240px] text-white">
        <div className="flex flex-col items-center mb-3">

          <h2 className="text-base font-semibold text-center">CRM</h2>
        </div>

        {!mostrarRecuperar && (
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
              maxLength={72}
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

        )}

        {/* ─── Recuperar contraseña ─── */}
        {!mostrarRecuperar && (
          <button
            type="button"
            onClick={() => {
              setMostrarRecuperar(true);
              setPasoRecuperar(null);
            }}
            className="w-full text-center text-[11px] text-indigo-400 hover:text-indigo-300 mt-3"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {mostrarRecuperar && (
          <div className="mt-3 border-t border-slate-700 pt-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                setMostrarRecuperar(false);
                setPasoRecuperar(null);
                setCedulaRecuperar("");
              }}
              className="text-[11px] text-gray-400 hover:text-gray-200 text-left"
            >
              ← Volver
            </button>
            {/* Paso 1: pedir cédula */}
            {pasoRecuperar?.estado !== "ok" && pasoRecuperar?.estado !== "enviado" && (
              <>
                <label className="block text-xs text-gray-300">Cédula para recuperar</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  className="w-full bg-[#1E293B] text-white border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Ej: 123456789"
                  value={cedulaRecuperar}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (/^[0-9]*$/.test(valor)) setCedulaRecuperar(valor);
                  }}
                />
                <button
                  type="button"
                  onClick={buscarCuentaRecuperar}
                  disabled={buscandoRecuperar || !cedulaRecuperar.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded transition"
                >
                  {buscandoRecuperar ? "Buscando..." : "Buscar"}
                </button>
              </>
            )}

            {/* Paso 2: confirmar envío al correo enmascarado */}
            {pasoRecuperar?.estado === "ok" && (
              <>
                <p className="text-xs text-gray-300">
                  El enlace se enviará a{" "}
                  <span className="text-white font-semibold">{pasoRecuperar.correoEnmascarado}</span>
                </p>
                <button
                  type="button"
                  onClick={enviarEnlaceRecuperar}
                  disabled={buscandoRecuperar}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded transition"
                >
                  {buscandoRecuperar ? "Enviando..." : "Enviar enlace"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasoRecuperar(null);
                    setCedulaRecuperar("");
                  }}
                  className="w-full text-center text-[11px] text-gray-400 hover:text-gray-200"
                >
                  Cambiar cédula
                </button>
              </>
            )}

            {/* Enviado */}
            {pasoRecuperar?.estado === "enviado" && (
              <p className="text-xs text-emerald-400">
                ✅ Revisa tu correo para continuar. El enlace vence en 15 minutos.
              </p>
            )}

            {/* Límite diario de correos (300/día): el enlace no se envía ni queda en cola */}
            {esLimiteDiario && (
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded px-2 py-1.5">
                <p>⏳ {pasoRecuperar.mensaje}</p>
              </div>
            )}

            {/* Errores / avisos */}
            {esErrorRecuperar && (
              <p className="text-xs text-red-400">{pasoRecuperar.mensaje}</p>
            )}
          </div>
        )}
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
