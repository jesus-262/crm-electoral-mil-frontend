import { useState } from "react";
import axios from "axios";
import { enviroments } from "../env";

export default function BotonDescargarExcel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        enviroments.backendUrl + "/api/graficas/descargarexcelgeneral",
        { responseType: "blob", headers: { Authorization: `Bearer ${token}` } }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "consultas.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error descargando el Excel:", err);
      setError("No se pudo descargar el Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {error && <p className="text-red-400 text-sm bg-slate-900/90 px-3 py-1.5 rounded-lg shadow-lg">{error}</p>}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="px-4 py-2.5 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Descargando...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar Excel General
          </>
        )}
      </button>
    </div>
  );
}
