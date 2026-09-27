import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Navbar from './components/Layout/Navbar';
import FileUploader from './components/Upload/FileUploader';
import ResultCard from './components/Results/ResultCard';
import FilterBar from './components/Charts/FilterBar';
import ResultsFilter from './components/Results/ResultsFilter';
import ComisionesFilter from './components/Comisiones/ComisionesFilter';
import { usePdfProcessor } from './hooks/usePdfProcessor';
import { getRecords, clearAllRecords } from './services/apiClient';
import { uploadPdfs } from './services/apiClient';
import { useFilters } from './hooks/useFilters';
import { useResultsFilter } from './hooks/useResultsFilter';
import './Escrutinio.css';

export default function PresidencialesApp() {
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const recordsRef = useRef(records);
  useEffect(() => { recordsRef.current = records; }, [records]);

  const loadRecords = useCallback(async () => {
    try {
      const data = await getRecords('presidenciales');
      setRecords(data);
    } catch (err) {
      console.error('Error cargando registros:', err);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const handleClearData = useCallback(async () => {
    try {
      await clearAllRecords();
      setRecords([]);
    } catch (err) {
      console.error('Error limpiando datos:', err);
      alert('Error al limpiar los datos');
    }
  }, []);

  useEffect(() => { loadRecords(); }, []);
  const { files, addFiles, removeFile, clearFiles, cancelFile, processing, processFiles, processInfo, error, queueProgress, fileStatuses } = usePdfProcessor();
  const { filters, setFilters, filterOptions, aggregateData, filteredRecords } = useFilters(records);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const {
    departamento,
    municipio,
    zona,
    puesto,
    options,
    filterRecords,
    anyFilterActive,
    resetFilters,
    handleDepartamento,
    handleMunicipio,
    handleZona,
    handlePuesto,
  } = useResultsFilter();

  const locationFiltered = useMemo(() => filterRecords(records), [filterRecords, records]);

  useEffect(() => {
    setCurrentPage(1);
  }, [departamento, municipio, zona, puesto]);

  const totalPages = Math.ceil(locationFiltered.length / ITEMS_PER_PAGE);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return locationFiltered.slice(start, start + ITEMS_PER_PAGE);
  }, [locationFiltered, currentPage]);

  const handleAddFiles = useCallback((newFiles) => {
    const result = addFiles(newFiles);
    if (result.rejected.length > 0) {
      alert('Solo se permiten archivos con extensión .pdf');
    }
    return result;
  }, [addFiles]);

  const handleProcess = useCallback(async () => {
    await processFiles(recordsRef.current, (newResults) => {
      setRecords(prev => [...newResults, ...prev]);
      setCurrentPage(1);
    }, uploadPdfs);
  }, [processFiles]);

  function PaginationButtons({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return (
      <nav className="flex justify-center mt-4">
        <div className="flex gap-1">
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            &laquo;
          </button>
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-3 py-1 text-gray-400">...</span>
            ) : (
              <button
                key={p}
                className={`px-3 py-1 border rounded text-sm ${
                  p === currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            &raquo;
          </button>
        </div>
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Navbar records={records} onClearData={handleClearData} />
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="pb-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Presidenciales
          </h1>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded flex justify-between items-center">
            <span>{error}</span>
          </div>
        )}

        <section id="charts">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            filterOptions={filterOptions}
            aggregateData={aggregateData}
            filteredRecords={filteredRecords}
          />
        </section>

        <section id="upload">
          <FileUploader
            files={files}
            onAddFiles={handleAddFiles}
            onRemoveFile={removeFile}
            onCancelFile={cancelFile}
            onClearFiles={clearFiles}
            onProcess={handleProcess}
            processing={processing}
            queueProgress={queueProgress}
            fileStatuses={fileStatuses}
          />
        </section>

        <section id="results">
          <h4 className="font-semibold mb-3">Resultados ({records.length} mesas procesadas)</h4>
          {records.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="m-0">No hay resultados todavía. Subí PDFs para comenzar.</p>
            </div>
          ) : (
            <>
              <ResultsFilter
                departamento={departamento}
                municipio={municipio}
                zona={zona}
                puesto={puesto}
                options={options}
                handleDepartamento={handleDepartamento}
                handleMunicipio={handleMunicipio}
                handleZona={handleZona}
                handlePuesto={handlePuesto}
                resetFilters={resetFilters}
                anyFilterActive={anyFilterActive}
                totalRecords={records.length}
                filteredCount={locationFiltered.length}
              />
              {locationFiltered.length === 0 ? (
                <div className="text-center text-gray-400 py-4">
                  <p className="m-0">Sin resultados con este filtro.</p>
                </div>
              ) : (
                <>
                  {paginatedRecords.map((record, idx) => <ResultCard key={record.id || idx} record={record} />)}
                  <PaginationButtons currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </>
              )}
            </>
          )}
        </section>

        <section id="comisiones">
          <ComisionesFilter records={records} />
        </section>
      </div>
    </div>
  );
}
