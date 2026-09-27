import { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { enviroments } from '../env';
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

export default function GraficaComunasGeneral() {
  const [data, setData] = useState({ rows: [], totalRegistros: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(enviroments.backendUrl + "/api/graficas/comunasgeneral", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData({
          rows: res.data.rows || [],
          totalRegistros: res.data.totalRegistros || 0
        });
        console.log('📊 GraficaComunasGeneral - rows:', res.data.rows);
      } catch (err) {
        console.error("Error al obtener datos:", err);
        setError("No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p>Cargando datos...</p>;
  if (error) return <p>{error}</p>;
  if (!data.rows.length) return <p>No hay registros.</p>;

  // Ordenar comunas por número
  const sortedData = [...data.rows].sort((a, b) => {
    const numA = parseInt(a.COMUNA.replace('COMUNA ', ''));
    const numB = parseInt(b.COMUNA.replace('COMUNA ', ''));
    return numA - numB;
  });

  const labels = sortedData.map((item) => `${item.Departamento || ''} - ${item.Municipio || ''} - ${item.COMUNA || ''}`);
  const valores = sortedData.map((item) => item.total_registros);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Registros por comuna",
        data: valores,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Gráfica General por comuna",
        font: { size: 20 },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md">
      {/* 🔹 Mostrar total de registros */}
      <div className="mb-4 text-gray-700 font-medium">
        Total de registros: {data.totalRegistros}
      </div>

      {/* 📊 Gráfica */}
      <div style={{ height: "450px" }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
