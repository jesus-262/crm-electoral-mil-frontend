import { useEffect, useState } from "react";
import axios from "axios";
import { enviroments } from "../env";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapaComunas() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${enviroments.backendUrl}/api/graficas/mapa/comunas`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(res.data);
      } catch (err) {
        console.error("Error al cargar mapa:", err);
        setError("No se pudieron cargar los datos del mapa.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center py-16">
        <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error)
    return <p className="text-red-400 text-center py-16">{error}</p>;

  const registros = data.map((d) => Number(d.total_registros));
  const maxReg = registros.length ? Math.max(...registros) : 0;
  const minReg = registros.length ? Math.min(...registros) : 0;
  const range = maxReg - minReg || 1;

  const getRadius = (val) => 7 + ((val - minReg) / range) * 18;

  const getColor = (val) => {
    const ratio = (val - minReg) / range;
    if (ratio > 0.66) return "#ef4444";
    if (ratio > 0.33) return "#f59e0b";
    return "#22c55e";
  };

  const masVotada = data.length
    ? data.reduce((a, b) =>
        Number(a.total_registros) > Number(b.total_registros) ? a : b
      )
    : null;

  const validData = data.filter(
    (d) => d.lat && d.lng && Number(d.total_registros) > 0
  );

  if (!validData.length)
    return (
      <p className="text-slate-400 text-center py-16">
        No hay datos con coordenadas para mostrar en el mapa.
      </p>
    );

  return (
    <div className="relative">
      <MapContainer
        center={[3.45, -76.5]}
        zoom={10}
        className="w-full rounded-2xl shadow-lg"
        style={{ height: "500px" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validData.map((d, i) => {
          const total = Number(d.total_registros);
          return (
            <CircleMarker
              key={i}
              center={[Number(d.lat), Number(d.lng)]}
              radius={getRadius(total)}
              pathOptions={{
                color: getColor(total),
                fillColor: getColor(total),
                fillOpacity: 0.7,
                weight: 2,
                opacity: 0.9,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <span className="font-semibold">{d.COMUNA}</span>
                <br />
                <span className="text-xs">
                  {d.Municipio} &middot; {total} registros
                </span>
              </Tooltip>
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-bold text-base">{d.COMUNA}</p>
                  {d.Municipio && (
                    <p className="text-gray-600">{d.Municipio}</p>
                  )}
                  <p className="font-semibold mt-1.5 text-lg">{total} registros</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[140px]">
        <p className="font-semibold text-gray-700 mb-1">Registros</p>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Bajo ({minReg})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-600">Medio</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Alto ({maxReg})</span>
        </div>
        {masVotada && (
          <div className="border-t border-gray-200 pt-1.5 mt-1">
            <p className="text-gray-500">🏆 Más votada</p>
            <p className="font-bold text-gray-800">{masVotada.COMUNA}</p>
            <p className="text-gray-500">{masVotada.total_registros} registros</p>
          </div>
        )}
      </div>

      {/* Scale */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl p-2.5 shadow-lg text-xs space-y-1.5">
        <p className="font-semibold text-gray-700">Escala</p>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-blue-500/60" style={{ width: "7px", height: "7px" }} />
          <span className="text-gray-600">Menos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-blue-500/60" style={{ width: "20px", height: "20px" }} />
          <span className="text-gray-600">Más</span>
        </div>
      </div>
    </div>
  );
}
