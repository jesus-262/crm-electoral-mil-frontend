import { useState, useEffect, useMemo, useCallback } from 'react';

const DEPTO_NAMES = {
  31: 'Valle del Cauca',
  16: 'Bogotá D.C.',
};

const MUNI_NAMES = {
  '001': 'Cali',
};

export function useComisionesData() {
  const [comisionesData, setComisionesData] = useState(null);
  const [divipoleData, setDivipoleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [zona, setZona] = useState('');
  const [puesto, setPuesto] = useState('');
  const [zonal, setZonal] = useState(null);
  const [mesa, setMesa] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/escrutinio/comisiones.jsx').then(r => r.json()),
      fetch('/escrutinio/divipole.jsx').then(r => r.json())
    ])
      .then(([comisiones, divipole]) => {
        if (cancelled) return;
        setComisionesData(comisiones);
        setDivipoleData(divipole);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError('Error al cargar datos de comisiones: ' + err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const divipoleOptions = useMemo(() => {
    if (!divipoleData) return { departamentos: [], municipios: [] };

    const registros = divipoleData.registros || [];

    const departamentos = [...new Set(registros.map(r => r.departamento))]
      .sort((a, b) => a - b)
      .map(d => ({ value: String(d), label: `${d} - ${DEPTO_NAMES[d] || d}` }));

    const municipios = departamento
      ? [...new Set(registros
          .filter(r => r.departamento === parseInt(departamento, 10))
          .map(r => r.municipio))]
        .sort()
        .map(m => ({ value: m, label: `${m} - ${MUNI_NAMES[m] || m}` }))
      : [];

    return { departamentos, municipios };
  }, [divipoleData, departamento]);

  const comisionesOptions = useMemo(() => {
    if (!comisionesData) return { zonales: [], zonas: [], puestos: [], mesas: [] };

    const comisiones = comisionesData.comisiones || [];
    const registros = divipoleData?.registros || [];

    const divipolePairs = (departamento && municipio)
      ? new Set(
          registros
            .filter(r => r.departamento === parseInt(departamento, 10) && r.municipio === municipio)
            .map(r => `${r.zona}|${r.puesto}`)
        )
      : null;

    const zonales = divipolePairs
      ? [...new Set(
          comisiones
            .filter(c => divipolePairs.has(`${c.zona}|${c.puesto}`))
            .map(c => c.zonal)
        )].sort((a, b) => a - b)
      : [];

    const zonas = zonal !== null && divipolePairs
      ? [...new Set(
          comisiones
            .filter(c => c.zonal === zonal && divipolePairs.has(`${c.zona}|${c.puesto}`))
            .map(c => c.zona)
        )].sort()
      : [];

    const puestos = (zonal !== null && zona)
      ? [...new Set(
          comisiones
            .filter(c => c.zonal === zonal && c.zona === zona)
            .map(c => c.puesto)
        )].sort()
      : [];

    const mesasCount = (zonal !== null && zona && puesto)
      ? comisiones
          .filter(c => c.zonal === zonal && c.zona === zona && c.puesto === puesto)
          .reduce((sum, c) => sum + c.mesas, 0)
      : 0;

    const mesas = mesasCount > 0
      ? Array.from({ length: mesasCount }, (_, i) => String(i + 1).padStart(3, '0'))
      : [];

    return { zonales, zonas, puestos, mesas };
  }, [comisionesData, divipoleData, departamento, municipio, zonal, zona, puesto]);

  const resultados = useMemo(() => {
    if (!comisionesData || zonal === null) return [];

    const comisiones = comisionesData.comisiones || [];

    return comisiones
      .filter(c => c.zonal === zonal && (!zona || c.zona === zona) && (!puesto || c.puesto === puesto))
      .map(c => ({
        zonal: c.zonal,
        zona: c.zona,
        puesto: c.puesto,
        mesas: c.mesas
      }))
      .sort((a, b) => a.zonal - b.zonal || a.zona.localeCompare(b.zona) || a.puesto.localeCompare(b.puesto));
  }, [comisionesData, zonal, zona, puesto]);

  const resetFilters = useCallback(() => {
    setDepartamento('');
    setMunicipio('');
    setZona('');
    setPuesto('');
    setZonal(null);
    setMesa('');
  }, []);

  const handleDepartamento = useCallback((val) => {
    setDepartamento(val);
    setMunicipio('');
    setZona('');
    setPuesto('');
    setZonal(null);
    setMesa('');
  }, []);

  const handleMunicipio = useCallback((val) => {
    setMunicipio(val);
    setZonal(null);
    setZona('');
    setPuesto('');
    setMesa('');
  }, []);

  const handleZonal = useCallback((val) => {
    setZonal(val ? parseInt(val, 10) : null);
    setZona('');
    setPuesto('');
    setMesa('');
  }, []);

  const handleZona = useCallback((val) => {
    setZona(val);
    setPuesto('');
    setMesa('');
  }, []);

  const handlePuesto = useCallback((val) => {
    setPuesto(val);
    setMesa('');
  }, []);

  const handleMesa = useCallback((val) => {
    setMesa(val);
  }, []);

  const setFromRecord = useCallback((record) => {
    if (!record || !divipoleData || !comisionesData) return;

    setDepartamento(record.departamentoCodigo || '');
    setMunicipio(record.municipioCodigo || '');
    setZona(record.zona || '');
    setPuesto(record.puesto || '');

    const comision = comisionesData.comisiones?.find(c =>
      c.zona === record.zona && c.puesto === record.puesto
    );
    setZonal(comision ? comision.zonal : null);

    setMesa(record.mesa || '');
  }, [divipoleData, comisionesData]);

  return {
    departamento,
    municipio,
    zona,
    puesto,
    zonal,
    mesa,
    loading,
    error,
    options: { ...divipoleOptions, ...comisionesOptions },
    resultados,
    handleDepartamento,
    handleMunicipio,
    handleZona,
    handlePuesto,
    handleZonal,
    handleMesa,
    resetFilters,
    setFromRecord,
    divipoleData,
  };
}
