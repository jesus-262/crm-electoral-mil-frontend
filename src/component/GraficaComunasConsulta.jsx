import { useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { enviroments } from "../env";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function GraficaComunasConsulta() {
  const [data, setData] = useState({ rows: [], totalRegistros: 0 });
  const [dato, setDato] = useState("");
  const [data2, setData2] = useState({ rows: [], totalRegistros: 0, usuario: null });
  const [data3, setData3] = useState({ rows: [], totalRegistros: 0 }); // Nueva consulta
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [seHaBuscado, setSeHaBuscado] = useState(false);

  const fetchData = async () => {
    if (!dato.trim()) return;

    setLoading(true);
    setError("");
    setAviso("");
    setSeHaBuscado(true);
    setData({ rows: [], totalRegistros: 0 });
    setData2({ rows: [], totalRegistros: 0, usuario: null });
    setData3({ rows: [], totalRegistros: 0 });

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const baseUrl = enviroments.backendUrl;
      const encodedDato = encodeURIComponent(dato);

      // 🔹 Capturar el error de cada petición por separado para saber qué pasó
      const errs = [null, null, null];

      const [res1, res2, res3] = await Promise.all([
        axios.get(`${baseUrl}/api/graficas/comunas/consulta/${encodedDato}`, config).catch((err) => {
          console.error("Error en comunas/consulta:", err);
          errs[0] = err;
          return null;
        }),
        axios.get(`${baseUrl}/api/graficas/comunas/lideres/${encodedDato}`, config).catch((err) => {
          console.error("Error en comunas/lideres:", err);
          errs[1] = err;
          return null;
        }),
        axios.get(`${baseUrl}/api/graficas/comunas/consulta/comunapuesto/${encodedDato}`, config).catch((err) => {
          console.error("Error en comunas/consulta/comunapuesto:", err);
          errs[2] = err;
          return null;
        }),
      ]);

      if (res1) {
        setData(res1.data);
      }

      if (res2) {
        setData2({
          rows: res2.data.rows || [],
          totalRegistros: res2.data.totalRegistros || 0,
          usuario: res2.data.usuario || null,
        });
      }

      if (res3) {
        setData3({
          rows: res3.data.rows || [],
          totalRegistros: res3.data.totalRegistros || 0,
        });
      }

      const usuarioEncontrado = res1?.data?.usuario || res2?.data?.usuario || null;
      const tieneDatosGrafica =
        (res1?.data?.rows?.length || 0) > 0 || (res3?.data?.rows?.length || 0) > 0;

      if (!res1 && !res2 && !res3) {
        // Las 3 fallaron → usuario no existe (404) o error de servidor (5xx)
        const hayErrorServidor = errs.some((e) => e?.response?.status >= 500);
        setError(
          hayErrorServidor
            ? "Error inesperado al realizar la consulta."
            : "No se encontraron resultados. Verifique el nombre o cédula."
        );
      } else if (usuarioEncontrado && !tieneDatosGrafica) {
        // Usuario existe pero no tiene consultas que graficar
        setAviso(
          `El usuario ${usuarioEncontrado.nombre} (cédula ${usuarioEncontrado.cedula}) existe, pero no tiene consultas registradas.`
        );
      }
    } catch (err) {
      console.error("Error inesperado:", err);
      setError("Error inesperado al realizar la consulta.");
    } finally {
      setLoading(false);
    }
  };

  // Preparar los datos para la gráfica principal (comunas)
  const rows = data.rows || [];
  const sortedData = [...rows].sort((a, b) => a.total_registros - b.total_registros);

  const labels = sortedData.map((item) => `${item.Departamento || ''} - ${item.Municipio || ''} - ${item.COMUNA || ''}`);
  const valores = sortedData.map((item) => item.total_registros);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Registros por comuna",
        data: valores,
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Gráfica por comuna — registros del ${data.usuario?.role || "usuario"}`,
        font: { size: 20 },
        color: "#1f2937",
      },
      legend: { display: false },
    },
  };

  // 🔹 Preparar gráfica para comunapuesto
  const rows3 = data3.rows || [];
  const labels3 = rows3.map((item) => `${item.Departamento || ''} - ${item.Municipio || ''} - ${item.puesto || ''} - ${item.COMUNA || ''}`);
  const valores3 = rows3.map((item) => item.total_registros);

  const chartData3 = {
    labels: labels3,
    datasets: [
      {
        label: "Registros por comuna y puesto",
        data: valores3,
        backgroundColor: "rgba(16, 185, 129, 0.6)", // color diferente
        borderRadius: 6,
      },
    ],
  };

  const options3 = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Gráfica por comuna y puesto — registros del ${data.usuario?.role || "usuario"}`,
        font: { size: 20 },
        color: "#1f2937",
      },
      legend: { display: false },
    },
  };

  // 🔹 Suma de consultas de los sublideres (para la etiqueta de la tabla)
  const totalConsultasSublideres = data2.rows.reduce(
    (sum, r) => sum + (Number(r.totalConsultas) || 0),
    0
  );

  // 🔹 Función para descargar Excel filtrado por dato
  const handleDownload = async () => {
    if (!dato.trim()) {
      setError("Debe ingresar un nombre o cédula para descargar");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${enviroments.backendUrl}/api/graficas/descargarexcel/${encodeURIComponent(dato)}`,
        { responseType: "blob", headers: { Authorization: `Bearer ${token}` } }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `consultas_${dato}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error descargando el Excel:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "No se pudo descargar el Excel";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 🔎 INPUT Y BOTÓN */}
      <div className="mb-5 max-w-2xl mx-auto">
        <label className="block text-slate-300 text-sm font-medium mb-2">
          Nombre Completo o Cédula
        </label>
        <p className="text-slate-500 text-xs mb-2">
          Busca por nombre o cédula de un <span className="text-slate-300 font-medium">usuario del sistema</span> (la persona que registra las consultas).
          Se muestra cuántos <span className="text-slate-300 font-medium">registros (consultas de cédulas)</span> tiene ese usuario y en qué comunas y puestos de votación están.
        </p>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={dato}
              onChange={(e) => setDato(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              placeholder="Ej: Pedro Pérez"
              className="w-full bg-slate-800 text-white placeholder-slate-400 border border-slate-600 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition flex items-center gap-2 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </div>

        {/* 🔹 Totales de la búsqueda */}
        {seHaBuscado && data.usuario && (
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 items-center">
            <p className="text-white font-medium">
              Total de registros del {data.usuario.role}:{" "}
              <span className="text-blue-400">{data.totalRegistros || 0}</span>
            </p>
            {data.usuario.role === "Lider" && data2.rows.length > 0 && (
              <>
                <p className="text-white font-medium">
                  Registros de los sublideres:{" "}
                  <span className="text-emerald-400">{totalConsultasSublideres}</span>
                </p>
                <p className="text-white font-semibold">
                  Total general:{" "}
                  <span className="text-amber-400">
                    {(data.totalRegistros || 0) + totalConsultasSublideres}
                  </span>
                </p>
              </>
            )}
          </div>
        )}

        {/* 🔹 Líderes / Sublíderes */}
        {data2.rows.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            {data2.usuario && (
              <p className="text-slate-300 text-sm font-medium mb-2">
                {data2.usuario.role === "Lider"
                  ? `Sublideres: ${data2.rows.length}`
                  : data2.usuario.role === "Sublider"
                  ? `Lider asignado: ${data2.rows.length}`
                  : `Usuarios relacionados: ${data2.rows.length}`}
              </p>
            )}
            <table className="w-full text-sm text-white">
              <thead>
                <tr className="border-b border-slate-600 text-slate-400 uppercase text-xs tracking-wider">
                  <th className="text-left py-2 px-3 font-medium">Nombre</th>
                  <th className="text-left py-2 px-3 font-medium">Cédula</th>
                  <th className="text-left py-2 px-3 font-medium">Rol</th>
                  <th className="text-right py-2 px-3 font-medium">Consultas</th>
                </tr>
              </thead>
              <tbody>
                {data2.rows.map((u, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-2.5 px-3">{u.nombre}</td>
                    <td className="py-2.5 px-3 text-slate-300">{u.cedula}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-3 font-medium">
                      {u.totalConsultas !== undefined ? u.totalConsultas : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 📊 GRÁFICA principal */}
      <div className="p-6 bg-white rounded-2xl shadow-lg mb-8">
        {loading && <p className="text-gray-500">Cargando datos...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {aviso && <p className="text-amber-500">{aviso}</p>}
        {!loading && !error && !aviso && rows.length === 0 && (
          <p className="text-gray-500">No hay registros para mostrar.</p>
        )}

        {rows.length > 0 && (
          <div style={{ height: "500px" }}>
            <Bar data={chartData} options={options} />
          </div>
        )}
      </div>

      {/* 📊 GRÁFICA comunapuesto */}
      {rows3.length > 0 && (
        <div className="p-6 bg-white rounded-2xl shadow-lg mb-8">
          <div style={{ height: "500px" }}>
            <Bar data={chartData3} options={options3} />
          </div>
        </div>
      )}

      {/* 🔹 BOTÓN DESCARGA EXCEL */}
      <div className="flex flex-col items-center">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Descargando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar Excel
            </>
          )}
        </button>
      </div>
    </div>
  );
}
