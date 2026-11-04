import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { enviroments } from "../env";

// 🔍 Búsqueda global de registros de votantes (solo Admin)
// Busca por cédula o nombre en TODAS las consultas y muestra a quién pertenece
// el registro (Sublider que lo registró y su Lider).
export default function BusquedaGlobal() {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState(null); // null = sin búsqueda
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = busqueda.trim();
    if (q.length < 2) {
      setResultados(null);
      setError("");
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    timerRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${enviroments.backendUrl}/api/admin/busqueda-global`, {
          params: { q },
          headers: { Authorization: `Bearer ${token}` },
        });
        setResultados(res.data.resultados || []);
      } catch (err) {
        console.error("Error en búsqueda global:", err);
        setError(err.response?.data?.message || "Error en la búsqueda global");
        setResultados([]);
      } finally {
        setCargando(false);
      }
    }, 350);

    return () => clearTimeout(timerRef.current);
  }, [busqueda]);

  return (
    <div className='p-6 text-white max-w-4xl mx-auto'>
      {/* 🔎 TÍTULO Y BUSCADOR */}
      <h2 className="text-2xl font-bold text-indigo-400 mb-4">Registro</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o cédula..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-[#1E293B] text-white border border-gray-600 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {cargando && <p className="text-xs text-slate-400 mt-2">Buscando...</p>}

        {!cargando && error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        {!cargando && !error && resultados && resultados.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">No hay resultados para la búsqueda.</p>
        )}

        {!cargando && !error && resultados && resultados.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            Mostrando {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
          </p>
        )}
      </div>

      {/* 📋 TABLA DE RESULTADOS */}
      {resultados && resultados.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-700 bg-[#1E293B]">
            <thead className="bg-indigo-600">
              <tr>
                <th className="px-3 py-2 border border-gray-700 text-left">Cédula</th>
                <th className="px-3 py-2 border border-gray-700 text-left">Nombre</th>
                <th className="px-3 py-2 border border-gray-700 text-left">Teléfono</th>
                <th className="px-3 py-2 border border-gray-700 text-left">Municipio</th>
                <th className="px-3 py-2 border border-gray-700 text-left">Puesto</th>
                <th className="px-3 py-2 border border-gray-700 text-left">Mesa</th>
                <th className="px-3 py-2 border border-gray-700 text-left">Sublider</th>
                <th className="px-3 py-2 border border-gray-700 text-left">Lider</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r, idx) => (
                <tr key={idx} className="text-sm hover:bg-[#334155] transition border-t border-slate-700/50">
                  <td className="px-3 py-2 border border-gray-700">{r.cedula}</td>
                  <td className="px-3 py-2 border border-gray-700">{r.nombreCompleto || "-"}</td>
                  <td className="px-3 py-2 border border-gray-700">{r.telefono || "-"}</td>
                  <td className="px-3 py-2 border border-gray-700">{r.municipio || "-"}</td>
                  <td className="px-3 py-2 border border-gray-700">{r.puesto || "-"}</td>
                  <td className="px-3 py-2 border border-gray-700 text-center">{r.mesa || "-"}</td>
                  <td className="px-3 py-2 border border-gray-700">
                    {r.usuarioRole === "Sublider" ? (
                      <div className="space-y-0.5">
                        <div>{r.usuarioNombre}</div>
                        <div className="text-xs text-slate-400">({r.usuarioCedula})</div>
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border border-gray-700">
                    {r.usuarioRole === "Sublider" && r.liderNombre ? (
                      <div className="space-y-0.5">
                        <div>{r.liderNombre}</div>
                        <div className="text-xs text-slate-400">({r.liderCedula})</div>
                      </div>
                    ) : r.usuarioRole === "Lider" ? (
                      <div className="space-y-0.5">
                        <div>{r.usuarioNombre}</div>
                        <div className="text-xs text-slate-400">({r.usuarioCedula})</div>
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
