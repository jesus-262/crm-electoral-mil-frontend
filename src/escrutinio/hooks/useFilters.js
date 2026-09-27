import { useState, useMemo } from 'react';

export function useFilters(records) {
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [zona, setZona] = useState('');
  const [puesto, setPuesto] = useState('');
  const [mesa, setMesa] = useState('');

  const filterOptions = useMemo(() => {
    const processed = records.filter(r => r.procesado);
    return {
      departamentos: [...new Set(processed.map(r => r.departamento).filter(Boolean))].sort(),
      municipios: [...new Set(processed.map(r => r.municipio).filter(Boolean))].sort(),
      zonas: [...new Set(processed.map(r => r.zona).filter(Boolean))].sort(),
      puestos: [...new Set(processed.map(r => r.puesto).filter(Boolean))].sort(),
      mesas: [...new Set(processed.map(r => r.mesa).filter(Boolean))].sort()
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (!r.procesado) return false;
      if (departamento && r.departamento !== departamento) return false;
      if (municipio && r.municipio !== municipio) return false;
      if (zona && r.zona !== zona) return false;
      if (puesto && r.puesto !== puesto) return false;
      if (mesa && r.mesa !== mesa) return false;
      return true;
    });
  }, [records, departamento, municipio, zona, puesto, mesa]);

  const aggregateData = useMemo(() => {
    const candidateMap = {};
    const listaMap = {};
    let totalVotos = 0;
    let mesasCount = filteredRecords.length;

    filteredRecords.forEach(record => {
      const hasListas = Array.isArray(record.listas) && record.listas.length > 0;

      if (hasListas) {
        record.listas.forEach(l => {
          const key = `lista-${l.numeroLista}`;
          if (!listaMap[key]) {
            listaMap[key] = {
              numeroLista: l.numeroLista,
              nombreLista: l.nombreLista || '',
              tipo: l.tipo || '',
              votosPorLaLista: 0,
              totalAgrupacion: 0,
              candidatos: {}
            };
          }
          listaMap[key].votosPorLaLista += (l.votosPorLaLista || 0);
          listaMap[key].totalAgrupacion += (l.totalAgrupacion || 0);

          (l.candidatos || []).forEach(c => {
            const candKey = `lista-${l.numeroLista}-cand-${c.numero}`;
            if (!candidateMap[candKey]) {
              candidateMap[candKey] = {
                numero: c.numero,
                nombre: c.nombre || '',
                votos: 0,
                listaNumero: l.numeroLista,
                nombreLista: l.nombreLista || ''
              };
            }
            candidateMap[candKey].votos += c.votos;
            const k = `cand-${c.numero}`;
            if (!listaMap[key].candidatos[k]) {
              listaMap[key].candidatos[k] = { numero: c.numero, votos: 0 };
            }
            listaMap[key].candidatos[k].votos += c.votos;
          });
        });
      } else {
        record.candidatos?.forEach(c => {
          if (!candidateMap[c.numero]) {
            candidateMap[c.numero] = { numero: c.numero, nombre: c.nombre || '', votos: 0 };
          }
          candidateMap[c.numero].votos += c.votos;
        });
      }

      totalVotos += (record.totalVotosMesa || 0);
    });

    let candidatos = Object.values(candidateMap).sort((a, b) => b.votos - a.votos);
    if (!filteredRecords.some(r => Array.isArray(r.listas) && r.listas.length > 0)) {
      candidatos = candidatos.map(c => ({ numero: c.numero, nombre: c.nombre, votos: c.votos }));
    }
    const ganador = candidatos[0] || null;
    const segundo = candidatos[1] || null;
    const diferencia = ganador && segundo ? ganador.votos - segundo.votos : 0;

    const listas = Object.values(listaMap)
      .sort((a, b) => a.numeroLista - b.numeroLista)
      .map(l => ({
        ...l,
        candidatos: Object.values(l.candidatos).sort((a, b) => a.numero - b.numero)
      }));

    return {
      candidatos,
      listas,
      totalVotos,
      mesasCount,
      ganador,
      segundo,
      diferencia,
      hasListas: listas.length > 0
    };
  }, [filteredRecords]);

  return {
    filters: { departamento, municipio, zona, puesto, mesa },
    setFilters: { setDepartamento, setMunicipio, setZona, setPuesto, setMesa },
    filterOptions,
    filteredRecords,
    aggregateData
  };
}
