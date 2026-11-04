import { useState } from "react";
import { jwtDecode } from "jwt-decode";
import Usuarios from '../Usuarios';
import BusquedaGlobal from '../BusquedaGlobal';
import AdminBloqueo from '../AdminBloqueo';

function Admin() {
  const [seccionActiva, setSeccionActiva] = useState("cuentas"); // 'cuentas' | 'registros' | 'bloqueo' | null

  const token = localStorage.getItem("token");
  if (token) {
    const decoded = jwtDecode(token);
    console.log("ID:", decoded.id);
    console.log("Email:", decoded.email);
    console.log("Rol:", decoded.role);
    console.log("Nombre:", decoded.nombre);
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* ─── Botones para desplegar secciones ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setSeccionActiva((prev) => (prev === "cuentas" ? null : "cuentas"))}
            className={`text-left bg-slate-800/80 border rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 w-full cursor-pointer ${
              seccionActiva === "cuentas" ? "border-indigo-500/50" : "border-slate-700/50"
            }`}
          >
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">👥 Cuentas</p>
            <p className="text-lg font-bold text-white mt-1">Usuarios del sistema</p>
            <p className="text-xs text-slate-500 mt-1">Buscar y administrar cuentas</p>
          </button>

          <button
            onClick={() => setSeccionActiva((prev) => (prev === "registros" ? null : "registros"))}
            className={`text-left bg-slate-800/80 border rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 w-full cursor-pointer ${
              seccionActiva === "registros" ? "border-emerald-500/50" : "border-slate-700/50"
            }`}
          >
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">📋 Registros</p>
            <p className="text-lg font-bold text-white mt-1">Búsqueda global de votantes</p>
            <p className="text-xs text-slate-500 mt-1">Por cédula o nombre, con su Sublider y Lider</p>
          </button>

          <button
            onClick={() => setSeccionActiva((prev) => (prev === "bloqueo" ? null : "bloqueo"))}
            className={`text-left bg-slate-800/80 border rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 w-full cursor-pointer ${
              seccionActiva === "bloqueo" ? "border-red-500/50" : "border-slate-700/50"
            }`}
          >
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">🔒 Bloqueo</p>
            <p className="text-lg font-bold text-white mt-1">Control de acceso</p>
            <p className="text-xs text-slate-500 mt-1">Cerrar el acceso a Líderes y Sublíderes</p>
          </button>
        </div>

        {/* ─── Secciones ─── */}
        {seccionActiva === "cuentas" && <Usuarios />}
        {seccionActiva === "registros" && <BusquedaGlobal />}
        {seccionActiva === "bloqueo" && <AdminBloqueo />}
      </div>
    </div>
  );
}

export default Admin;
