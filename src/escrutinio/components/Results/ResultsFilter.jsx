export default function ResultsFilter({
  departamento,
  municipio,
  zona,
  puesto,
  options,
  handleDepartamento,
  handleMunicipio,
  handleZona,
  handlePuesto,
  resetFilters,
  anyFilterActive,
  totalRecords,
  filteredCount,
}) {
  const showMunicipio = Boolean(departamento);
  const showZona = showMunicipio && Boolean(municipio);
  const showPuesto = showZona && Boolean(zona);

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm bg-white mb-3">
      <div className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div>
            <label className="text-xs font-semibold mb-0.5 block">Departamento</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={departamento} onChange={e => handleDepartamento(e.target.value)}>
              <option value="">Todos</option>
              {options.departamentos.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-0.5 block">Municipio</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full disabled:bg-gray-100" value={municipio} onChange={e => handleMunicipio(e.target.value)} disabled={!showMunicipio}>
              <option value="">Todos</option>
              {options.municipios.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-0.5 block">Zona</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full disabled:bg-gray-100" value={zona} onChange={e => handleZona(e.target.value)} disabled={!showZona}>
              <option value="">Todas</option>
              {options.zonas.map(z => (
                <option key={z} value={z}>Zona {z}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-0.5 block">Puesto</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full disabled:bg-gray-100" value={puesto} onChange={e => handlePuesto(e.target.value)} disabled={!showPuesto}>
              <option value="">Todos</option>
              {options.puestos.map(p => (
                <option key={p} value={p}>Puesto {p}</option>
              ))}
            </select>
          </div>
          <div>
            <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-50" onClick={resetFilters} disabled={!anyFilterActive}>
              Limpiar filtros
            </button>
          </div>
        </div>
        {anyFilterActive && (
          <div className="text-gray-500 text-xs mt-2">
            Mostrando {filteredCount} de {totalRecords} mesas
          </div>
        )}
      </div>
    </div>
  );
}
