import { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";
import { enviroments } from "../env";
import AvisoBloqueo from "./AvisoBloqueo";
import { useModal } from "./ui/ModalProvider";

// Límites alineados con las columnas de `consultas` en la base de datos.
const LIMITES = { cedula: 20, nombre: 200, telefono: 20 };
const MAX_TELEFONO_INDIVIDUAL = 10;

// Quita TODOS los espacios (incluye NBSP y espacios tipográficos que mete Excel al copiar/pegar).
const limpiarNumero = (valor) =>
  String(valor ?? "").replace(/[\s\u00A0\u2007\u202F]+/g, "");

// Recorta y colapsa espacios internos.
const normalizarNombre = (valor) =>
  String(valor ?? "").trim().replace(/\s+/g, " ");

const normalizarFila = (fila = {}) => ({
  cedula: limpiarNumero(fila.cedula),
  nombreCompleto: normalizarNombre(fila.nombreCompleto),
  telefono: limpiarNumero(fila.telefono),
});

const esFilaVacia = (fila) => !fila.cedula && !fila.nombreCompleto && !fila.telefono;

const normalizarEncabezado = (valor) =>
  String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// Motivos cortos (con el porqué) para las filas rechazadas del Excel.
const motivosFila = ({ cedula, nombreCompleto, telefono }) => {
  const motivos = [];

  if (!cedula) motivos.push("falta la cédula (es el documento con el que se consulta la Registraduría)");
  else if (!/^\d+$/.test(cedula)) motivos.push("la cédula debe ser solo números (sin puntos, comas ni guiones)");
  else if (cedula.length > LIMITES.cedula) motivos.push(`la cédula no puede superar ${LIMITES.cedula} caracteres`);

  if (!nombreCompleto) motivos.push("falta el nombre completo (identifica a la persona en el registro)");
  else if (nombreCompleto.length < 3) motivos.push("el nombre completo debe tener al menos 3 caracteres");
  else if (nombreCompleto.length > LIMITES.nombre) motivos.push(`el nombre completo no puede superar ${LIMITES.nombre} caracteres`);

  if (!telefono) motivos.push("falta el teléfono (se usa para contactar a la persona)");
  else if (!/^\d+$/.test(telefono)) motivos.push("el teléfono debe ser solo números (sin letras ni símbolos)");
  else if (telefono.length > LIMITES.telefono) motivos.push(`el teléfono no puede superar ${LIMITES.telefono} caracteres`);

  return motivos;
};

// Mensajes detallados para la consulta individual.
const validarCamposIndividual = ({ cedula, nombreCompleto, telefono }) => {
  const errores = {};

  if (!cedula) errores.cedula = "La cédula es obligatoria: es el documento con el que se consulta la Registraduría.";
  else if (!/^\d+$/.test(cedula)) errores.cedula = "La cédula debe contener solo números, sin puntos, comas ni guiones.";
  else if (cedula.length > LIMITES.cedula) errores.cedula = `La cédula no puede superar ${LIMITES.cedula} caracteres (límite de la base de datos).`;

  if (!nombreCompleto) errores.nombreCompleto = "El nombre completo es obligatorio: identifica a la persona en el registro.";
  else if (nombreCompleto.length < 3) errores.nombreCompleto = "El nombre completo debe tener al menos 3 caracteres.";
  else if (nombreCompleto.length > LIMITES.nombre) errores.nombreCompleto = `El nombre completo no puede superar ${LIMITES.nombre} caracteres (límite de la base de datos).`;

  if (!telefono) errores.telefono = "El teléfono es obligatorio: se usa para contactar a la persona registrada.";
  else if (!/^\d+$/.test(telefono)) errores.telefono = "El teléfono debe contener solo números, sin letras ni símbolos.";
  else if (telefono.length > LIMITES.telefono) errores.telefono = `El teléfono no puede superar ${LIMITES.telefono} caracteres (límite de la base de datos).`;

  return errores;
};

const ETIQUETAS_ESTADO_CARGA = {
  en_espera: "⏳ En cola",
  procesando: "🔄 Procesando",
  esperando_limite: "⏳ Reintentando",
  completado: "✅ Completada",
  error: "⚠️ No completada",
};

const etiquetaEstadoCarga = (estado) => ETIQUETAS_ESTADO_CARGA[estado] || "Carga masiva";

// Mensaje entendible para el usuario. Nunca usa detalles técnicos del backend.
const mensajeEstadoCarga = (job) => {
  if (!job) return "";
  if (job.estado === "en_espera") {
    const posicion = job.posicionCola ? ` (posición ${job.posicionCola} en la cola)` : "";
    return `⏳ En cola${posicion}. Se iniciará automáticamente cuando haya un cupo disponible.`;
  }
  if (job.estado === "esperando_limite") {
    const espera = Number(job.esperaSegundos) > 0 ? ` Espera aproximada: ${job.esperaSegundos}s.` : "";
    return `⏳ Reintentando… La Registraduría está limitando las consultas.${espera} El sistema seguirá automáticamente; puedes cerrar esta página.`;
  }
  if (job.estado === "procesando") {
    return job.mensaje || "🔄 Procesando la carga masiva...";
  }
  if (job.estado === "completado") {
    return job.mensaje || "Carga masiva completada.";
  }
  if (job.estado === "error") {
    return job.mensaje || "No se pudo completar la carga masiva. Las filas quedaron guardadas.";
  }
  return job.mensaje || "";
};

const ESTADO_FILA_DETALLE = {
  exitoso: { texto: "✅ Exitoso", clase: "text-green-400 font-medium" },
  duplicado: { texto: "❌ Duplicado", clase: "text-amber-400 font-medium" },
  inhabilitado: { texto: "⛔ Inhabilitado", clase: "text-red-400 font-medium" },
  error: { texto: "⚠️ Error", clase: "text-rose-400 font-medium" },
  omitido: { texto: "— Omitido", clase: "text-slate-500" },
  pendiente: { texto: "⏳ Pendiente", clase: "text-sky-300 font-medium" },
  pendiente_reintento: { texto: "⏳ Pendiente por reintentar", clase: "text-sky-300 font-medium" },
  procesando: { texto: "🔄 Procesando", clase: "text-indigo-300 font-medium" },
  en_espera: { texto: "⏳ En cola", clase: "text-amber-300 font-medium" },
  esperando_limite: { texto: "⏳ Reintentando", clase: "text-amber-300 font-medium" },
  completado: { texto: "✅ Completada", clase: "text-green-400 font-medium" },
};

const textoResumenCarga = (resumen = {}) => {
  const plural = (n, singular, plural) =>
    `${n ?? 0} ${Number(n) === 1 ? singular : plural}`;
  return [
    plural(resumen.exitosos, "exitoso", "exitosos"),
    plural(resumen.duplicados, "duplicado", "duplicados"),
    plural(resumen.inhabilitados, "inhabilitado", "inhabilitados"),
    plural(resumen.errores, "error", "errores"),
    Number(resumen.pendientes || 0) > 0
      ? plural(resumen.pendientes, "pendiente", "pendientes")
      : null,
    Number(resumen.omitidos || 0) > 0
      ? plural(resumen.omitidos, "omitido", "omitidos")
      : null,
  ]
    .filter(Boolean)
    .join(", ");
};

export default function Consulta() {
  const { confirmar } = useModal();
  const [cedula, setCedula] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [erroresCampos, setErroresCampos] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [userId, setUserId] = useState(null);
  const [consultas, setConsultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensajeModal, setMensajeModal] = useState("");
  const [total, setTotal] = useState(0);
  const socketRef = useRef(null);
  const pollingRef = useRef(null);

  // Estado para carga masiva
  const [filasExcel, setFilasExcel] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0, cedula: "" });
  const [resultados, setResultados] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [captura, setCaptura] = useState(null);
  const [cargasRecientes, setCargasRecientes] = useState([]);
  const [jobIdActual, setJobIdActual] = useState(null);
  const [borrandoFiltrados, setBorrandoFiltrados] = useState(false);
  const [detalleCarga, setDetalleCarga] = useState(null);
  const [cargandoDetalleId, setCargandoDetalleId] = useState(null);
  const [paginaCargas, setPaginaCargas] = useState(1);
  const pollingJobRef = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const socket = io(enviroments.backendUrl);
    socketRef.current = socket;

    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const decoded = jwtDecode(token);
        const uid = decoded.id;
        setUserId(uid);

        const [consultasRes, countRes] = await Promise.all([
          axios.get(`${enviroments.backendUrl}/api/consulta/${uid}`, getAuthHeader()),
          axios.get(`${enviroments.backendUrl}/api/consulta/contar/${uid}`, getAuthHeader()),
        ]);

        setConsultas(consultasRes.data);
        setTotal(countRes.data.total);
      } catch (error) {
        console.error("Error al obtener datos:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchInitialData();

    socket.on("progreso", (msg) => {
      // Extraer número de progreso del mensaje: "[3/50] Procesando cédula: 123"
      const match = msg.match(/\[(\d+)\/(\d+)\]/);
      if (match) {
        setProgreso({ actual: Number(match[1]), total: Number(match[2]), cedula: msg });
      }
      setMensajeModal(msg);
      // En carga masiva el seguimiento lo lleva el polling: si el usuario cierra
      // el popup, no se le vuelve a abrir con cada mensaje del socket.
      if (!pollingJobRef.current) setModalAbierto(true);
    });

    socket.on("captura", (data) => {
      setCaptura(data);
    });

    return () => {
      socket.off("progreso");
      socket.off("captura");
      socket.disconnect();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const refreshData = async () => {
    if (!userId) return;
    try {
      const [consultasRes, countRes] = await Promise.all([
        axios.get(`${enviroments.backendUrl}/api/consulta/${userId}`, getAuthHeader()),
        axios.get(`${enviroments.backendUrl}/api/consulta/contar/${userId}`, getAuthHeader()),
      ]);
      setConsultas(consultasRes.data);
      setTotal(countRes.data.total);
    } catch (error) {
      console.error("Error al actualizar datos:", error);
    }
  };

  const handleExport = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(
        `${enviroments.backendUrl}/api/consulta/exportar/${userId}`,
        {
          ...getAuthHeader(),
          responseType: "blob",
          params: busqueda.trim() ? { q: busqueda.trim() } : {},
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `consultas_${userId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error al exportar:", error);
    }
  };

  const handleDownloadPlantilla = () => {
    const data = [
      ['cédula', 'nombre completo', 'teléfono'],
      ['1234567890', 'Pedro Pérez', '3001234567'],
    ];
    for (let i = 0; i < 49; i++) data.push(['', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Formato texto en las 3 columnas: evita puntos de miles y notación científica
    // en cédulas/teléfonos largos cuando el usuario escribe en Excel.
    for (let r = 1; r <= 51; r++) {
      for (const col of ['A', 'B', 'C']) {
        const addr = `${col}${r}`;
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].z = '@';
      }
    }
    ws['!cols'] = [{ wch: 16 }, { wch: 32 }, { wch: 16 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_consultas.xlsx');
  };

  const handleDelete = async (id) => {
    const ok = await confirmar({
      titulo: "Eliminar registro",
      mensaje:
        "¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer.",
      textoConfirmar: "Eliminar",
      textoCancelar: "Cancelar",
      peligro: true,
      icono: "🗑️",
    });

    if (!ok) return;

    try {
      await axios.delete(`${enviroments.backendUrl}/api/consulta/${id}`, getAuthHeader());
      await refreshData();
      setPaginaActual(1);
    } catch (error) {
      console.error("Error al eliminar el registro:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Limpieza + validación con los límites reales de la base de datos.
    const datos = normalizarFila({ cedula, nombreCompleto, telefono });
    const errores = validarCamposIndividual(datos);

    if (Object.keys(errores).length > 0) {
      setErroresCampos(errores);
      setAviso({ tipo: "error", texto: Object.values(errores).join(" ") });
      return;
    }

    if (!userId) return;

    setErroresCampos({});
    setCedula(datos.cedula);
    setNombreCompleto(datos.nombreCompleto);
    setTelefono(datos.telefono);

    try {
      setModalAbierto(true);
      setMensajeModal("🔄 Iniciando consulta...");
      setCaptura(null);

      const response = await axios.post(
        `${enviroments.backendUrl}/api/consulta`,
        { cedula: datos.cedula, userId, socketId: socketRef.current?.id, nombreCompleto: datos.nombreCompleto, telefono: datos.telefono },
        getAuthHeader()
      );

      if (response.data.success) {
        await refreshData();
        setNombreCompleto("");
        setCedula("");
        setTelefono("");
        setErroresCampos({});
        setAviso({ tipo: "ok", texto: "Consulta guardada exitosamente." });
        setTimeout(() => {
          setModalAbierto(false);
          setMensajeModal("");
        }, 3000);
      } else {
        if (response.data.errores) setErroresCampos(response.data.errores);
        setAviso({ tipo: "error", texto: response.data.message });
        setMensajeModal(`❌ ${response.data.message}`);
        setTimeout(() => setModalAbierto(false), 5000);
      }
    } catch (error) {
      console.error("Error al guardar datos:", error);
      const msg = error.response?.data?.message || "Error al realizar la consulta.";
      setAviso({ tipo: "error", texto: msg });
      setMensajeModal(`❌ ${msg}`);
      setTimeout(() => setModalAbierto(false), 5000);
    }
  };

  // ─── Carga masiva ───

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // raw: false mantiene cédulas/teléfonos como texto (evita notación científica).
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

      // Mapa de encabezados normalizados (sin tildes ni mayúsculas) → clave real de la fila.
      const claves = json.length > 0 ? Object.keys(json[0]) : [];
      const mapaHeaders = {};
      claves.forEach((k) => {
        mapaHeaders[normalizarEncabezado(k)] = k;
      });
      const headers = Object.keys(mapaHeaders);

      const tieneCedula = headers.includes("cedula");
      const tieneNombre = headers.some((h) => h === "nombre completo" || h === "nombrecompleto" || h === "nombre");
      const tieneTelefono = headers.includes("telefono");

      const faltantes = [];
      if (!tieneCedula) faltantes.push("cédula");
      if (!tieneNombre) faltantes.push("nombre completo");
      if (!tieneTelefono) faltantes.push("teléfono");

      if (faltantes.length > 0) {
        setFilasExcel([]);
        setResultados(null);
        setProgreso({ actual: 0, total: 0, cedula: "" });
        setAviso({
          tipo: "error",
          texto: `El Excel no tiene la(s) columna(s) requerida(s): ${faltantes.join(", ")}. Los tres datos son obligatorios: cédula (documento de consulta), nombre completo (identifica a la persona) y teléfono (para contactarla). Usa la plantilla descargable.`,
        });
        return;
      }

      const valorDe = (row, ...alias) => {
        for (const a of alias) {
          const clave = mapaHeaders[a];
          if (clave !== undefined) return row[clave];
        }
        return "";
      };

      const mapeadas = json.map((row, index) => ({
        ...normalizarFila({
          cedula: valorDe(row, "cedula"),
          nombreCompleto: valorDe(row, "nombre completo", "nombrecompleto", "nombre"),
          telefono: valorDe(row, "telefono"),
        }),
        fila: index + 2, // fila 1 del Excel es el encabezado
      }));

      const conDatos = mapeadas.filter((f) => !esFilaVacia(f));

      if (conDatos.length === 0) {
        setFilasExcel([]);
        setResultados(null);
        setProgreso({ actual: 0, total: 0, cedula: "" });
        setAviso({ tipo: "error", texto: "El Excel no tiene filas con datos para procesar." });
        return;
      }

      if (conDatos.length > 50) {
        setFilasExcel([]);
        setResultados(null);
        setProgreso({ actual: 0, total: 0, cedula: "" });
        setAviso({
          tipo: "error",
          texto: `El Excel tiene ${conDatos.length} registros con datos; el máximo es 50. Divide el archivo y vuelve a intentarlo.`,
        });
        return;
      }

      // Rechazo total: si una sola fila está incompleta o excede un límite,
      // no se procesa ninguna (no se gasta scraping en datos inválidos).
      const erroresFilas = [];
      conDatos.forEach((f) => {
        const motivos = motivosFila(f);
        if (motivos.length > 0) erroresFilas.push({ fila: f.fila, motivos });
      });

      if (erroresFilas.length > 0) {
        setFilasExcel([]);
        setResultados(null);
        setProgreso({ actual: 0, total: 0, cedula: "" });
        const mostradas = erroresFilas.slice(0, 10);
        const detalle = mostradas
          .map((e) => `Fila ${e.fila}: ${e.motivos.join("; ")}.`)
          .join(" ");
        const restantes = erroresFilas.length - mostradas.length;
        setAviso({
          tipo: "error",
          texto: `No se procesó el archivo. Corrige estas filas: ${detalle}${restantes > 0 ? ` (y ${restantes} fila(s) más).` : ""}`,
        });
        return;
      }

      setFilasExcel(conDatos);
      setResultados(null);
      setProgreso({ actual: 0, total: 0, cedula: "" });
      setAviso(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const limpiarPreview = () => {
    setFilasExcel([]);
    setResultados(null);
    setProgreso({ actual: 0, total: 0, cedula: "" });
    setCaptura(null);
  };

  const detenerPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollingJobRef.current = null;
  };

  const finalizarConResumen = async (resumen, mensaje) => {
    detenerPolling();
    const r = resumen || {};
    const pendientes = Number(r.pendientes || 0);

    if (pendientes > 0) {
      setAviso({
        tipo: "warning",
        texto: mensaje || `Carga finalizada con ${pendientes} fila(s) pendiente(s). Puedes reintentarlas cuando quieras.`,
      });
    } else if ((r.errores || 0) > 0 || (r.duplicados || 0) > 0 || (r.inhabilitados || 0) > 0) {
      setAviso({
        tipo: "error",
        texto: `Carga masiva finalizada: ${textoResumenCarga(r)}.`,
      });
    } else {
      setAviso({
        tipo: "ok",
        texto: `Carga masiva completada: ${r.exitosos || 0} registros exitosos.`,
      });
    }

    await refreshData();
    setProcesando(false);
    setModalAbierto(false);
    fetchCargasMasivas();
  };

  const iniciarPolling = (jobId, { mostrarModal = true } = {}) => {
    detenerPolling();
    pollingJobRef.current = jobId;
    setJobIdActual(jobId);
    setProcesando(true);
    if (mostrarModal) setModalAbierto(true);

    const consultar = async () => {
      try {
        const estadoRes = await axios.get(
          `${enviroments.backendUrl}/api/consulta/carga-masiva/${jobId}`,
          getAuthHeader()
        );
        const job = estadoRes.data;

        // Mantiene la tarjeta de cargas recientes sincronizada con el popup y
        // la barra de progreso sin hacer otra petición al servidor.
        setCargasRecientes((prev) => prev.map((carga) =>
          carga.jobId === job.jobId
            ? {
                ...carga,
                estado: job.estado,
                total: job.total,
                procesados: job.procesados,
                resumen: job.resumen,
                mensaje: job.mensaje,
                posicionCola: job.posicionCola,
              }
            : carga
        ));

        if (job.total > 0) {
          setProgreso({
            actual: job.procesados || 0,
            total: job.total,
            cedula: mensajeEstadoCarga(job),
          });
        }

        setMensajeModal(mensajeEstadoCarga(job));

        if (job.estado === "completado") {
          setResultados({
            jobId: job.jobId,
            estado: job.estado,
            resumen: job.resumen || {},
            resultados: job.resultados || [],
            mensaje: job.mensaje,
          });
          await finalizarConResumen(job.resumen, job.mensaje);
        } else if (job.estado === "error") {
          detenerPolling();
          setProcesando(false);
          const texto = job.mensaje || "No se pudo completar la carga masiva. Las filas quedaron guardadas.";
          setAviso({ tipo: "error", texto });
          setMensajeModal(`❌ ${texto}`);
          setModalAbierto(true);
          setTimeout(() => setModalAbierto(false), 6000);
          fetchCargasMasivas();
        } else {
          // No reabrir el popup en cada polling: si el usuario lo cierra,
          // la carga sigue en el servidor y puede reabrirlo con "Ver progreso".
          setProcesando(true);
        }
      } catch (pollError) {
        console.error("Error consultando el estado de la carga masiva:", pollError);
        if (pollError.response?.status === 404) {
          detenerPolling();
          setProcesando(false);
          setAviso({
            tipo: "error",
            texto: "La carga masiva ya no está disponible. Vuelve a subir el archivo si es necesario.",
          });
        }
      }
    };

    consultar();
    pollingRef.current = setInterval(consultar, 2500);
  };

  const fetchCargasMasivas = async () => {
    try {
      const { data } = await axios.get(
        `${enviroments.backendUrl}/api/consulta/carga-masiva`,
        getAuthHeader()
      );
      const cargas = data.cargas || [];
      setCargasRecientes(cargas);

      const activa = cargas.find((c) =>
        ["en_espera", "procesando", "esperando_limite"].includes(c.estado)
      );
      // Solo se retoma automáticamente la cola si el usuario no está siguiendo
      // ya una carga concreta (evita cambiarle de job mientras mira el progreso).
      if (activa && !pollingJobRef.current) {
        iniciarPolling(activa.jobId, { mostrarModal: false });
      }
      return cargas;
    } catch (error) {
      console.error("Error al listar cargas masivas:", error);
      return [];
    }
  };

  const handleReintentar = async (jobId) => {
    if (!jobId) return;
    try {
      await axios.post(
        `${enviroments.backendUrl}/api/consulta/carga-masiva/${jobId}/reintentar`,
        {},
        getAuthHeader()
      );
      setResultados(null);
      setAviso({
        tipo: "ok",
        texto: "Las filas pendientes se pusieron en cola. La carga continuará automáticamente.",
      });
      iniciarPolling(jobId);
      fetchCargasMasivas();
    } catch (error) {
      const msg = error.response?.data?.message || "No se pudieron reintentar las filas pendientes.";
      setAviso({ tipo: "error", texto: msg });
    }
  };

  const cargarDetalleCarga = async (jobId) => {
    if (!jobId || cargandoDetalleId) return;
    setCargandoDetalleId(jobId);
    try {
      const estadoRes = await axios.get(
        `${enviroments.backendUrl}/api/consulta/carga-masiva/${jobId}`,
        getAuthHeader()
      );
      setDetalleCarga(estadoRes.data);
    } catch (error) {
      console.error("Error al cargar el detalle de la carga masiva:", error);
      setAviso({
        tipo: "error",
        texto: error.response?.data?.message || "No se pudo cargar el detalle de la carga masiva.",
      });
    } finally {
      setCargandoDetalleId(null);
    }
  };

  const handleProcesar = async () => {
    if (!userId || filasExcel.length === 0) return;

    // Revalidación defensiva antes de enviar (el archivo ya se validó al cargarlo).
    const errores = [];
    filasExcel.forEach((f) => {
      const motivos = motivosFila(f);
      if (motivos.length > 0) errores.push(`Fila ${f.fila ?? "?"}: ${motivos.join("; ")}.`);
    });
    if (errores.length > 0) {
      setAviso({ tipo: "error", texto: `No se procesó la carga. ${errores.join(" ")}` });
      return;
    }

    setProcesando(true);
    setResultados(null);
    setCaptura(null);
    setMensajeModal("🔄 Enviando la carga al servidor...");
    setProgreso({ actual: 0, total: filasExcel.length, cedula: "Enviando..." });
    setModalAbierto(true);

    try {
      const response = await axios.post(
        `${enviroments.backendUrl}/api/consulta/carga-masiva`,
        { filas: filasExcel, socketId: socketRef.current?.id },
        getAuthHeader()
      );

      if (response.data && response.data.jobId) {
        const jobId = response.data.jobId;
        const estadoInicial = mensajeEstadoCarga(response.data);
        setMensajeModal(estadoInicial);
        setProgreso({
          actual: response.data.resumen?.procesados || 0,
          total: response.data.resumen?.total || filasExcel.length,
          cedula: estadoInicial,
        });
        iniciarPolling(jobId);
        fetchCargasMasivas();
      } else if (response.data && response.data.success) {
        setResultados(response.data);
        await finalizarConResumen(response.data.resumen, response.data.mensaje);
      } else {
        const msg = response.data?.message || "No se pudo iniciar la carga masiva.";
        setAviso({ tipo: "error", texto: msg });
        setMensajeModal(`❌ ${msg}`);
        setModalAbierto(true);
        setTimeout(() => setModalAbierto(false), 6000);
        setProcesando(false);
      }
    } catch (error) {
      console.error("Error en carga masiva:", error);
      const msg = error.response?.data?.message || "No se pudo iniciar la carga masiva. Inténtalo de nuevo.";
      setAviso({ tipo: "error", texto: msg });
      setMensajeModal(`❌ ${msg}`);
      setModalAbierto(true);
      setTimeout(() => setModalAbierto(false), 6000);
      setProcesando(false);
    }
  };

  useEffect(() => {
    if (userId) fetchCargasMasivas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (cargando) {
    return <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">Cargando...</div>;
  }

  // ─── Búsqueda en vivo de la tabla (cédula o nombre, sin tildes ni mayúsculas) ───
  const normalizarTexto = (texto) =>
    String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const q = normalizarTexto(busqueda);
  const consultasFiltradas = q
    ? consultas.filter(
        (item) =>
          normalizarTexto(item.cedula).includes(q) ||
          normalizarTexto(item.nombreCompleto).includes(q)
      )
    : consultas;

  // ─── Paginación: 20 por página solo si hay más de 20 registros ───
  const ITEMS_POR_PAGINA = 20;
  const totalPaginas = Math.ceil(consultasFiltradas.length / ITEMS_POR_PAGINA);
  const paginaEfectiva = Math.min(paginaActual, Math.max(1, totalPaginas));
  const inicio = (paginaEfectiva - 1) * ITEMS_POR_PAGINA;
  const consultasPagina = consultasFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);

  const handleDeleteFiltrados = async () => {
    const cantidad = consultasFiltradas.length;
    if (cantidad === 0 || borrandoFiltrados) return;

    const ok = await confirmar({
      titulo: "Borrar todos los votantes",
      mensaje: busqueda.trim()
        ? `Se eliminarán ${cantidad} registro(s) que coinciden con la búsqueda actual. Esta acción no se puede deshacer.`
        : `Se eliminarán los ${cantidad} registro(s) de tu lista. Esta acción no se puede deshacer.`,
      textoConfirmar: `Sí, eliminar ${cantidad}`,
      textoCancelar: "Cancelar",
      peligro: true,
      icono: "🗑️",
    });

    if (!ok) return;

    setBorrandoFiltrados(true);
    try {
      const ids = consultasFiltradas.map((item) => item.id);
      const { data } = await axios.delete(
        `${enviroments.backendUrl}/api/consulta/masiva`,
        {
          ...getAuthHeader(),
          data: { ids },
        }
      );

      await refreshData();
      setPaginaActual(1);
      setAviso({
        tipo: "ok",
        texto: data.message || `Se eliminaron ${data.eliminados ?? cantidad} votantes.`,
      });
    } catch (error) {
      console.error("Error al eliminar los registros filtrados:", error);
      setAviso({
        tipo: "error",
        texto: error.response?.data?.message || "No se pudieron eliminar los registros. Inténtalo de nuevo.",
      });
    } finally {
      setBorrandoFiltrados(false);
    }
  };

  // ─── Cargas recientes: activas primero, luego terminadas con pendientes
  //     (botón Reintentar) y luego el resto. Paginadas de a 3 para que la
  //     sección no se alargue hacia abajo. ───
  const cargasOrdenadas = [
    ...cargasRecientes.filter((c) =>
      ["en_espera", "procesando", "esperando_limite"].includes(c.estado)
    ),
    ...cargasRecientes.filter(
      (c) =>
        ["completado", "error"].includes(c.estado) &&
        (c.resumen?.pendientes || 0) > 0
    ),
    ...cargasRecientes.filter(
      (c) =>
        ["completado", "error"].includes(c.estado) &&
        !((c.resumen?.pendientes || 0) > 0)
    ),
  ];

  const CARGAS_POR_PAGINA = 3;
  const totalPaginasCargas = Math.ceil(cargasOrdenadas.length / CARGAS_POR_PAGINA);
  const paginaCargasEfectiva = Math.min(paginaCargas, Math.max(1, totalPaginasCargas));
  const inicioCargas = (paginaCargasEfectiva - 1) * CARGAS_POR_PAGINA;
  const cargasPagina = cargasOrdenadas.slice(inicioCargas, inicioCargas + CARGAS_POR_PAGINA);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 max-w-6xl mx-auto">
      <AvisoBloqueo />

      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-white text-black p-6 rounded-xl shadow-lg max-w-md w-full">
            {procesando ? (
              <div className="text-center">
                <p className="text-sm mb-3">{mensajeModal}</p>
                {progreso.total > 0 && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {progreso.actual} de {progreso.total}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-center">{mensajeModal}</p>
            )}
            {captura && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1 text-left">📸 {captura.nombre}</p>
                <img
                  src={captura.dataUrl}
                  alt={captura.nombre}
                  className="w-full rounded-lg border border-gray-300"
                />
              </div>
            )}
            <button
              onClick={() => setModalAbierto(false)}
              className="mt-4 w-full bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg text-sm transition"
            >
              {procesando ? "Cerrar (la carga sigue en el servidor)" : "Cerrar"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Detalle de una carga masiva (incluye motivo por fila) ─── */}
      {detalleCarga && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-[#1E293B] text-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-slate-700"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-indigo-400">Detalle de la carga masiva</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {detalleCarga.procesados || 0} de {detalleCarga.total || 0} registros procesados
                  {detalleCarga.mensaje ? ` · ${detalleCarga.mensaje}` : ""}
                </p>
              </div>
              <button
                onClick={() => setDetalleCarga(null)}
                className="text-slate-400 hover:text-white font-bold text-xl leading-none"
                aria-label="Cerrar detalle"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-3">
              <p className="text-sm text-slate-300">
                {textoResumenCarga(detalleCarga.resumen || {})}
              </p>
            </div>

            <div className="overflow-auto max-h-[60vh] px-5 pb-5">
              <table className="min-w-full text-sm bg-[#0F172A] text-white border border-slate-700 rounded-lg overflow-hidden">
                <thead className="bg-indigo-600 text-xs font-semibold uppercase text-white sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Cédula</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalleCarga.resultados || []).map((r, i) => {
                    const estado = ESTADO_FILA_DETALLE[r.estado] || {
                      texto: r.estado,
                      clase: "text-slate-300",
                    };
                    return (
                      <tr key={i} className="border-t border-slate-700/50">
                        <td className="px-3 py-2">{r.cedula}</td>
                        <td className="px-3 py-2">{r.nombreCompleto || "-"}</td>
                        <td className={`px-3 py-2 ${estado.clase}`}>{estado.texto}</td>
                        <td className="px-3 py-2 text-slate-300 text-xs">
                          {r.mensaje || "Sin observaciones."}
                        </td>
                      </tr>
                    );
                  })}
                  {(detalleCarga.resultados || []).length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-gray-400">
                        No hay filas registradas para esta carga.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
          aviso.tipo === "ok"
            ? "bg-green-500/15 border-green-500/40 text-green-300"
            : aviso.tipo === "warning"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
              : "bg-red-500/15 border-red-500/40 text-red-300"
        }`}>
          <span className="flex-1">{aviso.texto}</span>
          <button
            onClick={() => setAviso(null)}
            className="text-slate-400 hover:text-white font-bold leading-none"
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Totales ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-gray-400">Total de registros: </span>
          <span className="font-semibold text-lg">{total}</span>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-center text-indigo-400 mb-6">Consulta Individual</h1>

      {/* ─── Formulario individual ─── */}
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row justify-center items-start gap-2 mb-6">
        <div className="flex flex-col w-full md:w-96">
          <label className="text-xs text-gray-300 mb-1">Nombre completo <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={nombreCompleto}
            maxLength={LIMITES.nombre}
            onChange={(e) => {
              setNombreCompleto(e.target.value.slice(0, LIMITES.nombre));
              if (erroresCampos.nombreCompleto) setErroresCampos((prev) => ({ ...prev, nombreCompleto: undefined }));
            }}
            className={`bg-[#1E293B] text-white border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${erroresCampos.nombreCompleto ? "border-red-500" : "border-gray-600"}`}
            placeholder="Ej: Pedro Pérez"
          />
          {erroresCampos.nombreCompleto && (
            <p className="text-xs text-red-400 mt-1">{erroresCampos.nombreCompleto}</p>
          )}
        </div>
        <div className="flex flex-col w-full md:w-64">
          <label className="text-xs text-gray-300 mb-1">Cédula <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={cedula}
            onChange={(e) => {
              const valor = limpiarNumero(e.target.value);
              if (/^[0-9]*$/.test(valor)) {
                setCedula(valor.slice(0, LIMITES.cedula));
                if (erroresCampos.cedula) setErroresCampos((prev) => ({ ...prev, cedula: undefined }));
              }
            }}
            className={`bg-[#1E293B] text-white border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${erroresCampos.cedula ? "border-red-500" : "border-gray-600"}`}
            placeholder="Ej: 123456789"
          />
          {erroresCampos.cedula && (
            <p className="text-xs text-red-400 mt-1">{erroresCampos.cedula}</p>
          )}
        </div>
        <div className="flex flex-col w-full md:w-40">
          <label className="text-xs text-gray-300 mb-1">Teléfono <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => {
              const valor = limpiarNumero(e.target.value);
              if (/^[0-9]*$/.test(valor)) {
                setTelefono(valor.slice(0, MAX_TELEFONO_INDIVIDUAL));
                if (erroresCampos.telefono) setErroresCampos((prev) => ({ ...prev, telefono: undefined }));
              }
            }}
            className={`bg-[#1E293B] text-white border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${erroresCampos.telefono ? "border-red-500" : "border-gray-600"}`}
            placeholder="Ej: 3001234567"
          />
          {erroresCampos.telefono && (
            <p className="text-xs text-red-400 mt-1">{erroresCampos.telefono}</p>
          )}
        </div>
        <button type="submit" className="bg-[rgba(133,59,206,0.27)] hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded w-full md:w-auto md:mt-6">
          ENVIAR
        </button>
      </form>

      {/* ─── Carga Masiva ─── */}
      <div className="border-t border-slate-700 pt-6 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-indigo-400">📦 Carga Masiva</h2>
          <button onClick={handleDownloadPlantilla} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm transition">
            📋 Descargar Plantilla
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm cursor-pointer transition">
            📁 Seleccionar Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </label>
          {filasExcel.length > 0 && (
            <>
              <span className="text-sm text-slate-300">
                {filasExcel.length} filas listas para procesar
              </span>
              <button onClick={limpiarPreview} className="text-slate-400 hover:text-white text-sm transition">✕ Limpiar</button>
            </>
          )}
        </div>

        {/* Cargas recientes: permite recuperar la cola aunque se cierre la página */}
        {cargasOrdenadas.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-slate-300">Cargas recientes</p>
            {cargasPagina.map((c) => {
              const activa = ["en_espera", "procesando", "esperando_limite"].includes(c.estado);
              const pendientes = c.resumen?.pendientes || 0;

              return (
                <div
                  key={c.jobId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-medium">{etiquetaEstadoCarga(c.estado)}</span>
                      <span className="text-slate-400 ml-2">{c.procesados || 0}/{c.total || 0}</span>
                      {c.estado === "en_espera" && c.posicionCola && (
                        <span className="text-amber-300 ml-2">posición {c.posicionCola}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{mensajeEstadoCarga(c)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activa && (
                      <button
                        onClick={() => {
                          setModalAbierto(true);
                          iniciarPolling(c.jobId);
                        }}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Ver progreso
                      </button>
                    )}
                    {["completado", "error"].includes(c.estado) && (
                      <button
                        onClick={() => cargarDetalleCarga(c.jobId)}
                        disabled={cargandoDetalleId === c.jobId}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs transition disabled:opacity-50"
                      >
                        {cargandoDetalleId === c.jobId ? "Cargando..." : "Ver detalle"}
                      </button>
                    )}
                    {["completado", "error"].includes(c.estado) && pendientes > 0 && (
                      <button
                        onClick={() => handleReintentar(c.jobId)}
                        className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Reintentar pendientes
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {totalPaginasCargas > 1 && (
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setPaginaCargas(paginaCargasEfectiva - 1)}
                  disabled={paginaCargasEfectiva <= 1}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1 rounded-lg text-xs transition"
                  aria-label="Página anterior de cargas"
                >
                  ‹
                </button>
                <span className="text-xs text-slate-400">
                  Página {paginaCargasEfectiva} de {totalPaginasCargas}
                </span>
                <button
                  onClick={() => setPaginaCargas(paginaCargasEfectiva + 1)}
                  disabled={paginaCargasEfectiva >= totalPaginasCargas}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1 rounded-lg text-xs transition"
                  aria-label="Página siguiente de cargas"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {filasExcel.length > 0 && (
          <div className="mb-4">
            <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-700 rounded-lg">
              <table className="min-w-full text-sm bg-[#1E293B] text-white">
                <thead className="bg-slate-700 text-xs uppercase text-slate-300 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Cédula</th>
                    <th className="px-3 py-2 text-left">Nombre completo</th>
                    <th className="px-3 py-2 text-left">Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {filasExcel.map((f, i) => (
                    <tr key={i} className="border-t border-slate-700/50">
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5">{f.cedula}</td>
                      <td className="px-3 py-1.5">{f.nombreCompleto}</td>
                      <td className="px-3 py-1.5">{f.telefono}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!procesando && (
              <button
                onClick={handleProcesar}
                disabled={filasExcel.length === 0}
                className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🚀 Procesar {filasExcel.length} consultas
              </button>
            )}
          </div>
        )}

        {/* Progreso */}
        {procesando && (
          <div className="mb-4 bg-slate-800/60 border border-slate-700/30 rounded-xl p-4">
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>
                {String(progreso.cedula || "").includes("En cola")
                  ? "⏳ En cola"
                  : String(progreso.cedula || "").includes("Reintentando")
                    ? "⏳ Reintentando…"
                    : "Procesando..."}
              </span>
              <span>{progreso.actual} de {progreso.total}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progreso.total > 0 ? (progreso.actual / progreso.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 truncate">{progreso.cedula}</p>
            {captura && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">📸 {captura.nombre}</p>
                <img
                  src={captura.dataUrl}
                  alt={captura.nombre}
                  className="w-full max-w-md rounded-lg border border-slate-600"
                />
              </div>
            )}
          </div>
        )}

        {/* Resultados */}
        {resultados && (
          <div className="mb-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{resultados.resumen?.exitosos ?? 0}</p>
                <p className="text-xs text-green-300">Exitosos</p>
              </div>
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{resultados.resumen?.duplicados ?? 0}</p>
                <p className="text-xs text-amber-300">Duplicados</p>
              </div>
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{resultados.resumen?.inhabilitados ?? 0}</p>
                <p className="text-xs text-red-300">Inhabilitados</p>
              </div>
              <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-400">{resultados.resumen?.errores ?? 0}</p>
                <p className="text-xs text-rose-300">Errores</p>
              </div>
              <div className="bg-sky-500/20 border border-sky-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-sky-300">{resultados.resumen?.pendientes ?? 0}</p>
                <p className="text-xs text-sky-200">Pendientes</p>
              </div>
              <div className="bg-slate-500/20 border border-slate-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-300">{resultados.resumen?.omitidos ?? 0}</p>
                <p className="text-xs text-slate-400">Omitidos</p>
              </div>
            </div>

            {(resultados.resumen?.pendientes ?? 0) > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
                <p className="text-sm text-sky-200">
                  Hay {resultados.resumen.pendientes} fila(s) pendiente(s) por el límite de la Registraduría.
                  Puedes volver a intentarlas cuando quieras.
                </p>
                <button
                  onClick={() => handleReintentar(resultados.jobId || jobIdActual)}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  🔁 Reintentar pendientes
                </button>
              </div>
            )}

            {/* Tabla detalle */}
            <div className="overflow-x-auto max-h-72 overflow-y-auto border border-slate-700 rounded-lg">
              <table className="min-w-full text-sm bg-[#1E293B] text-white">
                <thead className="bg-slate-700 text-xs uppercase text-slate-300 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Cédula</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.resultados.map((r, i) => (
                    <tr key={i} className="border-t border-slate-700/50">
                      <td className="px-3 py-1.5">{r.cedula}</td>
                      <td className="px-3 py-1.5">{r.nombreCompleto || "-"}</td>
                      <td className="px-3 py-1.5">
                        {r.estado === "exitoso" && <span className="text-green-400 font-medium">✅ Exitoso</span>}
                        {r.estado === "duplicado" && <span className="text-amber-400 font-medium">❌ Duplicado</span>}
                        {r.estado === "inhabilitado" && <span className="text-red-400 font-medium">⛔ Inhabilitado</span>}
                        {r.estado === "error" && <span className="text-rose-400 font-medium">⚠️ Error</span>}
                        {r.estado === "omitido" && <span className="text-slate-500">— Omitido</span>}
                        {r.estado === "pendiente" && <span className="text-sky-300 font-medium">⏳ Pendiente</span>}
                        {r.estado === "pendiente_reintento" && <span className="text-sky-300 font-medium">⏳ Pendiente por reintentar</span>}
                        {r.estado === "procesando" && <span className="text-indigo-300 font-medium">🔄 Procesando</span>}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400 text-xs">{r.mensaje || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Buscador en vivo y borrado de los registros filtrados ─── */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="block text-xs text-gray-300 mb-1">Buscar por cédula o nombre</label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            className="w-full md:w-80 bg-[#1E293B] text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {consultasFiltradas.length > 0 && (
          <button
            type="button"
            onClick={handleDeleteFiltrados}
            disabled={borrandoFiltrados}
            title="Elimina solo los registros que coinciden con la búsqueda actual"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {borrandoFiltrados
              ? "Eliminando..."
              : `🗑️ Borrar todos los votantes (${consultasFiltradas.length})`}
          </button>
        )}
      </div>

      {/* ─── Tabla de consultas existentes ─── */}
      <div className="overflow-x-auto mt-3">
        <table className="min-w-full bg-[#1E293B] text-white border border-gray-700 rounded-md overflow-hidden">
          <thead className="bg-indigo-600 text-xs font-semibold uppercase text-white">
            <tr>
              <th className="px-4 py-2 border border-gray-700">Cédula</th>
              <th className="px-4 py-2 border border-gray-700">Nombre</th>
              <th className="px-4 py-2 border border-gray-700">Teléfono</th>
              <th className="px-4 py-2 border border-gray-700">Departamento</th>
              <th className="px-4 py-2 border border-gray-700">Municipio</th>
              <th className="px-4 py-2 border border-gray-700">Puesto</th>
              <th className="px-4 py-2 border border-gray-700">Dirección</th>
              <th className="px-4 py-2 border border-gray-700">Mesa</th>
              <th className="px-4 py-2 border border-gray-700"></th>
            </tr>
          </thead>
          <tbody>
            {consultasPagina.map((item, index) => (
              <tr key={index} className="text-sm text-white hover:bg-[#334155] transition">
                <td className="px-4 py-2 border border-gray-700">{item.cedula}</td>
                <td className="px-4 py-2 border border-gray-700">{item.nombreCompleto || "-"}</td>
                <td className="px-4 py-2 border border-gray-700 text-center">{item.telefono || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.departamento || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.municipio || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.puesto || "-"}</td>
                <td className="px-4 py-2 border border-gray-700">{item.direccion || "-"}</td>
                <td className="px-4 py-2 border border-gray-700 text-center">{item.mesa || "-"}</td>
                <td className="px-4 py-2 border border-gray-700 text-center">
                  <button onClick={() => handleDelete(item.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {consultasPagina.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center py-4 text-gray-400">
                  {busqueda.trim() !== "" ? "No hay resultados para la búsqueda." : "No hay consultas registradas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Paginación ─── */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-slate-400">
            Mostrando {inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, consultasFiltradas.length)} de {consultasFiltradas.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>
            <span className="text-slate-300">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ─── Exportación debajo de la tabla ─── */}
      <div className="flex justify-end mt-4">
        <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm transition">
          ⬇ Descargar Excel
        </button>
      </div>
    </div>
  );
}
