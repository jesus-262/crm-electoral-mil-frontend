import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { enviroments } from "../../env";
import GraficaIndividual from "../GraficaIndividual";
import GraficaComunas from "../GraficaComunas";
import GraficaComunasGeneral from "../GraficaComunasGeneral";
import GraficaComunaYPuestoGeneral from "../GraficaComunaYPuestoGeneral";
import BotonDescargarExcel from "../BotonDescargarExcel";
import GraficaComunasConsulta from "../GraficaComunasConsulta";
import MapaComunasBloques from "../MapaComunasBloques";
import MapaComunas from "../MapaComunas";

function Grafica() {
  const [decoded, setDecoded] = useState(null);
  const [stats, setStats] = useState({ total: 0, loading: true });
  const [seccionActiva, setSeccionActiva] = useState("graficas");
  const [subliderData, setSubliderData] = useState({ rows: [], totalSublideres: 0, totalRegistros: 0 });
  const [subliderLoading, setSubliderLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }
        const userDecoded = jwtDecode(token);
        setDecoded(userDecoded);

        const config = { headers: { Authorization: `Bearer ${token}` } };
        if (userDecoded.role === "Administrador") {
          const res = await axios.get(
            `${enviroments.backendUrl}/api/graficas/comunasgeneral`,
            config
          );
          setStats({ total: res.data.totalRegistros || 0, loading: false });
        } else {
          const res = await axios.get(
            `${enviroments.backendUrl}/api/graficas/comunas/${userDecoded.id}`,
            config
          );
          setStats({ total: res.data.totalRegistros || 0, loading: false });

          if (userDecoded.role === "Lider") {
            setSubliderLoading(true);
            try {
              const subRes = await axios.get(
                `${enviroments.backendUrl}/api/graficas/lider/${userDecoded.id}/sublideres`,
                config
              );
              setSubliderData(subRes.data);
            } catch (subErr) {
              console.error("Error al obtener sublideres:", subErr);
            } finally {
              setSubliderLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Error initializing:", error);
        setStats({ total: 0, loading: false });
        if (error.response?.status === 401) {
          window.location.href = "/login";
        }
      }
    };
    init();
  }, []);

  if (!decoded) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-lg">
          <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Cargando...
        </div>
      </div>
    );
  }

  const roleColors = {
    Administrador: "from-purple-600 to-indigo-600",
    Lider: "from-blue-600 to-cyan-600",
    Sublider: "from-emerald-600 to-teal-600",
  };

  const today = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const SectionDivider = ({ title, color = "from-blue-500/50" }) => (
    <div className="flex items-center gap-3">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className={`flex-1 h-px bg-gradient-to-r ${color} via-slate-700/50 to-transparent`} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Panel de Gráficas
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{today}</p>
        </div>
        <span
          className={`self-start px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r ${roleColors[decoded.role] || "from-slate-600 to-slate-700"}`}
        >
          {decoded.role}
        </span>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className={`grid gap-5 ${
        decoded.role === "Administrador" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"
      }`}>
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
            Total Registros
          </p>
          <p className="text-3xl font-bold text-white mt-2">
            {stats.loading ? (
              <span className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin align-middle" />
            ) : (
              stats.total.toLocaleString()
            )}
          </p>
        </div>

        {decoded.role === "Administrador" ? (
          <>
            <button
              onClick={() => setSeccionActiva((prev) => (prev === "graficas" ? null : "graficas"))}
              className={`text-left bg-slate-800/80 border rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 w-full cursor-pointer ${
                seccionActiva === "graficas" ? "border-blue-500/50" : "border-slate-700/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                  Gráficas
                </p>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                    seccionActiva === "graficas" ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white mt-2">2</p>
              <p className="text-xs text-slate-500 mt-1">General + por puesto</p>
            </button>
            <button
              onClick={() => setSeccionActiva((prev) => (prev === "busqueda" ? null : "busqueda"))}
              className={`text-left bg-slate-800/80 border rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 w-full cursor-pointer ${
                seccionActiva === "busqueda" ? "border-emerald-500/50" : "border-slate-700/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                  Búsqueda
                </p>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                    seccionActiva === "busqueda" ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white mt-2 text-emerald-400">⚡</p>
              <p className="text-xs text-slate-500 mt-1">Consulta individual</p>
            </button>
            <button
              onClick={() => setSeccionActiva((prev) => (prev === "mapa" ? null : "mapa"))}
              className={`text-left bg-slate-800/80 border rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 w-full cursor-pointer ${
                seccionActiva === "mapa" ? "border-rose-500/50" : "border-slate-700/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                  Mapa
                </p>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                    seccionActiva === "mapa" ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white mt-2">🗺️</p>
              <p className="text-xs text-slate-500 mt-1">Valle del Cauca</p>
            </button>
          </>
        ) : decoded.role === "Lider" ? (
          <>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                Rol
              </p>
              <p className="text-2xl font-bold text-white mt-2">{decoded.role}</p>
              <p className="text-xs text-slate-500 mt-1">
                {decoded.nombre || "Usuario"}
              </p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                Sublideres
              </p>
              <p className="text-3xl font-bold text-white mt-2">
                {subliderLoading ? (
                  <span className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin align-middle" />
                ) : (
                  subliderData.totalSublideres
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {subliderData.totalRegistros} registros en total
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                Rol
              </p>
              <p className="text-2xl font-bold text-white mt-2">{decoded.role}</p>
              <p className="text-xs text-slate-500 mt-1">
                {decoded.nombre || "Usuario"}
              </p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                Tus Consultas
              </p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats.loading ? (
                  <span className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin align-middle" />
                ) : (
                  stats.total.toLocaleString()
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">Registros asignados</p>
            </div>
          </>
        )}
      </div>

      {/* ─── Section: Mis Sublideres (solo Lider) ─── */}
      {decoded.role === "Lider" && subliderData.rows.length > 0 && (
        <section className="space-y-4">
          <SectionDivider title="Mis Sublideres" color="from-cyan-500/50" />
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl overflow-hidden">
            <table className="w-full text-sm text-white">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 uppercase text-xs tracking-wider">
                  <th className="text-left py-3 px-4 font-medium">Nombre</th>
                  <th className="text-left py-3 px-4 font-medium">Cédula</th>
                  <th className="text-right py-3 px-4 font-medium">Registros</th>
                </tr>
              </thead>
              <tbody>
                {subliderData.rows.map((sub, idx) => (
                  <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-4">{sub.nombre}</td>
                    <td className="py-3 px-4 text-slate-400">{sub.cedula}</td>
                    <td className="py-3 px-4 text-right font-semibold">{sub.totalConsultas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── Section: General ─── */}
      <section className={`space-y-6 scroll-mt-20 transition-all duration-500 overflow-hidden ${
        decoded.role === "Administrador" && seccionActiva !== "graficas" ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
      }`}>
        <SectionDivider title="General" />

        {decoded.role === "Administrador" ? (
          <>
            <GraficaComunasGeneral />
            <GraficaComunaYPuestoGeneral />
          </>
        ) : (
          <>
            <GraficaIndividual userId={decoded.id} />
            <GraficaComunas userId={decoded.id} />
          </>
        )}
      </section>

      {/* ─── Section: Búsqueda (solo Admin) ─── */}
      {decoded.role === "Administrador" && (
        <section className={`space-y-6 scroll-mt-20 transition-all duration-500 overflow-hidden ${
          seccionActiva === "busqueda" ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}>
          <SectionDivider title="Búsqueda Individual" color="from-emerald-500/50" />
          <GraficaComunasConsulta />
        </section>
      )}

      {/* ─── Section: Mapa (solo Admin) ─── */}
      {decoded.role === "Administrador" && (
        <section className={`space-y-6 scroll-mt-20 transition-all duration-500 overflow-hidden ${
          seccionActiva === "mapa" ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}>
          <SectionDivider title="Mapa de Comunas" color="from-rose-500/50" />
          <MapaComunasBloques />
          <div className="pt-4">
            <MapaComunas />
          </div>
        </section>
      )}

      {/* ─── Botón flotante descarga Excel (solo Admin) ─── */}
      {decoded.role === "Administrador" && <BotonDescargarExcel />}
    </div>
  );
}

export default Grafica;
