import { useEffect, useState } from "react";
import axios from "axios";
import { enviroments } from "../env";

export default function MapaComunasBloques() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(
          `${enviroments.backendUrl}/api/graficas/mapa/comunas`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("No se pudieron cargar los datos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center py-16">
        <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error)
    return <p className="text-red-400 text-center py-16">{error}</p>;

  if (!data.length)
    return <p className="text-slate-400 text-center py-16">No hay datos disponibles.</p>;

  const registros = data.map((d) => Number(d.total_registros));
  const maxReg = Math.max(...registros);
  const minReg = Math.min(...registros);
  const range = maxReg - minReg || 1;

  const getRatio = (val) => (val - minReg) / range;

  const getColor = (val) => {
    const ratio = getRatio(val);
    if (ratio > 0.66) return { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400", bar: "bg-red-500" };
    if (ratio > 0.33) return { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400", bar: "bg-amber-500" };
    return { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400", bar: "bg-green-500" };
  };

  const masVotada = data.reduce((a, b) =>
    Number(a.total_registros) > Number(b.total_registros) ? a : b
  );

  const sorted = [...data].sort((a, b) => {
    const numA = parseInt(a.COMUNA?.match(/\d+/)?.[0] || "0");
    const numB = parseInt(b.COMUNA?.match(/\d+/)?.[0] || "0");
    return numA - numB;
  });

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sorted.map((d, i) => {
          const total = Number(d.total_registros);
          const styles = getColor(total);
          const pct = (total / maxReg) * 100;
          const esMasVotada = d.COMUNA === masVotada.COMUNA;

          return (
            <div
              key={i}
              className={`relative rounded-xl border p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${styles.bg} ${styles.border}`}
            >
              {esMasVotada && (
                <span className="absolute top-2 right-2 text-sm" title="Más votada">🏆</span>
              )}
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                {d.COMUNA?.replace("COMUNA ", "C. ")}
              </p>
              <p className={`text-3xl font-bold mt-1 ${styles.text}`}>
                {total.toLocaleString()}
              </p>
              {d.Municipio && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{d.Municipio}</p>
              )}
              <div className="mt-3 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-slate-800/60 border border-slate-700/30 rounded-xl p-4 text-sm flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="text-slate-300">Bajo ({minReg})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          <span className="text-slate-300">Medio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="text-slate-300">Alto ({maxReg})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🏆</span>
          <span className="text-slate-300">
            {masVotada.COMUNA} — {Number(masVotada.total_registros).toLocaleString()} registros
          </span>
        </div>
      </div>
    </div>
  );
}
