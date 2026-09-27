import { useState } from 'react';
import { getPdfProxyUrl } from '../../services/apiClient';

export default function ResultCard({ record }) {
  const [candidateNumber, setCandidateNumber] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [showPdf, setShowPdf] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const hasListas = Array.isArray(record.listas) && record.listas.length > 0;

  const handleLookup = () => {
    const num = parseInt(candidateNumber);
    if (isNaN(num)) return;

    if (hasListas) {
      const found = [];
      (record.listas || []).forEach(l => {
        (l.candidatos || []).forEach(c => {
          if (c.numero === num) {
            found.push({ lista: l, candidato: c });
          }
        });
      });
      if (found.length > 0) {
        setLookupResult({
          encontrado: true,
          votos: found[0].candidato.votos,
          nombre: `Lista ${found[0].lista.numeroLista} ${found[0].lista.nombreLista || ''} · #${num}`,
          posicion: '-',
          diferencia: 0,
          multiplas: found.length > 1,
          totalCoincidencias: found.length
        });
      } else {
        setLookupResult({ encontrado: false });
      }
      return;
    }

    const candidate = record.candidatos?.find(c => c.numero === num);
    if (candidate) {
      const sorted = [...record.candidatos].sort((a, b) => b.votos - a.votos);
      const position = sorted.findIndex(c => c.numero === num) + 1;
      setLookupResult({
        encontrado: true,
        nombre: candidate.nombre || '',
        votos: candidate.votos,
        posicion: position,
        diferencia: record.ganador ? record.ganador.votos - candidate.votos : 0
      });
    } else {
      setLookupResult({ encontrado: false });
    }
  };

  if (!record.procesado) {
    return (
      <div className="border border-red-300 rounded-lg shadow-sm mb-3">
        <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg font-semibold text-sm">{record.archivo}</div>
        <div className="p-3">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-2 rounded text-sm">{record.error}</div>
        </div>
      </div>
    );
  }

  const validationVariant = record.validacion?.resultado?.includes('OK') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  const signatureVariant = record.firmas?.estado?.includes('completas') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  const signatureCount = record.firmasDetectadas ?? record.firmas?.detectadas ?? 0;

  const cloudinaryFailed = record.observaciones?.some(obs =>
    obs.includes('Cloudinary') || obs.includes('almacenamiento')
  );

  const relevantObservations = record.observaciones?.filter(obs =>
    !obs.includes('Documento escaneado') &&
    !obs.includes('Cloudinary') &&
    !obs.includes('almacenamiento')
  ) || [];

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm mb-3 bg-white">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <strong className="text-sm">{record.archivo}</strong>
            <div className="text-gray-500 text-xs truncate">
              {record.departamentoCodigo && `${record.departamentoCodigo} - `}{record.departamento && `${record.departamento} · `}
              {record.municipioCodigo && `${record.municipioCodigo} - `}{record.municipio} · Zona {record.zona} · Puesto {record.puesto} · Mesa {record.mesa}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex flex-wrap gap-1 justify-center">
              <span className={`text-xs px-2 py-0.5 rounded ${validationVariant}`}>
                {record.validacion?.resultado}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${signatureVariant}`}>
                {record.firmas?.estado} ({signatureCount}/6)
              </span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                {record.modeloUsado}
              </span>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                {record.tokens?.total?.toLocaleString()} tk · ${record.costoEstimado?.toFixed(6)}
              </span>
            </div>
            {record.ganador && (
              <small className="text-gray-500 text-xs">
                <strong>Ganador:</strong> #{record.ganador.numero} {record.ganador.nombre && `- ${record.ganador.nombre}`} ({record.ganador.votos} votos)
              </small>
            )}
            {relevantObservations.length > 0 && (
              <small className="text-red-500 text-xs">
                ⚠ {relevantObservations[0]}
                {relevantObservations.length > 1 && ` (+${relevantObservations.length - 1})`}
              </small>
            )}
          </div>
          <div className="flex gap-2">
            {record.pdfUrl && !cloudinaryFailed && (
              <button className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-300 rounded px-2 py-1 text-xs transition-colors" onClick={() => setShowPdf(true)}>
                Ver PDF ☁️
              </button>
            )}
            <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-2 py-1 text-xs transition-colors" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Ocultar datos' : 'Ver datos'}
            </button>
            {cloudinaryFailed && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">PDF no almacenado</span>
            )}
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="p-4">
          {cloudinaryFailed && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-2 rounded text-sm mb-3">
              ⚠️ No se pudo almacenar en Cloudinary (posible límite de almacenamiento). Los datos fueron extraídos correctamente.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {[
                    ['Departamento', `${record.departamento || '-'}${record.departamentoCodigo ? ` (${record.departamentoCodigo})` : ''}`],
                    ['Municipio', `${record.municipio || '-'}${record.municipioCodigo ? ` (${record.municipioCodigo})` : ''}`],
                    ['Zona', record.zona || '-'],
                    ['Puesto', record.puesto || '-'],
                    ['Mesa', record.mesa || '-'],
                    ['Lugar', record.lugar || '-'],
                    ['Sufragantes', record.totalSufragantes],
                    ['Votos en urna', record.totalVotosUrna],
                    ['Votos incinerados', record.totalVotosIncinerados],
                    ['Recuento', record.recuento === true ? 'SÍ' : record.recuento === false ? 'NO' : '-'],
                    ['Solicitado por', record.solicitadoPor || '-'],
                    ['Rep. de', record.representacionDe || '-'],
                  ].map(([label, value], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="font-semibold border border-gray-200 px-2 py-1">{label}</td>
                      <td className="border border-gray-200 px-2 py-1">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              {hasListas ? (
                <>
                  <h6 className="text-sm font-semibold mb-1">Listas y votos</h6>
                  <div className={`p-2 rounded mb-2 text-sm ${record.validacion?.resultado?.includes('OK') ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                    <strong>Votos en urna:</strong> {record.totalVotosUrna} · <strong>Suma total:</strong> {record.totalVotosMesa}
                    {record.validacion?.resultado && <span> · {record.validacion.resultado}</span>}
                  </div>
                  <div className="space-y-2">
                    {record.listas.map((l, li) => (
                      <div key={li} className={`border border-gray-200 rounded overflow-hidden ${l.marcaCruz ? 'border-yellow-400' : ''}`}>
                        <div className={`px-2 py-1 flex items-center justify-between gap-2 ${l.marcaCruz ? 'bg-yellow-50' : 'bg-gray-100'}`}>
                          <strong className="text-xs">
                            Lista {l.numeroLista} {l.nombreLista && `· ${l.nombreLista}`}
                            {l.marcaCruz && (
                              <span className="ml-1 bg-yellow-400 text-black text-[10px] px-1.5 py-0.5 rounded font-semibold" title="El voto por la lista está marcado como cruz (X)">
                                ⚠️ Cruz (X)
                              </span>
                            )}
                            {Array.isArray(l.observaciones) && l.observaciones.length > 0 && (
                              <span className="ml-1 bg-orange-200 text-orange-900 text-[10px] px-1.5 py-0.5 rounded font-semibold" title={l.observaciones.join('; ')}>
                                ⚠️ Tachadura
                              </span>
                            )}
                          </strong>
                          <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded whitespace-nowrap">{l.totalAgrupacion} votos</span>
                        </div>
                        <div className="px-2 py-1">
                          <span className="text-xs text-gray-600">Votos por la lista: <strong>{l.votosPorLaLista ?? 0}</strong> · {l.tipo || 'Con voto preferente'}</span>
                          {(l.candidatos || []).length > 0 && (
                            <div className="overflow-x-auto mt-1">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="border border-gray-200 px-1 py-0.5 text-left">#</th>
                                    <th className="border border-gray-200 px-1 py-0.5 text-left">Votos</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {l.candidatos.map(c => (
                                    <tr key={c.numero}>
                                      <td className="font-semibold border border-gray-200 px-1 py-0.5">{c.numero}</td>
                                      <td className="border border-gray-200 px-1 py-0.5 text-right">{c.votos}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(record.firmas || []).length > 0 && (
                    <div className="mt-2">
                      <h6 className="text-sm font-semibold mb-1">Firmas de jurados ({record.firmas.length})</h6>
                      <table className="w-full text-xs border-collapse">
                        <tbody>
                          {record.firmas.map((f, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                              <td className="border border-gray-200 px-2 py-0.5">{f.nombre || '-'}</td>
                              <td className="border border-gray-200 px-2 py-0.5">{f.cedula || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {record.constanciasJurados && (
                    <div className="mt-2">
                      <h6 className="text-sm font-semibold mb-1">Constancias de jurados</h6>
                      <p className="text-xs bg-gray-50 p-2 rounded m-0">{record.constanciasJurados}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {record.ganador && (
                    <div className="bg-gray-50 p-2 rounded text-sm mb-2">
                      <strong>Ganador:</strong> #{record.ganador.numero} {record.ganador.nombre && `- ${record.ganador.nombre}`} ({record.ganador.votos} votos)
                      {record.ganador.segundoNumero && (
                        <>
                          <br /><strong>2° lugar:</strong> #{record.ganador.segundoNumero} {record.ganador.segundoNombre && `- ${record.ganador.segundoNombre}`} ({record.ganador.segundoVotos} votos)
                          <br /><strong>Diferencia:</strong> {record.ganador.diferencia} votos
                        </>
                      )}
                    </div>
                  )}

                  <h6 className="text-sm font-semibold mb-1">Candidatos y votos</h6>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-200 px-2 py-1 text-left">#</th>
                          <th className="border border-gray-200 px-2 py-1 text-left">Nombre</th>
                          <th className="border border-gray-200 px-2 py-1 text-right">Votos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.candidatos?.map(c => (
                          <tr key={c.numero} className={record.ganador?.numero === c.numero ? 'bg-green-50' : ''}>
                            <td className="font-semibold border border-gray-200 px-2 py-1">{c.numero}</td>
                            <td className="border border-gray-200 px-2 py-1">{c.nombre || '-'}</td>
                            <td className="border border-gray-200 px-2 py-1 text-right">{c.votos}</td>
                          </tr>
                        ))}
                        <tr><td colSpan={2} className="font-semibold border border-gray-200 px-2 py-1">Blanco</td><td className="border border-gray-200 px-2 py-1 text-right">{record.votosBlanco}</td></tr>
                        <tr><td colSpan={2} className="font-semibold border border-gray-200 px-2 py-1">Nulos</td><td className="border border-gray-200 px-2 py-1 text-right">{record.votosNulos}</td></tr>
                        <tr><td colSpan={2} className="font-semibold border border-gray-200 px-2 py-1">No marcados</td><td className="border border-gray-200 px-2 py-1 text-right">{record.votosNoMarcados}</td></tr>
                        <tr className="bg-gray-800 text-white"><td colSpan={2} className="font-semibold border border-gray-600 px-2 py-1">Total mesa</td><td className="font-semibold border border-gray-600 px-2 py-1 text-right">{record.totalVotosMesa}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!hasListas && (
                <div className="mt-2">
                  <h6 className="text-sm font-semibold mb-1">Buscar candidato</h6>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                      placeholder="N° de candidato"
                      value={candidateNumber}
                      onChange={e => setCandidateNumber(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLookup()}
                    />
                    <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded px-2 py-1 text-sm" onClick={handleLookup}>Buscar</button>
                  </div>
                  {lookupResult && (
                    lookupResult.encontrado ? (
                      <div className="text-sm bg-gray-50 p-2 rounded mt-1">
                        Candidato #{candidateNumber} {lookupResult.nombre && `- ${lookupResult.nombre}`}: {lookupResult.votos} votos · Posición: {lookupResult.posicion}° · Diferencia con ganador: {lookupResult.diferencia}
                      </div>
                    ) : (
                      <div className="text-sm text-red-500 mt-1">Candidato no encontrado en esta mesa</div>
                    )
                  )}
                </div>
              )}

              {record.observaciones?.length > 0 && (
                <div className="mt-2">
                  <h6 className="text-yellow-600 text-sm font-semibold">Observaciones</h6>
                  <ul className="text-xs m-0 pl-4">
                    {record.observaciones.map((obs, i) => <li key={i}>{obs}</li>)}
                  </ul>
                </div>
              )}

              {record.errores?.length > 0 && (
                <div className="mt-2">
                  <h6 className="text-red-600 text-sm font-semibold">Errores</h6>
                  <ul className="text-xs m-0 pl-4">
                    {record.errores.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPdf && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPdf(false)}>
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <h5 className="font-semibold m-0 text-sm">{record.archivo}</h5>
              <button className="text-gray-400 hover:text-gray-600 text-lg leading-none" onClick={() => setShowPdf(false)}>&times;</button>
            </div>
            <div className="flex-1 min-h-0">
              {record.pdfUrl ? (
                <iframe
                  src={getPdfProxyUrl(record.pdfUrl)}
                  className="w-full h-[75vh] border-0"
                  title="PDF Viewer"
                />
              ) : (
                <p className="text-center p-4 text-gray-400">PDF no disponible en Cloudinary</p>
              )}
            </div>
            <div className="flex justify-end px-4 py-2 border-t border-gray-200">
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-3 py-1 text-sm" onClick={() => setShowPdf(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
