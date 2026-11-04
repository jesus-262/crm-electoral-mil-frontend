import { useEffect, useState } from "react";
import axios from "axios";
import { enviroments } from "../env";
import { useModal } from "./ui/ModalProvider";

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha definida";
  const [year, month, day] = String(fecha).split("-").map(Number);
  if (!year || !month || !day) return fecha;
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// 🔒 Panel de control de acceso:
// - Toggle: bloqueo real (Líderes y Sublíderes; Admin y Escrutinio exentos).
// - Fecha: solo informativa, se muestra como aviso en la plataforma.
export default function AdminBloqueo() {
  const { confirmar } = useModal();
  const [config, setConfig] = useState(null);
  const [fecha, setFecha] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = async () => {
    try {
      const { data } = await axios.get(
        `${enviroments.backendUrl}/api/admin/configuracion-acceso`,
        getAuthHeader()
      );
      setConfig(data);
      setFecha(data.fechaCierre || "");
    } catch (error) {
      console.error("Error cargando configuración de acceso:", error);
      setAviso({ tipo: "error", texto: "No se pudo cargar la configuración." });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async (payload, mensajeOk) => {
    setGuardando(true);
    setAviso(null);
    try {
      const { data } = await axios.put(
        `${enviroments.backendUrl}/api/admin/configuracion-acceso`,
        payload,
        getAuthHeader()
      );
      setConfig(data);
      setFecha(data.fechaCierre || "");
      setAviso({ tipo: "ok", texto: mensajeOk });
    } catch (error) {
      console.error("Error guardando configuración de acceso:", error);
      setAviso({
        tipo: "error",
        texto: error.response?.data?.message || "No se pudo guardar la configuración.",
      });
      // Revierte el estado visual si el servidor rechazó el cambio.
      await cargar();
    } finally {
      setGuardando(false);
    }
  };

  const toggleBloqueo = async () => {
    if (!config || guardando) return;

    const nuevo = !config.bloqueado;

    if (nuevo) {
      const ok = await confirmar({
        titulo: "Bloquear acceso",
        mensaje:
          "¿Bloquear el acceso a Líderes y Sublíderes?\n\nAdministrador y Escrutinio seguirán entrando.",
        textoConfirmar: "Bloquear",
        textoCancelar: "Cancelar",
        peligro: true,
        icono: "🔒",
      });

      if (!ok) return;
    }

    guardar(
      { accesoBloqueado: nuevo },
      nuevo
        ? "Acceso bloqueado para Líderes y Sublíderes."
        : "Acceso abierto para todos los roles."
    );
  };

  const guardarFecha = () => {
    if (guardando) return;
    guardar(
      { fechaCierre: fecha || null },
      fecha ? "Fecha de cierre guardada (solo informativa)." : "Fecha de cierre eliminada."
    );
  };

  if (cargando) {
    return <div className="p-6 text-white max-w-4xl mx-auto">Cargando configuración...</div>;
  }

  const bloqueado = Boolean(config?.bloqueado);

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-indigo-400 mb-4">Bloqueo de acceso</h2>

      {aviso && (
        <div
          className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            aviso.tipo === "ok"
              ? "bg-green-500/15 border-green-500/40 text-green-300"
              : "bg-red-500/15 border-red-500/40 text-red-300"
          }`}
        >
          <span className="flex-1">{aviso.texto}</span>
          <button
            onClick={() => setAviso(null)}
            className="text-slate-400 hover:text-white font-bold leading-none"
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Estado + Toggle Switch ─── */}
      <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className={`text-sm font-semibold ${
                bloqueado ? "text-red-400" : "text-green-400"
              }`}
            >
              {bloqueado
                ? "🔴 Plataforma bloqueada para Líderes y Sublíderes"
                : "🟢 Acceso abierto para Líderes y Sublíderes"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              El Administrador siempre puede entrar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold ${
                bloqueado ? "text-red-300" : "text-slate-300"
              }`}
            >
              {bloqueado ? "Bloqueado" : "Abierto"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={bloqueado}
              aria-label="Bloquear acceso a Líderes y Sublíderes"
              onClick={toggleBloqueo}
              disabled={guardando}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                bloqueado ? "bg-red-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  bloqueado ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Fecha informativa ─── */}
      <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-indigo-300 mb-2">
          📅 Fecha de cierre (informativa)
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Esta fecha solo se muestra como aviso en la plataforma. El bloqueo real se activa
          con el interruptor de arriba.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-300 mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-[#0F172A] text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={guardarFecha}
            disabled={guardando}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition"
          >
            {guardando ? "Guardando..." : "Guardar fecha"}
          </button>

          <button
            type="button"
            onClick={() => {
              setFecha("");
              guardar({ fechaCierre: null }, "Fecha de cierre eliminada.");
            }}
            disabled={guardando || !config?.fechaCierre}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded transition"
          >
            Quitar fecha
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Fecha actual:{" "}
          <span className="text-slate-300">{formatearFecha(config?.fechaCierre)}</span>
        </p>
      </div>
    </div>
  );
}
