import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// ================================
// 🪟 SISTEMA DE MODALES
// ================================
// Reemplaza los diálogos nativos del navegador por modales con el
// mismo lenguaje visual del CRM (tarjeta #1E293B, bordes slate, botones
// indigo/rojo/slate).
//
// API:
//   mostrarAviso({ titulo, mensaje, tipo, icono })
//     tipo: "info" | "exito" | "advertencia" | "error" | "peligro"
//
//   await confirmar({ titulo, mensaje, textoConfirmar, textoCancelar, peligro, icono })
//     Devuelve true solo si el usuario confirma. Cancelar, Escape o clic
//     fuera resuelven false y no ejecutan ninguna acción.

const ModalContext = createContext(null);

const VARIANTES = {
  peligro: {
    icono: "⚠️",
    titulo: "text-red-400",
    circulo: "bg-red-500/15 border-red-500/30",
  },
  error: {
    icono: "❌",
    titulo: "text-red-400",
    circulo: "bg-red-500/15 border-red-500/30",
  },
  exito: {
    icono: "✅",
    titulo: "text-green-400",
    circulo: "bg-green-500/15 border-green-500/30",
  },
  advertencia: {
    icono: "⚠️",
    titulo: "text-amber-400",
    circulo: "bg-amber-500/15 border-amber-500/30",
  },
  info: {
    icono: "ℹ️",
    titulo: "text-indigo-400",
    circulo: "bg-indigo-500/15 border-indigo-500/30",
  },
};

let secuencia = 0;

export function ModalProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const actualRef = useRef(null);
  const colaRef = useRef([]);
  const cancelarRef = useRef(null);
  const confirmarRef = useRef(null);

  const abrir = useCallback((nuevo) => {
    const item = { ...nuevo, id: ++secuencia };

    // Si ya hay un modal abierto, se encola para no perder avisos seguidos.
    if (actualRef.current) {
      colaRef.current.push(item);
    } else {
      actualRef.current = item;
      setDialogo(item);
    }
  }, []);

  const cerrar = useCallback((resultado) => {
    const actual = actualRef.current;
    if (!actual) return;

    // Resuelve la promesa de confirmación (false al cancelar).
    if (typeof actual.resolve === "function") {
      actual.resolve(resultado);
    }

    const siguiente = colaRef.current.shift() || null;
    actualRef.current = siguiente;
    setDialogo(siguiente);
  }, []);

  const mostrarAviso = useCallback(
    ({ titulo, mensaje, tipo = "info", icono } = {}) => {
      abrir({ modo: "aviso", tipo, titulo, mensaje, icono });
    },
    [abrir]
  );

  const confirmar = useCallback(
    ({
      titulo,
      mensaje,
      textoConfirmar = "Confirmar",
      textoCancelar = "Cancelar",
      peligro = false,
      icono,
    } = {}) =>
      new Promise((resolve) => {
        abrir({
          modo: "confirmacion",
          tipo: peligro ? "peligro" : "info",
          titulo,
          mensaje,
          textoConfirmar,
          textoCancelar,
          peligro,
          icono,
          resolve,
        });
      }),
    [abrir]
  );

  // Escape = cancelar/cerrar, bloqueo del scroll de fondo y foco inicial seguro.
  useEffect(() => {
    if (!dialogo) return;

    const alPresionar = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar(false);
      }
    };

    window.addEventListener("keydown", alPresionar);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // En confirmaciones el foco arranca en Cancelar (evita borrados accidentales).
    const temporizador = setTimeout(() => {
      const objetivo =
        dialogo.modo === "confirmacion" ? cancelarRef.current : confirmarRef.current;
      objetivo?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflowPrevio;
      clearTimeout(temporizador);
    };
  }, [dialogo, cerrar]);

  const valor = useMemo(() => ({ mostrarAviso, confirmar }), [mostrarAviso, confirmar]);

  const variante = VARIANTES[dialogo?.tipo] || VARIANTES.info;
  const esConfirmacion = dialogo?.modo === "confirmacion";

  return (
    <ModalContext.Provider value={valor}>
      {children}

      {dialogo &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onMouseDown={(e) => {
              // Clic fuera de la tarjeta = cancelar.
              if (e.target === e.currentTarget) cerrar(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`modal-titulo-${dialogo.id}`}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-[#1E293B] text-white shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="relative px-6 pt-6 text-center">
                <button
                  type="button"
                  onClick={() => cerrar(false)}
                  aria-label="Cerrar"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-700/60 hover:text-white"
                >
                  ✕
                </button>

                <div
                  className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border text-xl ${variante.circulo}`}
                >
                  {dialogo.icono || variante.icono}
                </div>

                {dialogo.titulo && (
                  <h2
                    id={`modal-titulo-${dialogo.id}`}
                    className={`text-lg font-bold ${variante.titulo}`}
                  >
                    {dialogo.titulo}
                  </h2>
                )}

                {dialogo.mensaje && (
                  <p className="mt-2 max-h-[50vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-slate-300">
                    {dialogo.mensaje}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-700/70 bg-[#0F172A]/40 px-6 py-4 sm:flex-row sm:justify-end">
                {esConfirmacion && (
                  <button
                    ref={cancelarRef}
                    type="button"
                    onClick={() => cerrar(false)}
                    className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    {dialogo.textoCancelar}
                  </button>
                )}

                <button
                  ref={confirmarRef}
                  type="button"
                  onClick={() => cerrar(esConfirmacion)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition focus:outline-none focus:ring-2 ${
                    dialogo.peligro
                      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                      : "bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500"
                  }`}
                >
                  {esConfirmacion ? dialogo.textoConfirmar : "Entendido"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const contexto = useContext(ModalContext);

  if (!contexto) {
    throw new Error("useModal() debe usarse dentro de <ModalProvider>.");
  }

  return contexto;
}

export default ModalProvider;
