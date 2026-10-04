import { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";
import { enviroments } from "../env";

export default function Consulta() {
  const [cedula, setCedula] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [folio, setFolio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [userId, setUserId] = useState(null);
  const [consultas, setConsultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensajeModal, setMensajeModal] = useState("");
  const [total, setTotal] = useState(0);
  const socketRef = useRef(null);
  const pollingRef = useRef(null);

  // Estado para carga masiva
  const [filasExcel, setFilasExcel] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0, cedula: "" });
  const [resultados, setResultados] = useState(null);
  const [aviso, setAviso] = useState(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const socket = io(enviroments.backendUrl);
    socketRef.current = socket;

    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const decoded = jwtDecode(token);
        const uid = decoded.id;
        setUserId(uid);

        const [consultasRes, countRes] = await Promise.all([
          axios.get(`${enviroments.backendUrl}/api/consulta/${uid}`, getAuthHeader()),
          axios.get(`${enviroments.backendUrl}/api/consulta/contar/${uid}`, getAuthHeader()),
        ]);

        setConsultas(consultasRes.data);
        setTotal(countRes.data.total);
      } catch (error) {
        console.error("Error al obtener datos:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchInitialData();

    socket.on("progreso", (msg) => {
      // Extraer número de progreso del mensaje: "[3/50] Procesando cédula: 123"
      const match = msg.match(/\[(\d+)\/(\d+)\]/);
      if (match) {
        setProgreso({ actual: Number(match[1]), total: Number(match[2]), cedula: msg });
      }
      setMensajeModal(msg);
      setModalAbierto(true);
    });

    return () => {
      socket.off("progreso");
      socket.disconnect();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const refreshData = async () => {
    if (!userId) return;
    try {
      const [consultasRes, countRes] = await Promise.all([
        axios.get(`${enviroments.backendUrl}/api/consulta/${userId}`, getAuthHeader()),
        axios.get(`${enviroments.backendUrl}/api/consulta/contar/${userId}`, getAuthHeader()),
      ]);
      setConsultas(consultasRes.data);
      setTotal(countRes.data.total);
    } catch (error) {
      console.error("Error al actualizar datos:", error);
    }
  };

  const handleExport = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(
        `${enviroments.backendUrl}/api/consulta/exportar/${userId}`,
        { ...getAuthHeader(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `consultas_${userId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error al exportar:", error);
    }
  };

  const handleDownloadPlantilla = () => {
    const data = [
      ['cédula', 'nombre completo', 'folio', 'teléfono'],
      ['123456789', 'Ejemplo', 'F-001', '3001234567'],
    ];
    for (let i = 0; i < 49; i++) data.push(['', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_consultas.xlsx');
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este registro?")) {
      try {
        await axios.delete(`${enviroments.backendUrl}/api/consulta/${id}`, getAuthHeader());
        await refreshData();
      } catch (error) {
        console.error("Error al eliminar el registro:", error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cedula || !userId) return;

    try {
      setModalAbierto(true);
      setMensajeModal("🔄 Iniciando consulta...");

      const response = await axios.post(
        `${enviroments.backendUrl}/api/consulta`,
        { cedula, userId, socketId: socketRef.current?.id, nombreCompleto, folio, telefono },
        getAuthHeader()
      );

      if (response.data.success) {
        await refreshData();
        setNombreCompleto("");
        setCedula("");
        setFolio("");
        setTelefono("");
        setAviso({ tipo: "ok", texto: "Consulta guardada exitosamente." });
        setTimeout(() => {
          setModalAbierto(false);
          setMensajeModal("");
        }, 3000);
      } else {
        setAviso({ tipo: "error", texto: response.data.message });
        setMensajeModal(`❌ ${response.data.message}`);
        setTimeout(() => setModalAbierto(false), 5000);
      }
    } catch (error) {
      console.error("Error al guardar datos:", error);
      const msg = error.response?.data?.message || "Error al realizar la consulta.";
      setAviso({ tipo: "error", texto: msg });
      setMensajeModal(`❌ ${msg}`);
      setTimeout(() => setModalAbierto(false), 5000);
    }
  };

  // ─── Carga masiva ───

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const headers = json.length > 0
        ? Object.keys(json[0]).map((h) => h.toLowerCase().trim())
        : [];

      const tieneCedula = headers.some((h) => h === "cédula" || h === "cedula");
      const tieneNombre = headers.some((h) => h === "nombre completo" || h === "nombrecompleto" || h === "nombre");

      const faltantes = [];
      if (!tieneCedula) faltantes.push("cédula");
      if (!tieneNombre) faltantes.push("nombre completo");

      if (faltantes.length > 0) {
        setFilasExcel([]);
        setResultados(null);
        setProgreso({ actual: 0, total: 0, cedula: "" });
        setAviso({
          tipo: "error",
          texto: `El Excel no tiene la(s) columna(s) requerida(s): ${faltantes.join(" y ")}. Usa la plantilla con las columnas: cédula, nombre completo, folio y teléfono.`,
        });
        return;
      }

      const mapeadas = json.map((row) => {
        const rawTelefono = String(row["teléfono"] || row["telefono"] || "").trim();
        return {
          cedula: String(row["cédula"] || row["cedula"] || "").trim(),
          nombreCompleto: String(row["nombre completo"] || row["nombreCompleto"] || row["nombre"] || "").trim(),
          folio: String(row["folio"] || "").trim(),
          telefono: /^\d+$/.test(rawTelefono) ? rawTelefono : "",
        };
      });

      const conCedula = mapeadas.filter((f) => f.cedula);

      if (conCedula.length === 0) {
        setFilasExcel([]);
        setResultados(null);
        setProgreso({ actual: 0, total: 0, cedula: "" });
        setAviso({ tipo: "error", texto: "El Excel no tiene filas con cédula para procesar." });
        return;
      }

      if (conCedula.length > 50) {
        setFilasExcel([]);
        setResultados(null);
        setProgreso({ actual: 0, total: 0, cedula: "" });
        setAviso({
          tipo: "error",
          texto: `El Excel tiene ${conCedula.length} registros con cédula; el máximo es 50. Divide el archivo y vuelve a intentarlo.`,
        });
        return;
      }

      setFilasExcel(mapeadas);
      setResultados(null);
      setProgreso({ actual: 0, total: 0, cedula: "" });
      setAviso(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const limpiarPreview = () => {
    setFilasExcel([]);
    setResultados(null);
    setProgreso({ actual: 0, total: 0, cedula: "" });
  };

  const handleProcesar = async () => {
    if (!userId || filasExcel.length === 0) return;
    setProcesando(true);
    setResultados(null);
    setProgreso({ actual: 0, total: filasExcel.length, cedula: "Iniciando..." });

    const detenerPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const finalizarConResumen = async (resumen) => {
      detenerPolling();
      const r = resumen || {};
      if ((r.errores || 0) > 0 || (r.duplicados || 0) > 0 || (r.inhabilitados || 0) > 0) {
        setAviso({ tipo: "error", texto: `Carga masiva finalizada con ${r.exitosos} exitosos, ${r.errores} errores, ${r.duplicados} duplicados y ${r.inhabilitados} inhabilitados.` });
      } else {
        setAviso({ tipo: "ok", texto: `Carga masiva completada: ${r.exitosos} registros exitosos.` });
      }
      await refreshData();
      setProcesando(false);
      setModalAbierto(false);
    };

    try {
      const response = await axios.post(
        `${enviroments.backendUrl}/api/consulta/carga-masiva`,
        { filas: filasExcel, userId, socketId: socketRef.current?.id },
        getAuthHeader()
      );

      if (response.data && response.data.jobId) {
        const jobId = response.data.jobId;

        pollingRef.current = setInterval(async () => {
          try {
            const estadoRes = await axios.get(
              `${enviroments.backendUrl}/api/consulta/carga-masiva/${jobId}`,
              getAuthHeader()
            );
            const job = estadoRes.data;

            if (job.total > 0) {
              setProgreso((prev) => ({ ...prev, actual: job.procesados || 0, total: job.total }));
            }

            if (job.estado === "completado") {
              setResultados({ resumen: job.resumen || {}, resultados: job.resultados || [] });
              await finalizarConResumen(job.resumen);
            } else if (job.estado === "error") {
              detenerPolling();
              setAviso({ tipo: "error", texto: job.error || "Error en la carga masiva." });
              setMensajeModal(`❌ ${job.error || "Error en la carga masiva."}`);
              setModalAbierto(true);
              setTimeout(() => setModalAbierto(false), 5000);
              setProcesando(false);
            }
          } catch (pollError) {
            console.error("Error consultando el estado de la carga masiva:", pollError);
          }
        }, 4000);
      } else if (response.data.success) {
        setResultados(response.data);
        await finalizarConResumen(response.data.resumen);
      } else {
        setAviso({ tipo: "error", texto: response.data.message });
        setMensajeModal(`❌ ${response.data.message}`);
        setModalAbierto(true);
        setTimeout(() => setModalAbierto(false), 5000);
        setProcesando(false);
      }
    } catch (error) {
      console.error("Error en carga masiva:", error);
      const msg = error.response?.data?.message || "Error en la carga masiva.";
      setAviso({ tipo: "error", texto: msg });
      setMensajeModal(`❌ ${msg}`);
      setModalAbierto(true);
      setTimeout(() => setModalAbierto(false), 5000);
      setProcesando(false);
    }
  };

  const filasConCedula = filasExcel.filter((f) => f.cedula);
  const filasVacias = filasExcel.length - filasConCedula.length;

  if (cargando) {
    return <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 max-w-6xl mx-auto">
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-white text-black p-6 rounded-xl shadow-lg max-w-md w-full">
            {procesando ? (
              <div className="text-center">
                <p className="text-sm mb-3">{mensajeModal}</p>
                {progreso.total > 0 && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {progreso.actual} de {progreso.total}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-center">{mensajeModal}</p>
            )}
          </div>
        </div>
      )}

      {aviso && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
          aviso.tipo === "ok"
            ? "bg-green-500/15 border-green-500/40 text-green-300"
            : "bg-red-500/15 border-red-500/40 text-red-300"
        }`}>
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

      {/* ─── Totales ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-gray-400">Total de registros: </span>
          <span className="font-semibold text-lg">{total}</span>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-center text-indigo-400 mb-6">Consulta Individual</h1>

      {/* ─── Formulario individual ─── */}
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row justify-center items-start md:items-end gap-2 mb-6">
        <div className="flex flex-col w-full md:w-96">
          <label className="text-xs text-gray-300 mb-1">Nombre completo</label>
          <input
            type="text"
            value={nombreCompleto}
            onChange={(e) => { if (e.target.value.length <= 100) setNombreCompleto(e.target.value); }}
            className="bg-[#1E293B] text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Ej: Pedro Pérez"
          />
        </div>
        <div className="flex flex-col w-full md:w-64">
          <label className="text-xs text-gray-300 mb-1">Cédula</label>
          <input
            type="text"
            value={cedula}
            onChange={(e) => {
              const valor = e.target.value;
              if (/^[0-9]*$/.test(valor) && valor.length <= 30) setCedula(valor);
            }}
            className="bg-[#1E293B] text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Ej: 123456789"
          />
        </div>
        <div className="flex flex-col w-full md:w-32">
          <label className="text-xs text-gray-300 mb-1">Folio</label>
          <input
            type="text"
            value={folio}
            onChange={(e) => { if (e.target.value.length <= 50) setFolio(e.target.value); }}
            className="bg-[#1E293B] text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Opcional"
          />
        </div>
        <div className="flex flex-col w-full md:w-32">
          <label className="text-xs text-gray-300 mb-1">Teléfono</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => {
              const valor = e.target.value;
              if (/^[0-9]*$/.test(valor) && valor.length <= 10) setTelefono(valor);
            }}
            className="bg-[#1E293B] text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Opcional"
          />
        </div>
        <button type="submit" className="bg-[rgba(133,59,206,0.27)] hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded w-full md:w-auto self-end">
          ENVIAR
        </button>
      </form>

      {/* ─── Carga Masiva ─── */}
      <div className="border-t border-slate-700 pt-6 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-indigo-400">📦 Carga Masiva</h2>
          <button onClick={handleDownloadPlantilla} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm transition">
            📋 Descargar Plantilla
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm cursor-pointer transition">
            📁 Seleccionar Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </label>
          {filasExcel.length > 0 && (
            <>
              <span className="text-sm text-slate-300">
                {filasConCedula.length} filas con cédula
                {filasVacias > 0 && <span className="text-slate-500"> ({filasVacias} vacías ignoradas)</span>}
              </span>
              <button onClick={limpiarPreview} className="text-slate-400 hover:text-white text-sm transition">✕ Limpiar</button>
            </>
          )}
        </div>

        {/* Preview */}
        {filasExcel.length > 0 && (
          <div className="mb-4">
            <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-700 rounded-lg">
              <table className="min-w-full text-sm bg-[#1E293B] text-white">
                <thead className="bg-slate-700 text-xs uppercase text-slate-300 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Cédula</th>
                    <th className="px-3 py-2 text-left">Nombre completo</th>
                    <th className="px-3 py-2 text-left">Folio</th>
                    <th className="px-3 py-2 text-left">Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {filasExcel.map((f, i) => (
                    <tr key={i} className={`border-t border-slate-700/50 ${f.cedula ? "" : "opacity-40"}`}>
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5">{f.cedula || <span className="text-slate-500">(vacío)</span>}</td>
                      <td className="px-3 py-1.5">{f.nombreCompleto || "-"}</td>
                      <td className="px-3 py-1.5">{f.folio || "-"}</td>
                      <td className="px-3 py-1.5">{f.telefono || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!procesando && (
              <button
                onClick={handleProcesar}
                disabled={filasConCedula.length === 0}
                className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🚀 Procesar {filasConCedula.length} consultas
              </button>
            )}
          </div>
        )}

        {/* Progreso */}
        {procesando && (
          <div className="mb-4 bg-slate-800/60 border border-slate-700/30 rounded-xl p-4">
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Procesando...</span>
              <span>{progreso.actual} de {progreso.total}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progreso.total > 0 ? (progreso.actual / progreso.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 truncate">{progreso.cedula}</p>
          </div>
        )}

        {/* Resultados */}
        {resultados && (
          <div className="mb-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{resultados.resumen.exitosos}</p>
                <p className="text-xs text-green-300">Exitosos</p>
              </div>
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{resultados.resumen.duplicados}</p>
                <p className="text-xs text-amber-300">Duplicados</p>
              </div>
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{resultados.resumen.inhabilitados}</p>
                <p className="text-xs text-red-300">Inhabilitados</p>
              </div>
              <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-400">{resultados.resumen.errores}</p>
                <p className="text-xs text-rose-300">Errores</p>
              </div>
              <div className="bg-slate-500/20 border border-slate-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-300">{resultados.resumen.omitidos}</p>
                <p className="text-xs text-slate-400">Omitidos</p>
              </div>
            </div>

            {/* Tabla detalle */}
            <div className="overflow-x-auto max-h-72 overflow-y-auto border border-slate-700 rounded-lg">
              <table className="min-w-full text-sm bg-[#1E293B] text-white">
                <thead className="bg-slate-700 text-xs uppercase text-slate-300 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Cédula</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.resultados.map((r, i) => (
                    <tr key={i} className="border-t border-slate-700/50">
                      <td className="px-3 py-1.5">{r.cedula}</td>
                      <td className="px-3 py-1.5">{r.nombreCompleto || "-"}</td>
                      <td className="px-3 py-1.5">
                        {r.estado === "exitoso" && <span className="text-green-400 font-medium">✅</span>}
                        {r.estado === "duplicado" && <span className="text-amber-400 font-medium">❌ Duplicado</span>}
                        {r.estado === "inhabilitado" && <span className="text-red-400 font-medium">⛔ Inhabilitado</span>}
                        {r.estado === "error" && <span className="text-rose-400 font-medium">⚠️ Error</span>}
                        {r.estado === "omitido" && <span className="text-slate-500">— Omitido</span>}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400 text-xs">{r.mensaje}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Tabla de consultas existentes ─── */}
      <div className="overflow-x-auto mt-6">
        <table className="min-w-full bg-[#1E293B] text-white border border-gray-700 rounded-md overflow-hidden">
          <thead className="bg-indigo-600 text-xs font-semibold uppercase text-white">
            <tr>
              <th className="px-4 py-2 border border-gray-700">Folio</th>
              <th className="px-4 py-2 border border-gray-700">Teléfono</th>
              <th className="px-4 py-2 border border-gray-700">Nombre</th>
              <th className="px-4 py-2 border border-gray-700">Cédula</th>
              <th className="px-4 py-2 border border-gray-700">Departamento</th>
              <th className="px-4 py-2 border border-gray-700">Municipio</th>
              <th className="px-4 py-2 border border-gray-700">Puesto</th>
              <th className="px-4 py-2 border border-gray-700">Dirección</th>
              <th className="px-4 py-2 border border-gray-700">Mesa</th>
              <th className="px-4 py-2 border border-gray-700"></th>
            </tr>
          </thead>
          <tbody>
            {consultas.map((item, index) => (
              <tr key={index} className="text-sm text-white hover:bg-[#334155] transition">
                <td className="px-4 py-2 border border-gray-700 text-center">{item.folio || "-"}</td>
                <td className="px-4 py-2 border border-gray-700 text-center">{item.telefono || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.nombreCompleto || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.cedula}</td>
                <td className="px-4 py-2 border border-gray-700">{item.departamento || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.municipio || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.puesto || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.direccion || "-"}</td>
                <td className="px-4 py-2 border border-gray-700 text-center">{item.mesa || "-"}</td>
                <td className="px-4 py-2 border border-gray-700 text-center">
                  <button onClick={() => handleDelete(item.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {consultas.length === 0 && (
              <tr>
                <td colSpan="10" className="text-center py-4 text-gray-400">No hay consultas registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Exportación debajo de la tabla ─── */}
      <div className="flex justify-end mt-4">
        <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm transition">
          ⬇ Descargar Excel
        </button>
      </div>
    </div>
  );
}
