import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function FileUploader({ files, onAddFiles, onRemoveFile, onCancelFile, onClearFiles, onProcess, processing, queueProgress, fileStatuses }) {
  const onDrop = useCallback((accepted, rejected) => {
    const result = onAddFiles([...accepted, ...rejected.map(r => r.file)]);
    if (rejected.length > 0) {
      alert('Solo se permiten archivos con extensión .pdf');
    }
  }, [onAddFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    disabled: processing
  });

  const progressPercent = queueProgress && queueProgress.total > 0
    ? Math.round((queueProgress.current / queueProgress.total) * 100)
    : 0;

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
        <h5 className="font-semibold m-0">Subir Formularios Electorales (PDF)</h5>
      </div>
      <div className="p-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300'
          } ${processing ? 'cursor-default' : 'cursor-pointer'}`}
          style={{ minHeight: 120 }}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-blue-600 font-bold m-0">Soltá los archivos aquí...</p>
          ) : processing ? (
            <div>
              <p className="text-gray-500 m-0 mb-1">Procesando PDFs...</p>
              <small className="text-gray-400">Esperá a que termine para agregar más archivos</small>
            </div>
          ) : (
            <div>
              <p className="m-0 mb-1 text-gray-600">Arrastrá los PDFs aquí o hacé clic para seleccionar</p>
              <small className="text-gray-400">Solo se permiten archivos .pdf</small>
            </div>
          )}
        </div>

        {queueProgress && queueProgress.total > 0 && (
          <div className="mt-3">
            <div className="bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <small className="text-gray-500 mt-1 block text-center">
              Procesando {queueProgress.current} de {queueProgress.total}: {queueProgress.currentFile}
            </small>
          </div>
        )}

        {files.length > 0 && (
          <>
            <ul className="mt-3 divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {files.map((file, idx) => {
                const fileStatus = fileStatuses && fileStatuses[file.name];
                const isProcessing = processing && queueProgress && queueProgress.current - 1 === idx;
                const isDone = !!fileStatus;

                return (
                  <li key={idx} className="flex justify-between items-center px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
{(processing || isDone) && (
                        isProcessing ? (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : isDone && fileStatus.status === 'success' ? (
                          <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">✓</span>
                        ) : isDone && fileStatus.status === 'duplicate' ? (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded">Duplicado</span>
                        ) : isDone && fileStatus.status === 'error' ? (
                          <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded">{fileStatus.error}</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-400 text-xs px-1.5 py-0.5 rounded opacity-25">·</span>
                        )
                      )}
                      <span className={isProcessing ? 'font-semibold' : ''}>{idx + 1}. {file.name}</span>
                      <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-700 text-sm border border-red-200 hover:border-red-300 rounded px-1.5 py-0.5 disabled:opacity-50"
                      onClick={() => (processing && !isProcessing && !isDone ? onCancelFile(idx) : onRemoveFile(idx))}
                      disabled={processing && (isProcessing || isDone)}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                onClick={onProcess}
                disabled={processing || files.length === 0}
              >
                {processing ? (
                  <span className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  `Procesar ${files.length} PDF${files.length > 1 ? 's' : ''}`
                )}
              </button>
              <button
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg px-3 py-2.5 disabled:opacity-50 transition-colors"
                onClick={onClearFiles}
                disabled={processing}
              >
                Limpiar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
