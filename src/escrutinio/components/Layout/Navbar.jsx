import { useNavigate, useLocation } from 'react-router-dom';
import { useModal } from '../../../component/ui/ModalProvider';

export default function Navbar({ records, onClearData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmar } = useModal();
  const isConcejo = location.pathname.includes('concejo');

  const dbTotalMesas = records.length;
  const dbTotalTokens = records.reduce((s, r) => s + (r.tokens?.total || 0), 0);
  const dbTotalCost = records.reduce((s, r) => s + (r.costoEstimado || 0), 0);
  const dbModelo = records[0]?.modeloUsado || '';
  const hasRecords = dbTotalMesas > 0;

  return (
    <header className="bg-gray-900 text-white sticky top-0 shadow z-40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">Escrutinio Electoral</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/escrutinio/presidenciales')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                !isConcejo
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Presidenciales
            </button>
            <button
              onClick={() => navigate('/escrutinio/concejo')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                isConcejo
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Concejo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {hasRecords ? (
            <>
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded">
                {dbTotalMesas} {dbTotalMesas === 1 ? 'mesa' : 'mesas'}
              </span>
              {dbModelo && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                  {dbModelo}
                </span>
              )}
              <span className="bg-gray-600 text-white text-xs px-2 py-0.5 rounded">
                {dbTotalTokens.toLocaleString()} tk
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${dbTotalCost === 0 ? 'bg-green-600' : 'bg-yellow-500 text-black'}`}>
                ${dbTotalCost.toFixed(4)}
              </span>
            </>
          ) : (
            <span className="text-gray-400 text-xs">Sin actividad</span>
          )}

          {onClearData && (
            <button
              onClick={async () => {
                const ok = await confirmar({
                  titulo: isConcejo ? 'Borrar datos de concejo' : 'Limpiar datos de escrutinio',
                  mensaje: isConcejo
                    ? '¿Estás seguro de borrar todos los datos de concejo? Esta acción no se puede deshacer.'
                    : '¿Estás seguro de borrar todos los datos de escrutinio? Esta acción no se puede deshacer.',
                  textoConfirmar: 'Borrar',
                  textoCancelar: 'Cancelar',
                  peligro: true,
                  icono: '🗑️',
                });

                if (ok) onClearData();
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-colors ml-2"
            >
              Limpiar datos
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
