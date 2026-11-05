import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { enviroments } from "../../env";

export default function EditarUsuario() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nombre: "", cedula: "", email: "", role: "", id_lider: "", password: "" });
  const [lideres, setLideres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [userRes, usersRes] = await Promise.all([
          axios.get(`${enviroments.backendUrl}/api/users/${userId}`, config),
          axios.get(`${enviroments.backendUrl}/api/admin/users`, config),
        ]);

        const user = userRes.data;
        setForm({
          nombre: user.nombre || "",
          cedula: user.cedula || "",
          email: user.email || "",
          role: user.role || "",
          id_lider: user.id_lider || "",
          password: "",
        });

        const lideresList = usersRes.data.filter((u) => u.role === "Lider" && u.id !== user.id);
        setLideres(lideresList);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("No se pudo cargar la información del usuario.");
      } finally {
        setCargando(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${enviroments.backendUrl}/api/admin/users/${userId}`,
        {
          nombre: form.nombre,
          cedula: form.cedula,
          email: form.email.trim() || undefined,
          role: form.role,
          id_lider: form.role === "Sublider" ? Number(form.id_lider) : undefined,
          password: form.password || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate("/admin");
    } catch (err) {
      const msg = err.response?.data?.message || "Error al guardar los cambios.";
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-indigo-400">✏️ Editar Usuario</h1>
        <button
          onClick={() => navigate("/admin")}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition"
        >
          ← Cancelar
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            maxLength={100}
            className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1">Cédula</label>
          <input
            type="text"
            name="cedula"
            value={form.cedula}
            onChange={handleChange}
            maxLength={20}
            className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1">Email (Opcional)</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            maxLength={100}
            className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1">Rol</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            required
            disabled={form.role === "Administrador"}
            className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">Seleccione...</option>
            <option value="Administrador">Administrador</option>
            <option value="Lider">Lider</option>
            <option value="Sublider">Sublider</option>
          </select>
          {form.role === "Administrador" && (
            <p className="text-xs text-slate-500 mt-1">El rol de Administrador no puede modificarse.</p>
          )}
        </div>

        {form.role === "Sublider" && (
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">Líder asignado</label>
            <select
              name="id_lider"
              value={form.id_lider}
              onChange={handleChange}
              required
              className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="">Seleccione un líder...</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.cedula})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1">
            Contraseña <span className="text-slate-500 font-normal">(dejar vacío para no cambiar)</span>
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            maxLength={72}
            placeholder="••••••••"
            className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "💾 Guardar Cambios"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-medium transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
