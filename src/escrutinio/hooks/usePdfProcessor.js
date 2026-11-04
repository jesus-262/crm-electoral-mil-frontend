import { useState, useCallback, useRef } from 'react';
import { useModal } from '../../component/ui/ModalProvider';

export function usePdfProcessor() {
  const { mostrarAviso } = useModal();
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [processInfo, setProcessInfo] = useState({
    modelName: '',
    tokens: 0,
    cost: 0,
    totalTokens: 0,
    totalCost: 0,
    failedAttempts: []
  });
  const [queueProgress, setQueueProgress] = useState({
    total: 0,
    current: 0,
    currentFile: '',
  });
  const [error, setError] = useState(null);
  const [fileStatuses, setFileStatuses] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const skippedRef = useRef(new Set());

  const addFiles = useCallback((newFiles) => {
    const pdfFiles = newFiles.filter(f => {
      return f.type === 'application/pdf' ||
                    f.name.toLowerCase().endsWith('.pdf') ||
                    f.type === '';
    });
    const rejected = newFiles.filter(f =>
      f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf') && f.type !== ''
    );

    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const unique = pdfFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...unique];
    });

    return { added: pdfFiles, rejected };
  }, []);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setFileStatuses({});
    setDuplicates([]);
  }, []);

  function summarizeError(errorMsg) {
    if (!errorMsg) return 'Error desconocido';
    if (errorMsg.startsWith('CAMPOS_FALTANTES')) {
      return 'Campos faltantes: ' + (errorMsg.split(': ').slice(-1)[0] || '');
    }
    if (errorMsg.startsWith('PDF_CORRUPTO')) return 'PDF corrupto';
    if (errorMsg.startsWith('PDF_PROTEGIDO')) return 'PDF protegido';
    if (errorMsg.startsWith('CALIDAD_INSUFICIENTE')) return 'Calidad insuficiente';
    if (errorMsg.startsWith('OPENCODE_ERROR')) return 'Error de extracción';
    if (errorMsg.startsWith('ERROR_INTERNO')) return 'Error interno';
    if (errorMsg.startsWith('TIPO_INCORRECTO')) return 'Tipo de formulario incorrecto';
    if (errorMsg === 'Este PDF ya fue procesado anteriormente.') return 'Duplicado';
    return errorMsg;
  }

  const processFiles = useCallback(async (existingRecords, onResult, uploadFn) => {
    setError(null);

    if (files.length === 0) {
      setError('No hay archivos para procesar');
      return;
    }

    setProcessing(true);
    setFileStatuses({});
    setDuplicates([]);
    setQueueProgress({ total: 0, current: 0, currentFile: '' });
    const total = files.length;
    const updatedRecords = [...existingRecords];
    const duplicados = [];

    try {
      for (let i = 0; i < total; i++) {
        const file = files[i];

        if (skippedRef.current.has(file.name)) {
          continue;
        }

        setQueueProgress({ total, current: i + 1, currentFile: file.name });
        const response = await uploadFn([file], updatedRecords);

        let modelName = '';
        let tokens = 0;
        let cost = 0;

        response.resultados.forEach(r => {
          if (r.procesado) {
            if (!modelName) modelName = r.modeloUsado || '';
            tokens += r.tokens?.total || 0;
            cost += r.costoEstimado || 0;
          }
        });

        setProcessInfo(prev => ({
          modelName,
          tokens,
          cost,
          totalTokens: prev.totalTokens + tokens,
          totalCost: prev.totalCost + cost,
          failedAttempts: response.resultados
            .filter(r => !r.procesado)
            .map(r => ({ file: r.archivo, error: r.error }))
        }));

        const processed = response.resultados.filter(r => r.procesado);
        if (processed.length > 0 && onResult) {
          onResult(processed);
        }

        response.resultados.forEach(r => {
          if (r.id) updatedRecords.push({ id: r.id });
          if (r.isDuplicate) duplicados.push(r.archivo || r.id);
        });

        const fileResult = response.resultados[0];
        if (fileResult) {
          if (fileResult.procesado) {
            setFileStatuses(prev => ({ ...prev, [file.name]: { status: 'success' } }));
          } else if (fileResult.isDuplicate) {
            setFileStatuses(prev => ({ ...prev, [file.name]: { status: 'duplicate' } }));
          } else {
            setFileStatuses(prev => ({ ...prev, [file.name]: { status: 'error', error: summarizeError(fileResult.error) } }));
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Error al procesar los archivos');
    } finally {
      setProcessing(false);
      skippedRef.current = new Set();

      if (duplicados.length === 1) {
        mostrarAviso({
          titulo: 'PDF duplicado',
          mensaje: `Este PDF ya fue procesado anteriormente y no se volvió a guardar:\n\n${duplicados[0]}`,
          tipo: 'advertencia',
          icono: '⚠️',
        });
      } else if (duplicados.length > 1) {
        mostrarAviso({
          titulo: 'PDFs duplicados',
          mensaje: `${duplicados.length} PDFs ya fueron procesados anteriormente y no se volvieron a guardar:\n\n${duplicados.join('\n')}`,
          tipo: 'advertencia',
          icono: '⚠️',
        });
      }
      if (duplicados.length > 0) {
        setDuplicates(duplicados);
      }
    }
  }, [files, mostrarAviso]);

  const cancelFile = useCallback((index) => {
    const file = files[index];
    if (file) skippedRef.current.add(file.name);
    removeFile(index);
  }, [files, removeFile]);

  const resetInfo = useCallback(() => {
    setProcessInfo({
      modelName: '',
      tokens: 0,
      cost: 0,
      totalTokens: 0,
      totalCost: 0,
      failedAttempts: []
    });
    setError(null);
    setDuplicates([]);
  }, []);

  return {
    files, addFiles, removeFile, clearFiles, cancelFile,
    processing, results, processFiles,
    processInfo, resetInfo, error,
    queueProgress, fileStatuses, duplicates,
  };
}
