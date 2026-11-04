import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { enviroments } from "../../env";

export default function RestablecerPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [mensaje, setMensaje] = useState(null); // { tipo: 'error' | 'vencido' | 'ok', texto }
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (nueva.length < 6) {
      setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    if (nueva !== repetir) {
      setMensaje({ tipo: "error", texto: "Las contraseñas no coinciden." });
      return;
    }

    setCargando(true);
    setMensaje(null);
    try {
      const res = await fetch(enviroments.backendUrl + "/api/auth/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nuevaContrasena: nueva, repetirContrasena: repetir }),
      });
      const data = await res.json();

      if (data.estado === "ok") {
        setMensaje({
          tipo: "ok",
          texto: "Contraseña actualizada correctamente. Serás redirigido al inicio de sesión.",
        });
        setTimeout(() => navigate("/login"), 2500);
      } else if (data.estado === "enlace_invalido") {
        setMensaje({ tipo: "vencido", texto: "Este enlace ha vencido. Solicita uno nuevo." });
      } else {
        setMensaje({ tipo: "error", texto: data.mensaje || "No se pudo restablecer la contraseña." });
      }
    } catch (error) {
      console.error("Error restableciendo contraseña:", error);
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor" });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-2">
      <div className="w-full max-w-[280px] text-white">
        <h2 className="text-base font-semibold text-center mb-4">Restablecer contraseña</h2>

        {mensaje?.tipo === "vencido" ? (
          <div className="space-y-3">
            <p className="text-xs text-red-400 text-center">{mensaje.texto}</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 rounded transition"
            >
              Volver a solicitar enlace
            </button>
          </div>
        ) : mensaje?.tipo === "ok" ? (
          <p className="text-xs text-emerald-400 text-center">{mensaje.texto}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Nueva contraseña</label>
              <input
                type="password"
                maxLength={30}
                className="w-full bg-[#1E293B] text-white border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Mínimo 6 caracteres"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Repetir nueva contraseña</label>
              <input
                type="password"
                maxLength={30}
                className="w-full bg-[#1E293B] text-white border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Repite la contraseña"
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                required
              />
            </div>
            {mensaje?.tipo === "error" && (
              <p className="text-xs text-red-400">{mensaje.texto}</p>
            )}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[rgba(133,59,206,0.27)] hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded transition"
            >
              {cargando ? "Guardando..." : "Cambiar contraseña"}
            </button>
            <p className="text-[11px] text-gray-500 text-center">
              Este enlace vence 15 minutos después de haberlo solicitado.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
