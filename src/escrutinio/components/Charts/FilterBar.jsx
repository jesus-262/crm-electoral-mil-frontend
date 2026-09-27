import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0d6efd', '#dc3545', '#198754', '#ffc107', '#0dcaf0', '#6f42c1', '#fd7e14', '#20c997', '#d63384', '#6610f2'];

function truncarNombre(nombre, max = 26) {
  if (!nombre) return '';
  return nombre.length > max ? `${nombre.substring(0, max)}…` : nombre;
}

export default function FilterBar({ filters, setFilters, filterOptions, aggregateData, filteredRecords }) {
  const { departamento, municipio, zona, puesto, mesa } = filters;
  const { setDepartamento, setMunicipio, setZona, setPuesto, setMesa } = setFilters;

  const chartData = aggregateData.candidatos.map(c => ({
    name: c.nombreLista
      ? `${c.nombreLista} #${c.numero}`
      : (c.nombre || `Candidato #${c.numero}`),
    votos: c.votos,
    numero: c.numero
  }));

  const nombreGanador = (c) => c.nombreLista
    ? `${c.nombreLista} #${c.numero}`
    : (c.nombre || `#${c.numero}`);

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
        <h5 className="font-semibold m-0">Gráficos y Análisis</h5>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" value={departamento} onChange={e => setDepartamento(e.target.value)}>
            <option value="">Todos los departamentos</option>
            {filterOptions.departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" value={municipio} onChange={e => setMunicipio(e.target.value)}>
            <option value="">Todos los municipios</option>
            {filterOptions.municipios.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" value={zona} onChange={e => setZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {filterOptions.zonas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" value={puesto} onChange={e => setPuesto(e.target.value)}>
            <option value="">Todos los puestos</option>
            {filterOptions.puestos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" value={mesa} onChange={e => setMesa(e.target.value)}>
            <option value="">Todas las mesas</option>
            {filterOptions.mesas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="m-0">Procesá PDFs para ver gráficos estadísticos.</p>
            <small>Los filtros se llenan automáticamente con los datos extraídos.</small>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="bg-gray-50 rounded p-3 text-center">
                <small className="text-gray-500">Total de votos</small>
                <h4 className="m-0">{aggregateData.totalVotos.toLocaleString()}</h4>
              </div>
              <div className="bg-gray-50 rounded p-3 text-center">
                <small className="text-gray-500">Mesas analizadas</small>
                <h4 className="m-0">{aggregateData.mesasCount}</h4>
              </div>
              <div className="bg-gray-50 rounded p-3 text-center">
                <small className="text-gray-500">Candidato ganador</small>
                {aggregateData.ganador ? (
                  <div>
                    <h5 className="m-0">
                      {truncarNombre(nombreGanador(aggregateData.ganador), 40)}
                    </h5>
                    <small className="text-gray-500">
                      {aggregateData.segundo && (
                        <>{truncarNombre(nombreGanador(aggregateData.segundo), 30)} ({aggregateData.segundo.votos}) · Dif: {aggregateData.diferencia}</>
                      )}
                    </small>
                  </div>
                ) : (
                  <h5 className="m-0">-</h5>
                )}
              </div>
            </div>

            {aggregateData.hasListas && (
              <div className="bg-gray-50 rounded p-3 mb-3">
                <h6 className="text-sm font-semibold mb-2">Totales por lista</h6>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {aggregateData.listas.map(l => (
                    <div key={l.numeroLista} className="bg-white border border-gray-200 rounded p-2 text-center">
                      <small className="text-gray-500 block">Lista {l.numeroLista} {l.nombreLista && `· ${l.nombreLista}`}</small>
                      <strong className="text-sm">{l.totalAgrupacion.toLocaleString()} votos</strong>
                      <small className="text-gray-400 block">({l.tipo || 'Con voto preferente'})</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h6 className="text-center text-sm font-semibold mb-2">Votos por candidato</h6>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={260}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(name) => truncarNombre(name)}
                    />
                    <Tooltip formatter={(value, name, props) => [`${value} votos`, props?.payload?.name]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="votos" name="Votos" fill="#0d6efd" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h6 className="text-center text-sm font-semibold mb-2">Participación porcentual</h6>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="votos"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) => `${truncarNombre(name, 18)} ${(percent * 100).toFixed(1)}%`}
                      labelLine={false}
                      style={{ fontSize: 10 }}
                    >
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value} votos`, props?.payload?.name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
