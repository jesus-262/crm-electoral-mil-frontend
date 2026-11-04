import { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { enviroments } from "../env";

function formatearFecha(fecha) {
  if (!fecha) return "";
  const [year, month, day] = String(fecha).split("-").map(Number);
  if (!year || !month || !day) return fecha;
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function cerrarSesionBloqueada() {
  localStorage.removeItem("token");
  try {
    sessionStorage.setItem(
      "mensajeBloqueo",
      "El acceso a la plataforma está cerrado. Contacta al administrador."
    );
  } catch (e) {
    // sessionStorage puede fallar en modo privado; no es crítico.
  }
  window.location.href = "/login";
}

// 📅 Aviso permanente de cierre de la plataforma.
// - La fecha es solo informativa.
// - Si el admin activa el bloqueo, se muestra una franja roja.
// - A los roles bloqueados se les cierra la sesión aunque estén inactivos.
// Se refresca cada 30 s para reflejar cambios sin recargar la página.
export default function AvisoBloqueo() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const { data } = await axios.get(`${enviroments.backendUrl}/api/config/acceso`);
        if (!activo) return;

        // Si el bloqueo se activó, expulsa a Líderes/Sublíderes sin esperar
        // a que hagan otra petición. Admin y Escrutinio siguen exentos.
        if (data.bloqueado) {
          const token = localStorage.getItem("token");
          if (token) {
            try {
              const { role } = jwtDecode(token);
              const rol = String(role || "").trim().toLowerCase();
              if (rol !== "administrador" && rol !== "escrutinio") {
                cerrarSesionBloqueada();
                return;
              }
            } catch (e) {
              // Token inválido: el interceptor de axios lo manejará.
            }
          }
        }

        setConfig(data);
      } catch (error) {
        // Silencioso: el aviso nunca debe romper la página.
      }
    };

    cargar();
    const intervalo = setInterval(cargar, 30000);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  if (!config) return null;

  if (config.bloqueado) {
    return (
      <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-300">
        🔒 <span className="font-semibold">Plataforma bloqueada para Líderes y Sublíderes.</span>{" "}
        Solo Administrador y Escrutinio pueden ingresar. Contacta al administrador.
      </div>
    );
  }

  if (!config.fechaCierre) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-200">
      📅 La plataforma se cerrará el{" "}
      <span className="font-semibold">{formatearFecha(config.fechaCierre)}</span>.
    </div>
  );
}
