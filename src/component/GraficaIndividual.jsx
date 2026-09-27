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

export default function GraficaIndividual({ userId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(enviroments.backendUrl + `/api/graficas/comunaspuesto/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
        console.log('📊 GraficaIndividual - data:', res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) return <p>Cargando datos...</p>;
  if (error) return <p>{error}</p>;
  if (!data.length) return <p>No hay registros para este usuario.</p>;

  const labels = data.map((item) => `${item.Departamento} - ${item.Municipio} - ${item.puesto} - ${item.COMUNA}`);
  const valores = data.map((item) => item.total_registros);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Grafica por comuna y puesto",
        data: valores,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Registros por comuna y puesto de votación",
      },
    },
    maintainAspectRatio: false, // importante para que la altura fija funcione
  };

  return (
    
    <div className="p-4 bg-white rounded-2xl shadow-md mt-6" style={{ height: "500px" }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
