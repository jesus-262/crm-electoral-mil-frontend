import { useMemo } from 'react';
import ExcelJS from 'exceljs';
import { useComisionesData } from '../../hooks/useComisionesData';
import ResultCard from '../Results/ResultCard';

export default function ComisionesFilter({ records = [] }) {
  const {
    departamento,
    municipio,
    zona,
    puesto,
    zonal,
    loading,
    error,
    options,
    resultados,
    handleDepartamento,
    handleMunicipio,
    handleZona,
    handlePuesto,
    handleZonal,
    resetFilters,
    divipoleData,
  } = useComisionesData();

  const showMunicipio = Boolean(departamento);
  const showZonal = showMunicipio && Boolean(municipio);
  const showZona = showZonal && zonal !== null;
  const showPuesto = showZona && Boolean(zona);

  const matches = useMemo(() => {
    if (zonal === null || !zona || !puesto || records.length === 0) return [];

    return records.filter(r => {
      if (!r.procesado) return false;
      if (String(r.departamentoCodigo || '') !== departamento) return false;
      if (String(r.municipioCodigo || '') !== municipio) return false;
      if (String(r.zona || '') !== zona) return false;
      if (String(r.puesto || '').padStart(2, '0') !== puesto) return false;
      return true;
    });
  }, [zonal, zona, puesto, records, departamento, municipio]);

  const divipoleInfo = useMemo(() => {
    if (!divipoleData || !departamento || !municipio || !zona || !puesto) return null;

    return divipoleData.registros?.find(r =>
      r.departamento === parseInt(departamento, 10) &&
      r.municipio === municipio &&
      r.zona === zona &&
      r.puesto === puesto
    ) || null;
  }, [divipoleData, departamento, municipio, zona, puesto]);

  const handleExportExcel = async () => {
    if (matches.length === 0) return;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Comisiones');

    ws.columns = [
      { header: 'Archivo', key: 'Archivo' },
      { header: 'Depto Cód', key: 'Depto Cód' },
      { header: 'Depto Nombre', key: 'Depto Nombre' },
      { header: 'Muni Cód', key: 'Muni Cód' },
      { header: 'Muni Nombre', key: 'Muni Nombre' },
      { header: 'Zona', key: 'Zona' },
      { header: 'Puesto', key: 'Puesto' },
      { header: 'Mesa', key: 'Mesa' },
      { header: 'Lugar', key: 'Lugar' },
      { header: 'Sufragantes', key: 'Sufragantes' },
      { header: 'Votos Urna', key: 'Votos Urna' },
      { header: 'Votos Incinerados', key: 'Votos Incinerados' },
      { header: 'Blanco', key: 'Blanco' },
      { header: 'Nulos', key: 'Nulos' },
      { header: 'No Marcados', key: 'No Marcados' },
      { header: 'Total Mesa', key: 'Total Mesa' },
      { header: 'Validación', key: 'Validación' },
      { header: 'Firmas Estado', key: 'Firmas Estado' },
      { header: 'Firmas Detectadas', key: 'Firmas Detectadas' },
      { header: 'Recuento', key: 'Recuento' },
      { header: 'Solicitado Por', key: 'Solicitado Por' },
      { header: 'Representación De', key: 'Representación De' },
      { header: 'Candidato #', key: 'Candidato #' },
      { header: 'Candidato Nombre', key: 'Candidato Nombre' },
      { header: 'Candidato Votos', key: 'Candidato Votos' },
      { header: 'PDF Link', key: 'PDF Link' },
      { header: 'Observaciones', key: 'Observaciones' },
      { header: 'Lista #', key: 'Lista #' },
      { header: 'Lista Nombre', key: 'Lista Nombre' },
      { header: 'Lista Tipo', key: 'Lista Tipo' },
      { header: 'Votos por Lista', key: 'Votos por Lista' },
      { header: 'Total Agrupación', key: 'Total Agrupación' },
      { header: 'Marca Cruz', key: 'Marca Cruz' },
      { header: 'Página', key: 'Página' },
      { header: 'Firmas Jurados', key: 'Firmas Jurados' },
    ];

    const rows = [];
    matches.forEach(r => {
      const base = {
        'Archivo': r.archivo || '',
        'Depto Cód': r.departamentoCodigo || '',
        'Depto Nombre': r.departamento || '',
        'Muni Cód': r.municipioCodigo || '',
        'Muni Nombre': r.municipio || '',
        'Zona': r.zona || '',
        'Puesto': r.puesto || '',
        'Mesa': r.mesa || '',
        'Lugar': r.lugar || '',
        'Sufragantes': r.totalSufragantes ?? '',
        'Votos Urna': r.totalVotosUrna ?? '',
        'Votos Incinerados': r.totalVotosIncinerados ?? '',
        'Blanco': r.votosBlanco ?? '',
        'Nulos': r.votosNulos ?? '',
        'No Marcados': r.votosNoMarcados ?? '',
        'Total Mesa': r.totalVotosMesa ?? '',
        'Validación': r.validacion?.resultado ?? '',
        'Firmas Estado': r.firmas?.estado ?? '',
        'Firmas Detectadas': r.firmas?.detectadas ?? '',
        'Recuento': r.recuento === true ? 'SÍ' : r.recuento === false ? 'NO' : '',
        'Solicitado Por': r.solicitadoPor || '',
        'Representación De': r.representacionDe || '',
        'Candidato #': '',
        'Candidato Nombre': '',
        'Candidato Votos': '',
        'PDF Link': r.pdfUrl || '',
        'Observaciones': (r.observaciones || []).join('; '),
        'Lista #': '',
        'Lista Nombre': '',
        'Lista Tipo': '',
        'Votos por Lista': '',
        'Total Agrupación': '',
        'Marca Cruz': '',
        'Página': '',
        'Firmas Jurados': (r.firmasList || []).map(f => `${f.nombre || ''}${f.cedula ? ` (${f.cedula})` : ''}`).join('; '),
      };

      const hasListas = Array.isArray(r.listas) && r.listas.length > 0;

      if (hasListas) {
        r.listas.forEach(l => {
          const listaBase = {
            ...base,
            'Lista #': l.numeroLista,
            'Lista Nombre': l.nombreLista || '',
            'Lista Tipo': l.tipo || '',
            'Votos por Lista': l.votosPorLaLista ?? '',
            'Total Agrupación': l.totalAgrupacion ?? '',
            'Marca Cruz': l.marcaCruz ? 'SÍ' : 'NO',
            'Página': l.pagina ?? '',
          };
          if ((l.candidatos || []).length > 0) {
            l.candidatos.forEach(c => {
              rows.push({
                ...listaBase,
                'Candidato #': c.numero,
                'Candidato Votos': c.votos,
              });
            });
          } else {
            rows.push(listaBase);
          }
        });
      } else if ((r.candidatos || []).length > 0) {
        r.candidatos.forEach(c => {
          rows.push({
            ...base,
            'Candidato #': c.numero,
            'Candidato Nombre': c.nombre || '',
            'Candidato Votos': c.votos,
          });
        });
      } else {
        rows.push(base);
      }
    });

    rows.forEach(row => ws.addRow(row));

    const obsColKey = 'Observaciones';
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cell = row.getCell(obsColKey);
      if (cell.value && /alerta/i.test(String(cell.value))) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' },
        };
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comisiones_zonal-${zonal}_zona-${zona}_puesto-${puesto}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="bg-gray-600 text-white px-4 py-3 rounded-t-lg"><h5 className="font-semibold m-0">Comisiones</h5></div>
        <div className="p-4 text-center">
          <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
          Cargando datos de comisiones...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="bg-gray-600 text-white px-4 py-3 rounded-t-lg"><h5 className="font-semibold m-0">Comisiones</h5></div>
        <div className="p-4">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded">{error}</div>
        </div>
      </div>
    );
  }

  const showResults = showPuesto && Boolean(puesto);

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="bg-gray-600 text-white px-4 py-3 rounded-t-lg"><h5 className="font-semibold m-0">Comisiones</h5></div>
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <div>
            <label className="text-xs font-semibold block mb-0.5">Departamento</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={departamento} onChange={e => handleDepartamento(e.target.value)}>
              <option value="">Seleccionar...</option>
              {options.departamentos.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-0.5">Municipio</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full disabled:bg-gray-100" value={municipio} onChange={e => handleMunicipio(e.target.value)} disabled={!showMunicipio}>
              <option value="">Seleccionar...</option>
              {options.municipios.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-0.5">Zonal</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full disabled:bg-gray-100" value={zonal ?? ''} onChange={e => handleZonal(e.target.value)} disabled={!showZonal}>
              <option value="">Seleccionar...</option>
              {options.zonales.map(z => (
                <option key={z} value={z}>Zonal {z}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-0.5">Zona</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full disabled:bg-gray-100" value={zona} onChange={e => handleZona(e.target.value)} disabled={!showZona}>
              <option value="">Seleccionar...</option>
              {options.zonas.map(z => (
                <option key={z} value={z}>Zona {z}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-0.5">Puesto</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm w-full disabled:bg-gray-100" value={puesto} onChange={e => handlePuesto(e.target.value)} disabled={!showPuesto}>
              <option value="">Seleccionar...</option>
              {options.puestos.map(p => (
                <option key={p} value={p}>Puesto {p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end mb-3">
          <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-2 py-1 text-sm" onClick={resetFilters}>
            Limpiar filtros
          </button>
        </div>

        {zonal !== null && !zona && (
          resultados.length > 0 ? (
            <div>
              <h6 className="text-sm font-semibold mb-2">Zonas y puestos para Zonal {zonal}:</h6>
              <div className="flex flex-wrap gap-2">
                {resultados.map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-center" style={{ minWidth: 120 }}>
                    <small className="text-gray-500 block">Zona {r.zona} · Puesto {r.puesto}</small>
                    <span className="bg-blue-600 text-white text-sm font-semibold px-2 py-0.5 rounded">{r.mesas}</span>
                    <small className="text-gray-500 block">mesas</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded">Sin coincidencias para Zonal {zonal}</div>
          )
        )}

        {zonal !== null && zona && !puesto && (
          resultados.length > 0 ? (
            <div>
              <h6 className="text-sm font-semibold mb-2">Puestos para Zonal {zonal} · Zona {zona}:</h6>
              <div className="flex flex-wrap gap-2">
                {resultados.map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-center" style={{ minWidth: 100 }}>
                    <small className="text-gray-500 block">Puesto {r.puesto}</small>
                    <span className="bg-green-600 text-white text-sm font-semibold px-2 py-0.5 rounded">{r.mesas}</span>
                    <small className="text-gray-500 block">mesas</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded">Sin coincidencias para Zonal {zonal} · Zona {zona}</div>
          )
        )}

        {showResults && (
          <div className="mt-3">
            <hr className="border-gray-200" />
            {divipoleInfo && (
              <div className="bg-gray-50 p-2 rounded text-sm mb-3">
                <strong>{divipoleInfo.nombrePuesto}</strong><br />
                {divipoleInfo.direccion}<br />
                Comuna {divipoleInfo.comuna} · Barrio {divipoleInfo.barrio}
              </div>
            )}
            <h6 className="text-sm font-semibold mb-2">
              Resultados — Zonal {zonal} · Zona {zona} · Puesto {puesto} ({matches.length} {matches.length === 1 ? 'mesa' : 'mesas'})
            </h6>
            {matches.length > 0 ? (
              matches.map((record, idx) => (
                <ResultCard key={record.id || idx} record={record} />
              ))
            ) : (
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-3 rounded">No hay resultados procesados para este zonal</div>
            )}
            <div className="flex justify-end mt-3">
              <button className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded px-3 py-1.5 text-sm transition-colors" onClick={handleExportExcel} disabled={matches.length === 0}>
                Descargar Excel
              </button>
            </div>
          </div>
        )}

        {(!zona || !puesto) && (
          <div className="text-center text-gray-400 py-3">
            <small>Seleccioná Zonal, Zona y Puesto para ver los resultados procesados.</small>
          </div>
        )}
      </div>
    </div>
  );
}
