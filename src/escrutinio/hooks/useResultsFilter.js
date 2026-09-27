import { useState, useEffect, useMemo, useCallback } from 'react';

const DEPTO_NAMES = {
  31: 'Valle del Cauca',
  16: 'Bogotá D.C.',
};

const MUNI_NAMES = {
  '001': 'Cali',
  '001_bog': 'Bogotá D.C.',
};

export function useResultsFilter() {
  const [divipoleData, setDivipoleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [zona, setZona] = useState('');
  const [puesto, setPuesto] = useState('');

  useEffect(() => {
    fetch('/escrutinio/divipole.jsx')
      .then(r => r.json())
      .then(data => {
        setDivipoleData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const options = useMemo(() => {
    if (!divipoleData) return { departamentos: [], municipios: [], zonas: [], puestos: [] };

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

    const zonas = (departamento && municipio)
      ? [...new Set(registros
          .filter(r => r.departamento === parseInt(departamento, 10) && r.municipio === municipio)
          .map(r => r.zona))]
        .sort()
      : [];

    const puestos = (departamento && municipio && zona)
      ? [...new Set(registros
          .filter(r => r.departamento === parseInt(departamento, 10) && r.municipio === municipio && r.zona === zona)
          .map(r => r.puesto))]
        .sort()
      : [];

    return { departamentos, municipios, zonas, puestos };
  }, [divipoleData, departamento, municipio, zona]);

  const filterRecords = useCallback((records) => {
    if (!departamento && !municipio && !zona && !puesto) return records;

    return records.filter(r => {
      if (!r.procesado) return false;
      if (departamento && String(r.departamentoCodigo || '') !== departamento) return false;
      if (municipio && String(r.municipioCodigo || '') !== municipio) return false;
      if (zona && String(r.zona || '').padStart(2, '0') !== zona) return false;
      if (puesto && String(r.puesto || '').padStart(2, '0') !== puesto) return false;
      return true;
    });
  }, [departamento, municipio, zona, puesto]);

  const anyFilterActive = Boolean(departamento || municipio || zona || puesto);

  const resetFilters = useCallback(() => {
    setDepartamento('');
    setMunicipio('');
    setZona('');
    setPuesto('');
  }, []);

  const handleDepartamento = useCallback((val) => {
    setDepartamento(val);
    setMunicipio('');
    setZona('');
    setPuesto('');
  }, []);

  const handleMunicipio = useCallback((val) => {
    setMunicipio(val);
    setZona('');
    setPuesto('');
  }, []);

  const handleZona = useCallback((val) => {
    setZona(val);
    setPuesto('');
  }, []);

  const handlePuesto = useCallback((val) => {
    setPuesto(val);
  }, []);

  return {
    departamento,
    municipio,
    zona,
    puesto,
    loading,
    options,
    filterRecords,
    anyFilterActive,
    resetFilters,
    handleDepartamento,
    handleMunicipio,
    handleZona,
    handlePuesto,
  };
}
