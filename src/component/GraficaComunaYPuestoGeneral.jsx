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

export default function GraficaComunaYPuestoGeneral() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          enviroments.backendUrl + "/api/graficas/comunaspuestogeneral",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(res.data);
        console.log('📊 GraficaComunaYPuestoGeneral - data:', res.data);
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
  if (!data.length) return <p>No hay registros.</p>;

  // Ordenar por COMUNA y luego por total_registros descendente
  const sortedData = [...data].sort((a, b) => {
    if (a.COMUNA === b.COMUNA) return b.total_registros - a.total_registros;
    const numA = parseInt(a.COMUNA.replace('COMUNA ', ''));
    const numB = parseInt(b.COMUNA.replace('COMUNA ', ''));
    return numA - numB;
  });

  const labels = sortedData.map((item) => `${item.Departamento || ''} - ${item.Municipio || ''} - ${item.puesto || ''} - ${item.COMUNA || ''}`);
  const valores = sortedData.map((item) => item.total_registros);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Registros por comuna y puesto",
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
        text: "Gráfica General por comuna y puesto de votación",
        font: { size: 20 },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md" style={{ height: "500px" }}>
      <Bar data={chartData} options={options} />    </div>
  );
}
