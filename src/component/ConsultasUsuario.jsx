import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { enviroments } from "../env";
import { useModal } from "./ui/ModalProvider";

export default function ConsultasUsuario() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { confirmar, mostrarAviso } = useModal();
  const [consultas, setConsultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [descargando, setDescargando] = useState(false);
  const [listas, setListas] = useState([]);
  const [listaNumero, setListaNumero] = useState("");
  const [candidatoNumero, setCandidatoNumero] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const decoded = jwtDecode(token);
        if (decoded.role !== "Administrador") {
          navigate("/unauthorized");
          return;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [userRes, consultasRes] = await Promise.all([
          axios.get(`${enviroments.backendUrl}/api/users/${userId}`, config),
          axios.get(`${enviroments.backendUrl}/api/consulta/${userId}`, config),
        ]);

        setNombreUsuario(userRes.data.nombre || "Usuario");
        setConsultas(consultasRes.data);
      } catch (error) {
        console.error("Error al obtener datos:", error);
        setNombreUsuario(`Usuario #${userId}`);
      } finally {
        setCargando(false);
      }
    };

    const fetchListas = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(
          `${enviroments.backendUrl}/api/escrutinio/concejo/listas`,
          config
        );
        setListas(res.data || []);
      } catch (error) {
        console.error("Error al obtener listas:", error);
      }
    };

    fetchData();
    fetchListas();
  }, [userId, navigate]);

  const handleVerificar = async () => {
    if (!listaNumero || !candidatoNumero) {
      mostrarAviso({
        titulo: "Faltan datos",
        mensaje: "Selecciona un partido y un número de candidato.",
        tipo: "advertencia",
      });
      return;
    }
    if (consultas.length === 0) {
      mostrarAviso({
        titulo: "Sin consultas",
        mensaje: "No hay consultas para verificar.",
        tipo: "advertencia",
      });
      return;
    }

    setVerificando(true);
    setResultados(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${enviroments.backendUrl}/api/escrutinio/concejo/verificar-voto`,
        {
          consultas: consultas.map(c => ({
            departamento: c.departamento,
            municipio: c.municipio,
            puesto: c.puesto,
            mesa: c.mesa,
          })),
          listaNumero,
          candidatoNumero,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResultados(res.data.resultados || []);
    } catch (error) {
      console.error("Error verificando:", error);
      mostrarAviso({
        titulo: "Error",
        mensaje: "Error al verificar los votos.",
        tipo: "error",
      });
    } finally {
      setVerificando(false);
    }
  };

  const handleDownload = async () => {
    setDescargando(true);
    try {
      const token = localStorage.getItem("token");

      // Si hay búsqueda activa, exportar solo los que coinciden (con sus resultados alineados)
      const qFiltro = busqueda.trim();
      const resultadosParaExportar = qFiltro
        ? consultasFiltradas.map((c) => {
            const idx = consultas.indexOf(c);
            return resultados && idx >= 0 ? resultados[idx] : null;
          })
        : resultados || [];

      const response = await axios.get(
        `${enviroments.backendUrl}/api/consulta/exportar/${userId}`,
        {
          responseType: "blob",
          params: {
            resultados: JSON.stringify(resultadosParaExportar),
            listaNumero: listaNumero || "",
            candidatoNumero: candidatoNumero || "",
            q: qFiltro,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `consultas_usuario_${userId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error descargando Excel:", err);
    } finally {
      setDescargando(false);
    }
  };

  const handleDeleteConsulta = async (id) => {
    const ok = await confirmar({
      titulo: "Eliminar registro",
      mensaje:
        "¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer.",
      textoConfirmar: "Eliminar",
      textoCancelar: "Cancelar",
      peligro: true,
      icono: "🗑️",
    });

    if (!ok) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${enviroments.backendUrl}/api/consulta/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const res = await axios.get(
        `${enviroments.backendUrl}/api/consulta/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConsultas(res.data);
      setResultados(null);
      setPaginaActual(1);
    } catch (err) {
      console.error("Error eliminando el registro:", err);
      mostrarAviso({
        titulo: "Error",
        mensaje: "Error al eliminar el registro.",
        tipo: "error",
      });
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  // ─── Búsqueda en vivo de la tabla (cédula o nombre, sin tildes ni mayúsculas) ───
  const normalizarTexto = (texto) =>
    String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const q = normalizarTexto(busqueda);
  const consultasFiltradas = q
    ? consultas.filter(
        (item) =>
          normalizarTexto(item.cedula).includes(q) ||
          normalizarTexto(item.nombreCompleto).includes(q)
      )
    : consultas;

  // ─── Paginación: 20 por página solo si hay más de 20 registros ───
  const ITEMS_POR_PAGINA = 20;
  const totalPaginas = Math.ceil(consultasFiltradas.length / ITEMS_POR_PAGINA);
  const paginaEfectiva = Math.min(paginaActual, Math.max(1, totalPaginas));
  const inicio = (paginaEfectiva - 1) * ITEMS_POR_PAGINA;
  const consultasPagina = consultasFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">
            Consultas de {nombreUsuario}
          </h1>
          <p className="text-sm text-slate-400 mt-1">ID: {userId}</p>
        </div>
        <button
          onClick={() => navigate("/admin")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm"
        >
          ← Volver
        </button>
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-indigo-400 mb-3">
          Verificar candidato en escrutinio
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Selecciona el partido y el número de candidato. Se cruzará la información de cada consulta
          (departamento, municipio, puesto y mesa) con la base de datos de escrutinio de concejo para
          verificar si el usuario tiene votos en esa mesa.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Partido / Lista</label>
            <select
              className="w-full bg-[#0F172A] text-white border border-slate-600 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={listaNumero}
              onChange={e => setListaNumero(e.target.value)}
            >
              <option value="">Seleccionar partido...</option>
              {listas.map(l => (
                <option key={l.numeroLista} value={l.numeroLista}>
                  {l.numeroLista} - {l.nombreLista}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">Número de candidato</label>
            <select
              className="w-full bg-[#0F172A] text-white border border-slate-600 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={candidatoNumero}
              onChange={e => setCandidatoNumero(e.target.value)}
            >
              <option value="">Seleccionar candidato...</option>
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleVerificar}
              disabled={verificando}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              {verificando ? "Verificando..." : "🔍 Verificar"}
            </button>
          </div>
        </div>

        {resultados && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex flex-wrap gap-3 text-sm mb-3">
              <span className="bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1 rounded">
                ESTÁN: {resultados.filter(r => r.estado === 'ESTÁ').length}
              </span>
              <span className="bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded">
                NO ESTÁN: {resultados.filter(r => r.estado === 'NO ESTÁ').length}
              </span>
              <span className="bg-slate-500/20 border border-slate-500/30 text-slate-300 px-3 py-1 rounded">
                MESA NO ENCONTRADA: {resultados.filter(r => r.estado === 'MESA NO ENCONTRADA').length}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Verificando partido {listaNumero} · candidato #{candidatoNumero} sobre {resultados.length} consultas.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-gray-400">Total de consultas: </span>
          <span className="font-semibold">{consultas.length}</span>
        </div>

        {consultas.length > 0 && (
          <button
            onClick={handleDownload}
            disabled={descargando}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {descargando ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar Excel
              </>
            )}
          </button>
        )}
      </div>

      {/* ─── Buscador en vivo ─── */}
      <div className="mb-4">
        <label className="block text-xs text-gray-300 mb-1">Buscar por cédula o nombre</label>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPaginaActual(1);
          }}
          className="w-full md:w-80 bg-[#1E293B] text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-[#1E293B] text-white border border-gray-700 rounded-md">
          <thead className="bg-indigo-600 text-xs font-semibold uppercase">
            <tr>
              <th className="px-4 py-2 border border-gray-700">Cédula</th>
              <th className="px-4 py-2 border border-gray-700">Nombre</th>
              <th className="px-4 py-2 border border-gray-700">Teléfono</th>
              <th className="px-4 py-2 border border-gray-700">Departamento</th>
              <th className="px-4 py-2 border border-gray-700">Municipio</th>
              <th className="px-4 py-2 border border-gray-700">Puesto</th>
              <th className="px-4 py-2 border border-gray-700">Dirección</th>
              <th className="px-4 py-2 border border-gray-700">Mesa</th>
              <th className="px-4 py-2 border border-gray-700">Resultado</th>
              <th className="px-4 py-2 border border-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {consultasPagina.map((item, index) => (
              <tr key={index} className="text-sm hover:bg-[#334155] transition">
                <td className="px-4 py-2 border border-gray-700">
                  {item.cedula}
                </td>
                <td className="px-4 py-2 border border-gray-700">
                  {item.nombreCompleto || "-"}
                </td>
                <td className="px-4 py-2 border border-gray-700 text-center">
                  {item.telefono || "-"}
                </td>
                <td className="px-4 py-2 border border-gray-700">
                  {item.departamento || "-"}
                </td>
                <td className="px-4 py-2 border border-gray-700">
                  {item.municipio || "-"}
                </td>
                <td className="px-4 py-2 border border-gray-700">
                  {item.puesto || "-"}
                </td>
                <td className="px-4 py-2 border border-gray-700">
                  {item.direccion || "-"}
                </td>
                <td className="px-4 py-2 border border-gray-700 text-center">
                  {item.mesa || "-"}
                </td>
                <td className="px-4 py-2 border border-gray-700 text-center">
                  {resultados ? (() => {
                    const r = resultados[index];
                    if (!r) return <span className="text-slate-500">-</span>;
                    if (r.estado === "ESTÁ") {
                      return (
                        <span className="inline-flex flex-col items-center gap-1">
                          <span className="bg-green-500/20 text-green-400 border border-green-500/40 px-2 py-0.5 rounded text-xs font-semibold">
                            🟢 ESTÁ · {r.candidatoVotos} {r.candidatoVotos === 1 ? "voto" : "votos"}
                          </span>
                          {r.pdfUrl && (
                            <a
                              href={`${enviroments.backendUrl}/api/escrutinio/concejo/pdf-proxy?url=${encodeURIComponent(r.pdfUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs underline"
                            >
                              Ver PDF
                            </a>
                          )}
                        </span>
                      );
                    }
                    if (r.estado === "NO ESTÁ") {
                      return (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded text-xs font-semibold">
                          🔴 NO ESTÁ · 0 votos
                        </span>
                      );
                    }
                    return (
                      <span className="bg-slate-500/20 text-slate-300 border border-slate-500/40 px-2 py-0.5 rounded text-xs font-semibold">
                        ⚪ MESA NO ENCONTRADA
                      </span>
                    );
                  })() : (
                    <span className="text-slate-500 text-xs">Sin verificar</span>
                  )}
                </td>
                <td className="px-4 py-2 border border-gray-700 text-center">
                  <button
                    onClick={() => handleDeleteConsulta(item.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition"
                  >
                    🗑 Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {consultasPagina.length === 0 && (
              <tr>
                <td colSpan="10" className="text-center py-6 text-gray-400">
                  {busqueda.trim() !== "" ? "No hay resultados para la búsqueda." : "Este usuario no tiene consultas registradas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Paginación ─── */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-slate-400">
            Mostrando {inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, consultasFiltradas.length)} de {consultasFiltradas.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>
            <span className="text-slate-300">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
