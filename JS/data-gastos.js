// =================================================
// DATA-GASTOS.JS
// Fuente única de datos del módulo "Registro de Gastos Operativos"
// (prototipo sin backend). La usan: registro-gastos-operativos.js y
// detalle-gastos.js.
// =================================================

// Encabezado no editable de cada Detalle (Razón social / RUC): se reutiliza
// el mismo dato de la empresa que usa Precintos.
const EMPRESA_GASTOS = EMPRESA_PRECINTOS;

// Grilla principal de "Registro de Gastos Operativos": un renglón por reporte
// generado por un colaborador (vía app móvil, fuera de esta fase). No hay
// aprobación/estado: el colaborador registra desde el móvil y el supervisor
// puede modificarlo en cualquier momento (ver "Editar" en la grilla) — no
// hace falta que nadie lo "revise" ni "confirme" para que quede válido.
// Cada operador tiene sus 3 reportes por período (Alimentos/Movilidad/Días a
// Bordo). Los 3 usuarios (e.allccaco, r.bravo, j.gomez) existen en
// USUARIOS_DEMO para que la firma/nombre se resuelva bien en los 3 detalles.
// "periodoCodigo" identifica de forma única a un operador+período (mismo
// código compartido por sus 3 tipos) — reemplaza la clave armada por
// concatenación (nombre+apellido+fechas) que se usaba antes para agrupar,
// que era un buen approximation pero no un identificador real. Se genera
// con generarCodigoPeriodoGasto() al crear el período (ver asegurarReporteGasto).
// Períodos 10→09 (Sprint 4 §1.1): e.allccaco/j.gomez caen en el período de
// agosto-septiembre 2026 (sus usos de precintos reales están ahí, ver
// data-precintos.js); r.bravo en julio-agosto 2026.
const GASTOS_OPERATIVOS_SEED = [
  { id: 1, periodoCodigo: 'PG26000001', nombre: 'Edward', apellido: 'Allccaco', area: 'Operaciones', fechaDesde: '10/08/2026', fechaHasta: '09/09/2026', tipo: 'Alimentos' },
  { id: 2, periodoCodigo: 'PG26000001', nombre: 'Edward', apellido: 'Allccaco', area: 'Operaciones', fechaDesde: '10/08/2026', fechaHasta: '09/09/2026', tipo: 'Movilidad' },
  { id: 5, periodoCodigo: 'PG26000001', nombre: 'Edward', apellido: 'Allccaco', area: 'Operaciones', fechaDesde: '10/08/2026', fechaHasta: '09/09/2026', tipo: 'Días a Bordo' },
  { id: 6, periodoCodigo: 'PG26000002', nombre: 'Julio César', apellido: 'Gómez', area: 'Operaciones', fechaDesde: '10/08/2026', fechaHasta: '09/09/2026', tipo: 'Alimentos' },
  { id: 7, periodoCodigo: 'PG26000002', nombre: 'Julio César', apellido: 'Gómez', area: 'Operaciones', fechaDesde: '10/08/2026', fechaHasta: '09/09/2026', tipo: 'Movilidad' },
  { id: 3, periodoCodigo: 'PG26000002', nombre: 'Julio César', apellido: 'Gómez', area: 'Operaciones', fechaDesde: '10/08/2026', fechaHasta: '09/09/2026', tipo: 'Días a Bordo' },
  { id: 4, periodoCodigo: 'PG26000003', nombre: 'Rudy', apellido: 'Bravo Flores', area: 'Operaciones', fechaDesde: '10/07/2026', fechaHasta: '09/08/2026', tipo: 'Alimentos' },
  { id: 8, periodoCodigo: 'PG26000003', nombre: 'Rudy', apellido: 'Bravo Flores', area: 'Operaciones', fechaDesde: '10/07/2026', fechaHasta: '09/08/2026', tipo: 'Movilidad' },
  { id: 9, periodoCodigo: 'PG26000003', nombre: 'Rudy', apellido: 'Bravo Flores', area: 'Operaciones', fechaDesde: '10/07/2026', fechaHasta: '09/08/2026', tipo: 'Días a Bordo' }
];
// Persistido (Sprint 4 Fase 2, §6): un gasto registrado desde el móvil debe
// verse en la web sin recargar nada a mano — antes estas 5 estructuras eran
// un simple array/objeto en memoria, se perdían al navegar entre páginas
// (cada una con su propio contexto de JS) y nunca llegaban de un lado al
// otro. Mismo mecanismo que ya usa Precintos (tgCargarCatalogo/tgGuardarCatalogo).
const GASTOS_OPERATIVOS_DEMO = tgCargarCatalogo('gastosOperativosData', GASTOS_OPERATIVOS_SEED);

// Datos comunes de encabezado por colaborador (Nombre y apellidos, Cargo,
// Doc. Identidad, Área) — ingresados por el colaborador desde la app móvil
// (ver asegurarEncabezadoColaboradorGastos). Se repite entre los 3 ids del
// mismo operador (el modelo guarda esto por reporte, no por persona). No
// incluye Centro de costo: ese dato no se registra en ningún lado del
// sistema todavía.
const COLABORADOR_GASTOS_SEED = {
  1: { cargo: 'Inspector de Operaciones', docIdentidad: '45120384' },
  2: { cargo: 'Inspector de Operaciones', docIdentidad: '45120384' },
  5: { cargo: 'Inspector de Operaciones', docIdentidad: '45120384' },
  3: { cargo: 'Supervisor de Operaciones', docIdentidad: '41985023' },
  6: { cargo: 'Supervisor de Operaciones', docIdentidad: '41985023' },
  7: { cargo: 'Supervisor de Operaciones', docIdentidad: '41985023' },
  4: { cargo: 'Inspector de Operaciones', docIdentidad: '46220157' },
  8: { cargo: 'Inspector de Operaciones', docIdentidad: '46220157' },
  9: { cargo: 'Inspector de Operaciones', docIdentidad: '46220157' }
};
const COLABORADOR_GASTOS_DEMO = tgCargarCatalogo('colaboradorGastosData', COLABORADOR_GASTOS_SEED);

const BASE_LEGAL_GASTOS = 'De acuerdo con el D.S. N.° 007-2002-TR y su reglamento, y a la política interna de viáticos y movilidad de Intertek Testing Services Peru S.A.';

// Detalle "Editar y Revisar Registro de Alimentos" (id enlaza con
// GASTOS_OPERATIVOS_DEMO.id, tipo 'Alimentos'). Una fila por comida
// (Desayuno/Almuerzo/Cena) — así queda tal cual lo carga el operario desde
// el app (ver mockup "Reporte de Alimentos": Cliente/Operación-PER se llenan
// una vez por día, pero Lugar/Hora/Costo/Evidencia son por comida). "evidencia"
// es la lista de fotos adjuntadas (sin backend real, solo un nombre/label
// por foto); "sinSustento" es el checkbox "Gasto sin sustento" del app —
// cuando está marcado no se espera evidencia para esa comida.
//
// "fechaEmision" es la fecha en que se creó la plantilla automática del
// reporte (mismo criterio que asegurarReporteGasto, que la fija en "hoy" al
// crearla) — acá, al ser datos de ejemplo ya creados, se usa el primer día
// del período (fechaInicio) como equivalente razonable.
const DETALLE_ALIMENTOS_SEED = {
  1: {
    numero: 'RA26000031', fechaEmision: '10/08/2026', montoMaximo: 45.00,
    fechaInicio: '10/08/2026', fechaFin: '09/09/2026',
    grilla: [
      { fecha: '16/08/2026', comida: 'Desayuno', lugar: 'Supe', cliente: 'Naviera del Sur', operacionPer: 'PER/09461-25', hora: '07:30 am', costo: 8.00, evidencia: ['Evidencia 1'], sinSustento: false },
      { fecha: '16/08/2026', comida: 'Almuerzo', lugar: 'Supe', cliente: 'Naviera del Sur', operacionPer: 'PER/09461-25', hora: '13:00 pm', costo: 18.00, evidencia: ['Evidencia 1', 'Evidencia 2'], sinSustento: false },
      { fecha: '17/08/2026', comida: 'Desayuno', lugar: 'Supe', cliente: 'Naviera del Sur', operacionPer: 'PER/09461-25', hora: '07:15 am', costo: 8.00, evidencia: [], sinSustento: true },
      { fecha: '17/08/2026', comida: 'Almuerzo', lugar: 'Supe', cliente: 'Naviera del Sur', operacionPer: 'PER/09461-25', hora: '13:10 pm', costo: 20.00, evidencia: ['Evidencia 1'], sinSustento: false },
      // Ejemplo de "Agregado posterior" (§6, web): se cargó días después,
      // dentro del plazo de corrección, con justificación obligatoria.
      { fecha: '18/08/2026', comida: 'Cena', lugar: 'Supe', cliente: 'Naviera del Sur', operacionPer: 'PER/09461-25', hora: '20:30 pm', costo: 15.00, evidencia: [], sinSustento: true,
        agregadoPosterior: true, justificacion: 'Se me olvidó registrar la cena el mismo día; la agrego apenas lo noté.', agregadoEn: '20/08/2026T09:15:00.000Z' }
    ],
    firmaTrabajador: 'e.allccaco'
  },
  6: {
    numero: 'RA26000032', fechaEmision: '10/08/2026', montoMaximo: 45.00,
    fechaInicio: '10/08/2026', fechaFin: '09/09/2026',
    grilla: [
      { fecha: '10/08/2026', comida: 'Desayuno', lugar: 'Pisco', cliente: 'Naviera del Sur', operacionPer: 'PER/09461-25', hora: '07:00 am', costo: 8.00, evidencia: ['Evidencia 1'], sinSustento: false },
      { fecha: '10/08/2026', comida: 'Cena', lugar: 'Pisco', cliente: 'Naviera del Sur', operacionPer: 'PER/09461-25', hora: '20:15 pm', costo: 15.00, evidencia: ['Evidencia 1'], sinSustento: false },
      { fecha: '12/08/2026', comida: 'Almuerzo', lugar: 'Pisco', cliente: 'Naviera del Sur', operacionPer: 'PER/09461-25', hora: '13:05 pm', costo: 18.00, evidencia: [], sinSustento: true,
        agregadoPosterior: true, justificacion: 'No tenía acceso a la app durante la operación; registro el almuerzo apenas recupero señal.', agregadoEn: '14/08/2026T18:40:00.000Z' }
    ],
    firmaTrabajador: 'j.gomez'
  },
  4: {
    numero: 'RA26000033', fechaEmision: '10/07/2026', montoMaximo: 45.00,
    fechaInicio: '10/07/2026', fechaFin: '09/08/2026',
    grilla: [
      { fecha: '21/07/2026', comida: 'Almuerzo', lugar: 'Callao', cliente: 'Consorcio Terminales', operacionPer: 'PER/09463-25', hora: '12:30 pm', costo: 22.00, evidencia: ['Evidencia 1'], sinSustento: false },
      { fecha: '22/07/2026', comida: 'Almuerzo', lugar: 'Callao', cliente: 'Consorcio Terminales', operacionPer: 'PER/09463-25', hora: '12:40 pm', costo: 22.00, evidencia: ['Evidencia 1'], sinSustento: false }
    ],
    firmaTrabajador: 'r.bravo'
  }
};
const DETALLE_ALIMENTOS_DEMO = tgCargarCatalogo('detalleAlimentosData', DETALLE_ALIMENTOS_SEED);

// Detalle "Editar y Revisar Registro de Movilidad" — una fila por traslado
// ("Movilidad 1", "Movilidad 2"... del app), con la misma evidencia/"sin
// sustento" que Alimentos.
const DETALLE_MOVILIDAD_SEED = {
  2: {
    numero: 'RM26000018', fechaEmision: '10/08/2026', montoMaximo: 60.00,
    fechaInicio: '10/08/2026', fechaFin: '09/09/2026',
    grilla: [
      { fecha: '16/08/2026', empresa: 'Taxi Seguro Supe', distritoPartida: 'Supe Puerto', distritoDestino: 'Supe', motivo: 'Traslado a muelle', importeDia: 15.00, totalDia: 15.00, evidencia: ['Evidencia 1'], sinSustento: false },
      { fecha: '18/08/2026', empresa: 'Taxi Seguro Supe', distritoPartida: 'Supe', distritoDestino: 'Supe Puerto', motivo: 'Traslado a operación', importeDia: 15.00, totalDia: 15.00, evidencia: [], sinSustento: true }
    ],
    firmaTrabajador: 'e.allccaco'
  },
  7: {
    numero: 'RM26000019', fechaEmision: '10/08/2026', montoMaximo: 60.00,
    fechaInicio: '10/08/2026', fechaFin: '09/09/2026',
    grilla: [
      { fecha: '11/08/2026', empresa: 'Taxi Seguro Pisco', distritoPartida: 'Pisco', distritoDestino: 'Terminal Portuario', motivo: 'Traslado a operación', importeDia: 14.00, totalDia: 14.00, evidencia: ['Evidencia 1'], sinSustento: false }
    ],
    firmaTrabajador: 'j.gomez'
  },
  8: {
    numero: 'RM26000020', fechaEmision: '10/07/2026', montoMaximo: 60.00,
    fechaInicio: '10/07/2026', fechaFin: '09/08/2026',
    grilla: [
      { fecha: '21/07/2026', empresa: 'Transportes Callao', distritoPartida: 'Callao', distritoDestino: 'Terminal Portuario', motivo: 'Traslado a muelle', importeDia: 18.00, totalDia: 18.00, evidencia: ['Evidencia 1'], sinSustento: false },
      { fecha: '23/07/2026', empresa: 'Transportes Callao', distritoPartida: 'Terminal Portuario', distritoDestino: 'Callao', motivo: 'Retorno de operación', importeDia: 18.00, totalDia: 18.00, evidencia: [], sinSustento: true,
        agregadoPosterior: true, justificacion: 'El traslado de retorno se pagó en efectivo y se olvidó registrar el mismo día.', agregadoEn: '25/07/2026T10:05:00.000Z' }
    ],
    firmaTrabajador: 'r.bravo'
  }
};
const DETALLE_MOVILIDAD_DEMO = tgCargarCatalogo('detalleMovilidadData', DETALLE_MOVILIDAD_SEED);

// Detalle "Ver Registro de Días a Bordo" (sin evidencia ni Monto Máximo: ya
// no se registra a mano — Sprint 4 §1.2, "grilla" se regenera sola a partir
// de las operaciones reales del operador y la configuración vigente, ver
// regenerarDiasABordo más arriba). "overrides" guarda los ajustes/exclusiones
// puntuales del supervisor por fecha (dd/mm/yyyy) — sobreviven a la
// regeneración; "grilla" arranca vacía y se llena la primera vez que se abre
// o descarga el reporte.
const DETALLE_DIAS_A_BORDO_SEED = {
  5: { numero: 'RD26000010', fechaEmision: '10/08/2026', fechaInicio: '10/08/2026', fechaFin: '09/09/2026', grilla: [], overrides: {}, firmaTrabajador: 'e.allccaco' },
  3: { numero: 'RD26000009', fechaEmision: '10/08/2026', fechaInicio: '10/08/2026', fechaFin: '09/09/2026', grilla: [], overrides: {}, firmaTrabajador: 'j.gomez' },
  9: { numero: 'RD26000011', fechaEmision: '10/07/2026', fechaInicio: '10/07/2026', fechaFin: '09/08/2026', grilla: [], overrides: {}, firmaTrabajador: 'r.bravo' }
};
const DETALLE_DIAS_A_BORDO_DEMO = tgCargarCatalogo('detalleDiasABordoData', DETALLE_DIAS_A_BORDO_SEED);

function obtenerGastoPorId(id) {
  return GASTOS_OPERATIVOS_DEMO.find(g => g.id === Number(id));
}

// Persiste las 5 estructuras del módulo (mismo mecanismo que
// guardarEstadoPrecintos) — se llama explícitamente al final de cada acción
// que crea/edita algo (asegurarReporteGasto, registrar un gasto desde el
// móvil, editar un monto desde la web) y además una vez más al salir de la
// página como red de seguridad.
function guardarEstadoGastos() {
  tgGuardarCatalogo('gastosOperativosData', GASTOS_OPERATIVOS_DEMO);
  tgGuardarCatalogo('colaboradorGastosData', COLABORADOR_GASTOS_DEMO);
  tgGuardarCatalogo('detalleAlimentosData', DETALLE_ALIMENTOS_DEMO);
  tgGuardarCatalogo('detalleMovilidadData', DETALLE_MOVILIDAD_DEMO);
  tgGuardarCatalogo('detalleDiasABordoData', DETALLE_DIAS_A_BORDO_DEMO);
  tgGuardarCatalogo('codigosReporteJornadaData', CODIGOS_REPORTE_JORNADA_DEMO);
}
window.addEventListener('beforeunload', guardarEstadoGastos);

// Próximo código correlativo de un reporte de gasto por tipo (ej. RA26000032,
// RM26000019, RD26000010) — mismo formato que ya usan los demo de arriba.
function generarCodigoReporteGasto(tipo) {
  const prefijo = tipo === 'Alimentos' ? 'RA' : tipo === 'Movilidad' ? 'RM' : 'RD';
  const anio = String(new Date().getFullYear()).slice(-2);
  const fuente = tipo === 'Alimentos' ? DETALLE_ALIMENTOS_DEMO : tipo === 'Movilidad' ? DETALLE_MOVILIDAD_DEMO : DETALLE_DIAS_A_BORDO_DEMO;
  const nums = Object.values(fuente)
    .map(d => {
      const match = String(d.numero).match(new RegExp(`^${prefijo}\\d{2}(\\d{6})$`));
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter(n => !isNaN(n));
  const siguiente = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefijo}${anio}${String(siguiente).padStart(6, '0')}`;
}

// =================================================
// CÓDIGO ÚNICO POR JORNADA (PROMPT_GASTOS_PANTALLAS_JORNADA_SPRINT4 §1): cada
// reporte de Alimentos/Movilidad/Días a Bordo pertenece a UNA jornada, no a
// una Operación/PER sueltos. El código (RA/RM/RD-AAAA-#####, mismo formato
// que generarCodigoReporteGasto) se asigna la PRIMERA vez que se guarda algo
// ese día+tipo (Días a Bordo: la primera vez que ese día califica al
// regenerar) y ya no cambia al editar/descargar — independiente del
// "numero" de período que ya tenía el reporte mensual (ese no se toca, lo
// sigue usando el Excel/PDF oficial).
// =================================================
const CODIGOS_REPORTE_JORNADA_DEMO = tgCargarCatalogo('codigosReporteJornadaData', {});
function guardarCodigosReporteJornada() { tgGuardarCatalogo('codigosReporteJornadaData', CODIGOS_REPORTE_JORNADA_DEMO); }

function generarCodigoReporteJornada(tipo) {
  const prefijo = tipo === 'Alimentos' ? 'RA' : tipo === 'Movilidad' ? 'RM' : 'RD';
  const anio = String(new Date().getFullYear()).slice(-2);
  const nums = Object.values(CODIGOS_REPORTE_JORNADA_DEMO)
    .map(c => {
      const match = String(c.codigo).match(new RegExp(`^${prefijo}\\d{2}(\\d{6})$`));
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter(n => !isNaN(n));
  const siguiente = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefijo}${anio}${String(siguiente).padStart(6, '0')}`;
}

// Devuelve (creando si hace falta) el código único de jornadaId+tipo.
function obtenerOCrearCodigoReporteJornada(tipo, jornadaId) {
  const clave = `${tipo}|${jornadaId}`;
  if (!CODIGOS_REPORTE_JORNADA_DEMO[clave]) {
    CODIGOS_REPORTE_JORNADA_DEMO[clave] = { codigo: generarCodigoReporteJornada(tipo), registradoEn: new Date().toISOString() };
    guardarCodigosReporteJornada();
  }
  return CODIGOS_REPORTE_JORNADA_DEMO[clave];
}

// Solo lectura: el código YA asignado (o null si ese día+tipo todavía no
// guardó nada) — para mostrar "Sin registrar" sin crear un código de más.
function obtenerCodigoReporteJornada(tipo, jornadaId) {
  return CODIGOS_REPORTE_JORNADA_DEMO[`${tipo}|${jornadaId}`] || null;
}

// Campos informativos (solo lectura) de la jornada de una fecha para un
// operador+tipo — Jornada (inicio/fin/duración), Operaciones involucradas y
// el código ya asignado (si existe). Lo usan tanto los modales de registro
// como "Gastos" (home), "Reportes" y la web (mismo cálculo en los 3 lados).
function infoJornadaGasto(usuario, fechaISODia, tipo) {
  const jornada = (typeof obtenerJornadaPorFecha === 'function') ? obtenerJornadaPorFecha(usuario, fechaISODia) : null;
  // Corrección: "operaciones" ya no depende de si hubo Uso de precinto ese
  // día — un operador SIEMPRE tiene su(s) operación(es) asignada(s) (ver
  // obtenerOperacionesAsignadasOperador). Si hubo o no precintos usados esa
  // fecha puntual se informa aparte (precintosUsados/huboPrecintos).
  const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(usuario) : [];
  const precintos = (typeof obtenerPrecintosDeJornada === 'function') ? obtenerPrecintosDeJornada(usuario, fechaISODia) : [];
  const jornadaId = jornada ? jornada.id : null;
  const codigoInfo = (tipo && jornadaId) ? obtenerCodigoReporteJornada(tipo, jornadaId) : null;
  return {
    jornada, jornadaId, operaciones,
    precintosUsados: precintos.length,
    huboPrecintos: precintos.length > 0,
    fechaInicio: jornada && jornada.inicio ? jornada.inicio.fecha : null,
    horaInicio: jornada && jornada.inicio ? jornada.inicio.hora : '—',
    fechaFin: jornada && jornada.fin ? jornada.fin.fecha : null,
    horaFin: jornada && jornada.fin ? jornada.fin.hora : '—',
    duracionHoras: jornada ? calcularHorasJornada(jornada.inicio, jornada.fin) : 0,
    codigo: codigoInfo ? codigoInfo.codigo : null
  };
}

// Próximo código correlativo de un período de gastos (ej. PG26000004) —
// identifica de forma única a un operador+mes; lo comparten los 3 reportes
// de ese período (ver asegurarReporteGasto).
function generarCodigoPeriodoGasto() {
  const anio = String(new Date().getFullYear()).slice(-2);
  const nums = GASTOS_OPERATIVOS_DEMO
    .map(g => {
      const match = String(g.periodoCodigo).match(/^PG\d{2}(\d{6})$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter(n => !isNaN(n));
  const siguiente = (nums.length ? Math.max(...nums) : 0) + 1;
  return `PG${anio}${String(siguiente).padStart(6, '0')}`;
}

// Período de Gastos = del 10 de un mes al 09 del mes siguiente (Sprint 4,
// §1.1) — ya no mes calendario. El día 10 ABRE el período siguiente (una
// fecha de referencia con día < 10 todavía cae en el período que abrió el
// 10 del mes anterior). Alimentos, Movilidad y Días a Bordo usan esta misma
// regla (ver asegurarReporteGasto) para compartir periodoCodigo.
function primerYUltimoDiaDelMes(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const pad = n => String(n).padStart(2, '0');

  let anioInicio = anio, mesInicio = mes;
  if (dia < 10) {
    mesInicio -= 1;
    if (mesInicio === 0) { mesInicio = 12; anioInicio -= 1; }
  }
  let mesFin = mesInicio + 1, anioFin = anioInicio;
  if (mesFin === 13) { mesFin = 1; anioFin += 1; }

  return {
    primero: `10/${pad(mesInicio)}/${anioInicio}`,
    ultimo: `09/${pad(mesFin)}/${anioFin}`
  };
}

// Se dispara la primera vez que un operador queda asignado a una operación
// (ver guardarAsignacionPrecintos en control-precintos.js: se llama junto
// con asegurarReportePrecinto, mismo momento en que el operador "empieza a
// registrar los precintos y gastos que realizó"). Crea sus 3 reportes
// (Alimentos/Movilidad/Días a Bordo) vacíos para el mes calendario de
// "fechaReferenciaISO" (normalmente hoy), listos para que el app vaya
// cargando lo que el operador reporte. Si el operador ya tiene reportes
// abiertos para ese mismo mes, no hace nada (evita duplicar si aparece en
// más de una Asignación dentro del mismo mes).
// Cargo/Doc. Identidad desde el perfil del colaborador (Fase 2 móvil, §2) —
// Doc. Identidad reutiliza el DNI que ya carga Precintos en el móvil
// (PERFIL_MOVIL_EXTRA_DEMO, data-movil.js, si esa página lo tiene cargado);
// Cargo se infiere del rol del usuario. Solo rellena los ids que todavía no
// tengan datos — nunca pisa lo que ya exista.
function asegurarEncabezadoColaboradorGastos(ids, operadorUsuario) {
  const u = obtenerUsuarioPorNombre(operadorUsuario);
  const rol = u ? obtenerRolPorId(u.rolId) : null;
  const dni = (typeof PERFIL_MOVIL_EXTRA_DEMO !== 'undefined' && PERFIL_MOVIL_EXTRA_DEMO[operadorUsuario]) ? PERFIL_MOVIL_EXTRA_DEMO[operadorUsuario].dni : '';
  ids.forEach(id => {
    if (!COLABORADOR_GASTOS_DEMO[id]) {
      COLABORADOR_GASTOS_DEMO[id] = { cargo: rol ? rol.nombre : '', docIdentidad: dni || '' };
    }
  });
}

// Devuelve (creando si hace falta) los 3 reportes del período 10→09 de
// "fechaReferenciaISO" para este operador — { periodoCodigo, ids: {tipo:id},
// fechaDesde, fechaHasta }. Idéntico resultado si ya existían (no duplica):
// el móvil lo llama cada vez que abre Gastos para resolver "en qué id
// guardar" sin tener que recordar nada entre sesiones.
function asegurarReporteGasto(operadorUsuario, fechaReferenciaISO) {
  const { primero: fechaDesde, ultimo: fechaHasta } = primerYUltimoDiaDelMes(fechaReferenciaISO);

  // Identifica al dueño por firmaTrabajador del Detalle (igual criterio que
  // agruparGastosPorOperador/prepararDescargaGastos), no por g.operador —
  // los 3 operadores de ejemplo del seed nunca tuvieron ese campo poblado.
  const existentes = GASTOS_OPERATIVOS_DEMO.filter(g => {
    if (g.fechaDesde !== fechaDesde || g.fechaHasta !== fechaHasta) return false;
    const detalle = obtenerDetalleGastoPorTipo(g.tipo, g.id);
    return detalle && detalle.firmaTrabajador === operadorUsuario;
  });
  if (existentes.length === 3) {
    const ids = {};
    existentes.forEach(g => { ids[g.tipo] = g.id; });
    asegurarEncabezadoColaboradorGastos(Object.values(ids), operadorUsuario);
    return { periodoCodigo: existentes[0].periodoCodigo, ids, fechaDesde, fechaHasta };
  }

  const u = obtenerUsuarioPorNombre(operadorUsuario);
  const nombre = u ? u.nombre : operadorUsuario;
  const apellido = u ? u.apellido : '';
  const hoy = fechaISOaDDMMYYYY(new Date().toISOString().slice(0, 10));

  // Días a Bordo ya no tiene Monto Máximo (§1.1: no aplica, se quitó de la
  // UI) ni montoMaximoPorTipo para ese tipo.
  const montoMaximoPorTipo = {
    'Alimentos': LIMITES_GASTOS_DEMO.alimentos.montoMaximoDia,
    'Movilidad': LIMITES_GASTOS_DEMO.movilidad.montoMaximoDia
  };

  // Un único código de período para los 3 (no uno por tipo: identifica al
  // operador+mes como conjunto, ver generarCodigoPeriodoGasto).
  const periodoCodigo = generarCodigoPeriodoGasto();
  const ids = {};

  ['Alimentos', 'Movilidad', 'Días a Bordo'].forEach(tipo => {
    const nuevoId = (Math.max(0, ...GASTOS_OPERATIVOS_DEMO.map(g => g.id)) || 0) + 1;
    GASTOS_OPERATIVOS_DEMO.unshift({
      id: nuevoId, periodoCodigo, operador: operadorUsuario, nombre, apellido, area: 'Operaciones',
      fechaDesde, fechaHasta, tipo
    });

    const fuente = tipo === 'Alimentos' ? DETALLE_ALIMENTOS_DEMO : tipo === 'Movilidad' ? DETALLE_MOVILIDAD_DEMO : DETALLE_DIAS_A_BORDO_DEMO;
    fuente[nuevoId] = {
      numero: generarCodigoReporteGasto(tipo), fechaEmision: hoy, montoMaximo: montoMaximoPorTipo[tipo],
      fechaInicio: fechaDesde, fechaFin: fechaHasta,
      grilla: [],
      firmaTrabajador: operadorUsuario,
      ...(tipo === 'Días a Bordo' ? { overrides: {} } : {})
    };
    ids[tipo] = nuevoId;
  });

  asegurarEncabezadoColaboradorGastos(Object.values(ids), operadorUsuario);
  guardarEstadoGastos();
  return { periodoCodigo, ids, fechaDesde, fechaHasta };
}

// =================================================
// PERÍODOS (Control de Precintos > Configuración > Configuración de
// Períodos) — entidad propia, independiente de periodoCodigo (que es
// por operador+mes, generado solo al registrarse un gasto). Un Período acá
// es algo que el supervisor define a mano (nombre + rango), para agrupar
// el trabajo del móvil ("Generación de Reporte") — ver gastos-movil.js.
// Estado se deriva, no se guarda: "Registrado" (ya se descargó al menos un
// reporte cuyo rango cae dentro de este período, ver ULTIMA_DESCARGA_GASTOS
// en descarga-gastos.js) le gana a "Abierto"/"Cerrado" (según si la fecha
// fin ya pasó).
// =================================================
const PERIODOS_GASTOS_SEED = [];
const PERIODOS_GASTOS_DEMO = tgCargarCatalogo('periodosGastosData', PERIODOS_GASTOS_SEED);
function guardarPeriodosGastos() { tgGuardarCatalogo('periodosGastosData', PERIODOS_GASTOS_DEMO); }

const MESES_CAP_PERIODO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Devuelve el nombre del Período para un fechaDesde/fechaHasta dado,
// creándolo (autogenerado, "Período <Mes> <Año>") si todavía no existe en
// Configuración de Períodos — usada tanto por la sincronización en bloque de
// abajo como por el móvil al abrir Gastos (ver inicializarGastosMovil en
// gastos-movil.js), para que el período de HOY quede nombrado ahí mismo
// aunque sea el primero de ese mes y la sincronización en bloque todavía no
// lo haya visto (esta corre una sola vez al cargar el script).
function asegurarPeriodoGastoNombrado(fechaDesde, fechaHasta) {
  const existente = PERIODOS_GASTOS_DEMO.find(p => p.fechaInicio === fechaDesde && p.fechaFin === fechaHasta);
  if (existente) return existente.nombre;
  const mes = MESES_CAP_PERIODO[parseInt(fechaDesde.split('/')[1], 10) - 1];
  const anio = fechaDesde.slice(-4);
  const nuevoId = (Math.max(0, ...PERIODOS_GASTOS_DEMO.map(p => p.id)) || 0) + 1;
  const nombre = `Período ${mes} ${anio}`;
  PERIODOS_GASTOS_DEMO.push({ id: nuevoId, nombre, fechaInicio: fechaDesde, fechaFin: fechaHasta });
  guardarPeriodosGastos();
  return nombre;
}

// Sincroniza los períodos "anteriores" como referencia (pedido explícito):
// cada rango fechaDesde/fechaHasta distinto que YA existe en
// GASTOS_OPERATIVOS_DEMO (generado solo por asegurarReporteGasto, al
// registrarse un gasto — nunca a mano) aparece acá aunque nadie lo haya
// creado todavía en Configuración de Períodos. Corre en cada carga
// (idempotente, solo agrega lo que falta) para que el período activo más
// reciente (ej. octubre) quede siempre al día sin esperar a que alguien lo
// cree a mano.
(function sincronizarPeriodosDesdeGastos() {
  if (typeof GASTOS_OPERATIVOS_DEMO === 'undefined') return;
  const vistos = new Set();
  GASTOS_OPERATIVOS_DEMO.forEach(g => {
    const clave = `${g.fechaDesde}|${g.fechaHasta}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    asegurarPeriodoGastoNombrado(g.fechaDesde, g.fechaHasta);
  });
})();

function estadoPeriodoGasto(periodo) {
  const hoyISODato = new Date().toISOString().slice(0, 10);
  const inicioISO = fechaDDMMYYYYaISO(periodo.fechaInicio);
  const finISO = fechaDDMMYYYYaISO(periodo.fechaFin);
  // "Cerrado" (ya pasó la fecha fin) manda siempre, aunque en su momento
  // se haya descargado algún reporte — "Registrado" es un aviso para un
  // período TODAVÍA vigente ("ya se bajó algo de acá, aunque no cerró"),
  // no una etiqueta que deba perseguir a un período viejo para siempre
  // (corrección pedida: agosto/septiembre, ya cerrados, se veían como
  // "Registrado" por una descarga vieja y debían verse "Cerrado").
  if (finISO < hoyISODato) return 'Cerrado';
  const hayDescarga = typeof ULTIMA_DESCARGA_GASTOS === 'object' && Object.values(ULTIMA_DESCARGA_GASTOS)
    .some(d => d.desde && d.hasta && d.desde <= finISO && d.hasta >= inicioISO);
  return hayDescarga ? 'Registrado' : 'Abierto';
}

// Compartidas entre toda pantalla que filtre por Período (Gastos Operativos,
// Control de Precintos) en vez de un rango de fechas suelto — un solo lugar
// para no repetir ni desalinear el criterio de orden (más reciente primero,
// mismo que usa renderTablaPeriodosGastos) ni la conversión a ISO.
function poblarSelectPeriodos(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const ordenado = PERIODOS_GASTOS_DEMO.slice().sort((a, b) => fechaDDMMYYYYaISO(b.fechaInicio).localeCompare(fechaDDMMYYYYaISO(a.fechaInicio)));
  select.innerHTML = '<option value="">Todos</option>' + ordenado.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

function rangoDePeriodoSeleccionado(selectId) {
  const el = document.getElementById(selectId);
  const id = el ? Number(el.value) : NaN;
  if (!id) return null;
  const p = PERIODOS_GASTOS_DEMO.find(x => x.id === id);
  if (!p) return null;
  return { desde: fechaDDMMYYYYaISO(p.fechaInicio), hasta: fechaDDMMYYYYaISO(p.fechaFin) };
}

function obtenerDetalleGastoPorTipo(tipo, id) {
  const fuente = tipo === 'Alimentos' ? DETALLE_ALIMENTOS_DEMO
    : tipo === 'Movilidad' ? DETALLE_MOVILIDAD_DEMO
    : tipo === 'Días a Bordo' ? DETALLE_DIAS_A_BORDO_DEMO
    : null;
  return fuente ? fuente[Number(id)] : null;
}

// =================================================
// CONFIGURACIÓN DE LÍMITES PARA GASTOS
// (Precintos > Registro de Gastos Operativos > Configuración)
// Sprint 4 §1.1: Días a Bordo deja de ser "rangos por día de semana" +
// "Días Especiales en soles" — pasa a 2 conceptos fijos (Día a bordo S/50,
// Domingo laborado S/90, igual en Lima o provincia) + "Feriados especiales"
// en dólares (tipo de cambio del día, ya resuelto por TIPOS_CAMBIO_FERIADOS_DEMO).
// Persistido (tgCargarCatalogo/tgGuardarCatalogo) para que una edición de
// tarifas sobreviva a un recargo de página y se vea igual en todas las
// pestañas — antes esta config vivía solo en memoria.
const LIMITES_GASTOS_SEED = {
  modificadoPor: 'j.ramos',
  fechaModificacion: '28/08/2026 16:40',
  alimentos: {
    desayuno: 12.00, montoAnteriorDesayuno: 10.00,
    almuerzo: 20.00, montoAnteriorAlmuerzo: 18.00,
    cena: 15.00, montoAnteriorCena: 13.00,
    montoMaximoDia: 45.00
  },
  movilidad: {
    montoMaximoDia: 30.00, montoAnteriorDia: 25.00,
    montoMaximoViaje: 15.00, montoAnteriorViaje: 12.00
  },
  diasABordo: {
    // "MONTOS ESTABLECIDOS" de la plantilla Resumen Total: Día a bordo S/50
    // cualquier día normal; Domingo laborado S/90 (Lima o provincia, mismo
    // monto — el Resumen Total solo las separa en columnas distintas).
    diaNormal: 50.00, montoAnteriorDiaNormal: 50.00,
    domingo: 90.00, montoAnteriorDomingo: 90.00,
    // "Feriado oficial laborado": un monto fijo en soles (no por fecha) que
    // se paga en CUALQUIERA de las fechas de feriadosOficiales de abajo —
    // van ANTES que los Feriados especiales en la prioridad de pago: un
    // feriado oficial le gana a un domingo (si cae domingo, se paga como
    // feriado), pero un Feriado especial (USD) le gana a un feriado oficial.
    feriadoOficial: 90.00, montoAnteriorFeriadoOficial: 90.00,
    // Calendario oficial peruano (PROMPT_GASTOS_CONFIG_SPRINT4 §2) —
    // precargado pero editable; "anio" solo se fija en los feriados móviles
    // (Jueves/Viernes Santo, cambian cada año) — null = se repite cada año.
    // Las 4 fechas que coinciden con feriadosEspeciales (1 ene, 1 may, 28
    // jul, 25 dic) quedan igual en esta lista de referencia: a la hora de
    // pagar, calcularMontoDiaABordo siempre prioriza el Especial sobre el
    // Oficial si coinciden — agregar una fecha nueva que ya sea Especial sí
    // se bloquea (ver agregarFeriadoOficial).
    feriadosOficiales: [
      { id: 1, dia: 1, mes: 1, descripcion: 'Año Nuevo', anio: null },
      { id: 2, dia: 2, mes: 4, descripcion: 'Jueves Santo', anio: 2026 },
      { id: 3, dia: 3, mes: 4, descripcion: 'Viernes Santo', anio: 2026 },
      { id: 4, dia: 1, mes: 5, descripcion: 'Día del Trabajo', anio: null },
      { id: 5, dia: 7, mes: 6, descripcion: 'Día de la Bandera', anio: null },
      { id: 6, dia: 29, mes: 6, descripcion: 'San Pedro y San Pablo', anio: null },
      { id: 7, dia: 23, mes: 7, descripcion: 'Día de la Fuerza Aérea del Perú', anio: null },
      { id: 8, dia: 28, mes: 7, descripcion: 'Fiestas Patrias', anio: null },
      { id: 9, dia: 29, mes: 7, descripcion: 'Fiestas Patrias', anio: null },
      { id: 10, dia: 6, mes: 8, descripcion: 'Batalla de Junín', anio: null },
      { id: 11, dia: 30, mes: 8, descripcion: 'Santa Rosa de Lima', anio: null },
      { id: 12, dia: 8, mes: 10, descripcion: 'Combate de Angamos', anio: null },
      { id: 13, dia: 31, mes: 10, descripcion: 'Día de la Canción Criolla', anio: null },
      { id: 14, dia: 1, mes: 11, descripcion: 'Todos los Santos', anio: null },
      { id: 15, dia: 8, mes: 12, descripcion: 'Inmaculada Concepción', anio: null },
      { id: 16, dia: 9, mes: 12, descripcion: 'Batalla de Ayacucho', anio: null },
      { id: 17, dia: 25, mes: 12, descripcion: 'Navidad', anio: null }
    ],
    // "Feriados especiales" (US$70, tipo de cambio del día): Año Nuevo, Día
    // del Trabajo, Fiestas Patrias y Navidad — acordados en la reunión.
    feriadosEspeciales: [
      { id: 1, dia: 1, mes: 1, montoUSD: 70.00 },
      { id: 2, dia: 1, mes: 5, montoUSD: 70.00 },
      { id: 3, dia: 28, mes: 7, montoUSD: 70.00 },
      { id: 4, dia: 25, mes: 12, montoUSD: 70.00 }
    ]
  }
};
const LIMITES_GASTOS_DEMO = tgCargarCatalogo('limitesGastosData', LIMITES_GASTOS_SEED);
// Migración: una config ya guardada de antes de "Feriados Oficiales" se
// completa sin pisar lo que el supervisor ya haya configurado (mismo patrón
// que CONFIG_JORNADA_DEMO en data-movil.js). Si existía el campo "feriados"
// de una versión anterior (simple, sin precargar), se migra tal cual a
// feriadosOficiales en vez de perderlo.
(function migrarFeriadosOficiales() {
  const cfg = LIMITES_GASTOS_DEMO.diasABordo;
  if (cfg.feriadoOficial === undefined) cfg.feriadoOficial = LIMITES_GASTOS_SEED.diasABordo.feriadoOficial;
  if (cfg.montoAnteriorFeriadoOficial === undefined) cfg.montoAnteriorFeriadoOficial = LIMITES_GASTOS_SEED.diasABordo.montoAnteriorFeriadoOficial;
  if (cfg.feriadosOficiales === undefined) {
    cfg.feriadosOficiales = Array.isArray(cfg.feriados) && cfg.feriados.length
      ? cfg.feriados.map(f => ({ id: f.id, dia: f.dia, mes: f.mes, descripcion: f.descripcion || '', anio: f.anio || null }))
      : LIMITES_GASTOS_SEED.diasABordo.feriadosOficiales;
  }
  delete cfg.feriados;
})();
function guardarLimitesGastos() { tgGuardarCatalogo('limitesGastosData', LIMITES_GASTOS_DEMO); }

// Roles habilitados para registrar el tipo de cambio de un Feriado Especial
// ("permiso especial" del pedido original) — mismo criterio que ya usa
// Asignación de Precintos para distinguir Supervisor/Inspector (ver
// obtenerRolPorNombre), no una tabla de permisos nueva.
const ROLES_TIPO_CAMBIO_FERIADO = ['Supervisor', 'Jefe de Área', 'Gerente de Laboratorio', 'Administrador'];

function usuarioPuedeRegistrarTipoCambio(usuario) {
  const u = obtenerUsuarioPorNombre(usuario);
  if (!u) return false;
  return obtenerIdsRolesUsuario(u).some(id => {
    const rol = obtenerRolPorId(id);
    return rol && ROLES_TIPO_CAMBIO_FERIADO.includes(rol.nombre);
  });
}

// Historial de tipos de cambio registrados para los Feriados Especiales —
// un renglón por cada ocurrencia real (con año) ya registrada, nunca de
// antemano: "solo se agrega una vez" y el mismo día que ocurre, con el tipo
// de cambio vigente ese día (ver registrarTipoCambioFeriadoEspecial).
const TIPOS_CAMBIO_FERIADOS_SEED = [
  { id: 1, fecha: '28/07/2026', tipoCambio: 3.75, montoUSD: 70.00, montoSoles: 262.50, agregadoPor: 'j.ramos' }
];
const TIPOS_CAMBIO_FERIADOS_DEMO = tgCargarCatalogo('tiposCambioFeriadosData', TIPOS_CAMBIO_FERIADOS_SEED);

function guardarTiposCambioFeriados() {
  tgGuardarCatalogo('tiposCambioFeriadosData', TIPOS_CAMBIO_FERIADOS_DEMO);
}

// ¿Hoy es un Feriado Especial configurado y todavía no tiene su tipo de
// cambio registrado? Si es así, genera (o mantiene) la alerta para que la
// persona con permiso lo registre; si ya se registró o dejó de ser feriado
// especial (se quitó de la config), retira la alerta. Se llama al cargar
// Registro de Gastos Operativos — mismo patrón que el resto del sistema usa
// para notificaciones grupales que se recalculan en cada carga (ver
// notifUpsertar en main.js).
function fechaHoyDDMMYYYY() {
  const hoy = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(hoy.getDate())}/${pad(hoy.getMonth() + 1)}/${hoy.getFullYear()}`;
}

function obtenerFeriadoEspecialDeHoy() {
  const hoy = new Date();
  const dia = hoy.getDate(), mes = hoy.getMonth() + 1;
  return LIMITES_GASTOS_DEMO.diasABordo.feriadosEspeciales.find(f => f.dia === dia && f.mes === mes) || null;
}

function obtenerTipoCambioDeHoy() {
  return TIPOS_CAMBIO_FERIADOS_DEMO.find(t => t.fecha === fechaHoyDDMMYYYY()) || null;
}

function actualizarAlertaFeriadoEspecial() {
  const esFeriadoEspecialHoy = obtenerFeriadoEspecialDeHoy();
  const yaRegistrado = obtenerTipoCambioDeHoy();

  if (esFeriadoEspecialHoy && !yaRegistrado) {
    notifUpsertar({
      id: 'feriado-especial-tipo-cambio',
      tipo: 'feriadoEspecial',
      prioridad: 'por_vencer',
      titulo: 'Hoy es un Feriado Especial',
      mensaje: 'Falta registrar el tipo de cambio de hoy en Registro de Gastos Operativos > Configuración.',
      url: 'registro-gastos-operativos.html'
    });
  } else {
    notifEliminar('feriado-especial-tipo-cambio');
  }
}

// Registra el tipo de cambio de HOY para el Feriado Especial de hoy — queda
// bloqueado de inmediato (no hay "editar" ni "quitar" para estos renglones,
// a diferencia de "Días Especiales"): es un registro histórico de lo que
// efectivamente rigió ese día, no un valor configurable que se pueda
// corregir después. El monto a pagar ese día está en dólares (montoUSD, ver
// feriadosEspeciales) — acá se calcula y se guarda también el equivalente en
// soles (montoUSD × tipoCambio) ya resuelto, para que quede fijo aunque el
// monto en dólares configurado cambie más adelante.
function registrarTipoCambioFeriadoEspecial(tipoCambio, usuario) {
  const feriado = obtenerFeriadoEspecialDeHoy();
  if (!feriado) return { ok: false, motivo: 'Hoy no es un Feriado Especial configurado.' };
  if (obtenerTipoCambioDeHoy()) return { ok: false, motivo: 'El tipo de cambio de hoy ya fue registrado.' };
  if (!usuarioPuedeRegistrarTipoCambio(usuario)) return { ok: false, motivo: 'No tienes permiso para registrar el tipo de cambio.' };

  const nuevoId = (Math.max(0, ...TIPOS_CAMBIO_FERIADOS_DEMO.map(t => t.id)) || 0) + 1;
  const montoUSD = feriado.montoUSD;
  const montoSoles = Math.round(montoUSD * tipoCambio * 100) / 100;
  TIPOS_CAMBIO_FERIADOS_DEMO.unshift({ id: nuevoId, fecha: fechaHoyDDMMYYYY(), tipoCambio, montoUSD, montoSoles, agregadoPor: usuario });
  guardarTiposCambioFeriados();
  actualizarAlertaFeriadoEspecial();
  return { ok: true };
}

// Plazo para corregir un tipo de cambio ya registrado: hasta N días
// posteriores a la fecha del feriado (inclusive el día N). Pasado ese plazo
// el renglón queda bloqueado — es lo que rigió y ya pudo usarse en reportes.
const DIAS_PLAZO_EDICION_TIPO_CAMBIO = 5;

function fechaLimiteEdicionTipoCambio(registro) {
  const [d, m, y] = registro.fecha.split('/').map(Number);
  return new Date(y, m - 1, d + DIAS_PLAZO_EDICION_TIPO_CAMBIO, 23, 59, 59, 999);
}

function tipoCambioEsEditable(registro) {
  return new Date() <= fechaLimiteEdicionTipoCambio(registro);
}

function editarTipoCambioFeriadoEspecial(id, tipoCambio, montoUSD, usuario) {
  const registro = TIPOS_CAMBIO_FERIADOS_DEMO.find(t => t.id === id);
  if (!registro) return { ok: false, motivo: 'No se encontró el registro.' };
  if (!usuarioPuedeRegistrarTipoCambio(usuario)) return { ok: false, motivo: 'No tienes permiso para editar el tipo de cambio.' };
  if (!tipoCambioEsEditable(registro)) {
    return { ok: false, motivo: `Solo se puede editar hasta ${DIAS_PLAZO_EDICION_TIPO_CAMBIO} días después del feriado (${registro.fecha}).` };
  }
  registro.tipoCambio = tipoCambio;
  registro.montoUSD = montoUSD;
  registro.montoSoles = Math.round(montoUSD * tipoCambio * 100) / 100;
  registro.editadoPor = usuario;
  guardarTiposCambioFeriados();
  return { ok: true };
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MESES_GASTOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/* =================================================
   DÍAS A BORDO — AUTOMÁTICO (Sprint 4 §1.2)
   Ya no se registra a mano: se genera solo a partir de la configuración
   (tarifas, domingos, feriados especiales + tipo de cambio) y de las
   operaciones reales que el operador ya tiene en el sistema. Nunca inventa
   un dato: si algo no existe en la fuente real, queda vacío/"—".
================================================= */

// Monto de UN día puntual (fechaISO: yyyy-mm-dd) — única función que usan el
// Detalle, la descarga y el Resumen Total, para no calcular esto en más de
// un lugar (mismo criterio que calcularSaldoOperador en Precintos). Orden de
// prioridad: Feriado especial (USD, tipo de cambio del día) > Feriado
// (soles, monto fijo) > Domingo > día normal — un feriado que cae domingo
// se paga como feriado (le gana al domingo), y un Feriado especial le gana
// a un feriado regular si coincidieran la misma fecha.
function calcularMontoDiaABordo(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const cfg = LIMITES_GASTOS_DEMO.diasABordo;

  const especial = cfg.feriadosEspeciales.find(f => f.dia === dia && f.mes === mes);
  if (especial) {
    const pad = n => String(n).padStart(2, '0');
    const fechaDDMMYYYY = `${pad(dia)}/${pad(mes)}/${anio}`;
    const tc = TIPOS_CAMBIO_FERIADOS_DEMO.find(t => t.fecha === fechaDDMMYYYY);
    if (!tc) return { monto: 0, tipo: 'feriadoEspecial', pendiente: true };
    return { monto: tc.montoSoles, tipo: 'feriadoEspecial', pendiente: false };
  }

  // Feriado oficial: fecha fija (anio null, se repite cada año) o puntual
  // (Jueves/Viernes Santo, solo ese año exacto) — monto único configurado
  // en cfg.feriadoOficial, no por fecha.
  const oficial = (cfg.feriadosOficiales || []).find(f => f.dia === dia && f.mes === mes && (!f.anio || f.anio === anio));
  if (oficial) return { monto: cfg.feriadoOficial, tipo: 'feriadoOficial', pendiente: false };

  const diaSemana = new Date(anio, mes - 1, dia).getDay(); // 0 = domingo
  if (diaSemana === 0) return { monto: cfg.domingo, tipo: 'domingo', pendiente: false };
  return { monto: cfg.diaNormal, tipo: 'normal', pendiente: false };
}

// Distritos/provincias que el Resumen Total cuenta como "Lima" (incluye
// Callao, mismo criterio que usa nómina) — el resto cae en "Provincia". No
// hay un campo de "región" en el sistema; se infiere del lugar/terminal de
// la operación, igual que hace la planilla con el conocimiento del área.
const LUGARES_LIMA_GASTOS = ['Lima', 'Callao'];
function esLugarDeLima(lugar) {
  return LUGARES_LIMA_GASTOS.some(l => (lugar || '').toLowerCase().includes(l.toLowerCase()));
}

// Genera los renglones de Días a Bordo de un operador en [desdeISO, hastaISO]
// — PROMPT_GASTOS_JORNADA_SPRINT4 §5: hay Día a Bordo si (a) la Jornada de
// ese día está CERRADA con horas >= horasMinimasDiaABordo (configurable,
// CONFIG_JORNADA_DEMO en data-movil.js) y (b) el operador tuvo una
// operación de BUQUE ese día — la señal de "hubo una operación de buque"
// sigue siendo el "Uso" reportado en Precintos ese día (mismo dato que ya
// alimenta Reporte de Precintos — lugar/operación/ITS REF/buque salen de
// ahí; data-precintos.js no distingue buque de otro tipo de operación, así
// que un Uso reportado ES la operación de buque). Si Precintos o la
// Jornada no están cargados en esta página, no hay fuente: el período sale
// vacío en vez de inventar nada.
function generarDiasABordoOperador(operadorUsuario, desdeISO, hastaISO) {
  if (typeof obtenerTodosLosPrecintosConEstado !== 'function') return [];

  const porDia = new Map(); // fechaISO -> uso (el primero de ese día, si hay más de uno)
  obtenerTodosLosPrecintosConEstado()
    .filter(f => f.uso && f.asignacion && f.asignacion.recibidoPor === operadorUsuario)
    .forEach(f => {
      const fechaISO = fechaDDMMYYYYaISO(f.uso.fecha);
      if (fechaISO < desdeISO || fechaISO > hastaISO) return;
      if (!porDia.has(fechaISO)) porDia.set(fechaISO, f.uso);
    });

  // Filtra a solo los días con una Jornada cerrada de duración suficiente —
  // sin esto (o sin data-movil.js cargado), ningún día genera Día a Bordo:
  // la jornada es el eje, ya no alcanza con haber reportado un Uso.
  if (typeof JORNADAS_MOVIL_DEMO === 'object' && typeof CONFIG_JORNADA_DEMO === 'object') {
    const horasMinimas = CONFIG_JORNADA_DEMO.horasMinimasDiaABordo;
    const jornadasCalifican = new Set(
      Object.values(JORNADAS_MOVIL_DEMO)
        .filter(j => j.usuario === operadorUsuario && j.estado === 'cerrada' && (j.horas || 0) >= horasMinimas)
        .map(j => j.fecha)
    );
    [...porDia.keys()].forEach(fechaISO => { if (!jornadasCalifican.has(fechaISO)) porDia.delete(fechaISO); });
  } else {
    porDia.clear();
  }

  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fechaISO, uso]) => {
      const montoCalc = calcularMontoDiaABordo(fechaISO);
      const diaSemana = DIAS_SEMANA[(new Date(fechaISO + 'T00:00:00').getDay() + 6) % 7];
      // "tipoOperacion" de Precintos viene como "Descarga / M/N Cordillera"
      // (operación + buque, separados por " / ") — se separan acá por la
      // PRIMERA barra nomás (el nombre del buque "M/N ..." trae su propia
      // barra, un split('/') a secas lo hubiera cortado mal), sin inventar
      // ningún dato que no esté ya en el registro de uso.
      const textoOperacion = String(uso.tipoOperacion || '');
      const separador = textoOperacion.indexOf('/');
      const operacionTexto = (separador === -1 ? textoOperacion : textoOperacion.slice(0, separador)).trim();
      const buqueTexto = (separador === -1 ? '' : textoOperacion.slice(separador + 1)).trim();

      // Operaciones involucradas de ese día (§1): ahora pueden ser varias
      // (2+ PER con clientes distintos) — obtenerOperacionesDeJornada
      // (data-movil.js) sí resuelve el cliente real contra
      // OPERACIONES_ASIGNADAS_MOVIL_DEMO, a diferencia del evento de Uso
      // solo (que no lo trae). Con varias, se unen por " / ".
      const operaciones = (typeof obtenerOperacionesDeJornada === 'function') ? obtenerOperacionesDeJornada(operadorUsuario, fechaISO) : [];
      const jornada = (typeof obtenerJornadaPorFecha === 'function') ? obtenerJornadaPorFecha(operadorUsuario, fechaISO) : null;
      const codigoInfo = jornada ? obtenerOCrearCodigoReporteJornada('Días a Bordo', jornada.id) : null;

      return {
        dia: diaSemana,
        fecha: fechaISOaDDMMYYYY(fechaISO),
        fechaISO,
        jornadaId: jornada ? jornada.id : null,
        codigo: codigoInfo ? codigoInfo.codigo : null,
        // Lugar donde el operador marcó inicio/fin de jornada (dirección
        // ya resuelta por resolverDireccionLegible, ver data-movil.js) —
        // Sprint 4 ítem 7: va en el Detalle web, no en la descarga.
        lugarInicioJornada: (jornada && jornada.inicio && jornada.inicio.ubicacionTexto) || '—',
        lugarFinJornada: (jornada && jornada.fin && jornada.fin.ubicacionTexto) || '—',
        operaciones,
        lugar: uso.terminal || '—',
        operacion: operacionTexto || '—',
        operacionPer: operaciones.length ? operaciones.map(o => o.per).join(' / ') : (uso.viaje || '—'),
        buque: operaciones.length ? operaciones.map(o => o.buque).join(' / ') : (buqueTexto || '—'),
        cliente: operaciones.length ? operaciones.map(o => o.cliente).join(' / ') : '—',
        detalle: montoCalc.tipo === 'feriadoEspecial' ? 'Feriado especial' : montoCalc.tipo === 'feriadoOficial' ? 'Feriado oficial' : montoCalc.tipo === 'domingo' ? 'Domingo laborado' : 'Inspección a bordo',
        monto: montoCalc.monto,
        pendiente: montoCalc.pendiente
      };
    });
}

// Aplica los ajustes/exclusiones del supervisor (detalle.overrides, keyed por
// fecha dd/mm/yyyy) sobre lo recién generado y deja el resultado en
// detalle.grilla — se llama cada vez que se abre/descarga el reporte (ver
// detalle-gastos.js → abrirDetalleGasto / registro-gastos-operativos.js →
// prepararDescargaGastos), así un cambio de tarifa o tipo de cambio se
// refleja solo, sin que nadie tenga que volver a cargar nada a mano.
function regenerarDiasABordo(id) {
  const detalle = DETALLE_DIAS_A_BORDO_DEMO[id];
  if (!detalle) return;
  if (!detalle.overrides) detalle.overrides = {};

  const desdeISO = fechaDDMMYYYYaISO(detalle.fechaInicio);
  const hastaISO = fechaDDMMYYYYaISO(detalle.fechaFin);
  const generados = generarDiasABordoOperador(detalle.firmaTrabajador, desdeISO, hastaISO);

  detalle.grilla = generados
    .filter(f => !(detalle.overrides[f.fecha] && detalle.overrides[f.fecha].excluido))
    .map(f => {
      const ov = detalle.overrides[f.fecha];
      return (ov && ov.monto !== undefined) ? { ...f, monto: ov.monto, pendiente: false } : f;
    });
}

// Resumen de un operador para el Resumen Total (§1.4): cuenta y suma cada
// día generado (ver generarDiasABordoOperador — ya respeta tarifas/TC/
// feriados) en sus 4 columnas (Feriado / Domingo Lima / Domingo Provincia /
// Día a bordo), más los buques y PER que tuvo en el rango. Usa los mismos
// días "en bruto" (no pasa por overrides de un período puntual — el
// Resumen es un corte propio, no agrega las ediciones de cada Detalle).
function calcularResumenDiasABordoOperador(operadorUsuario, desdeISO, hastaISO) {
  const dias = generarDiasABordoOperador(operadorUsuario, desdeISO, hastaISO);
  const r = {
    feriadoDias: 0, feriadoSoles: 0,
    domLimaDias: 0, domLimaSoles: 0,
    domProvDias: 0, domProvSoles: 0,
    bordoDias: 0, bordoSoles: 0,
    pendiente: false, buques: new Set(), pers: new Set()
  };
  dias.forEach(f => {
    if (f.pendiente) r.pendiente = true;
    if (f.buque && f.buque !== '—') r.buques.add(f.buque);
    if (f.operacionPer && f.operacionPer !== '—') r.pers.add(f.operacionPer);

    // PROMPT_GASTOS_CONFIG_SPRINT4 §3: en el Resumen Total, los especiales
    // (USD×TC) van en "Feriados Lab."; los oficiales (soles) cuentan junto
    // con los domingos en "Dom. Lab. Lima/Prov." según la ubicación —
    // revisa f.detalle (no el día de la semana: un feriado oficial puede
    // caer cualquier día, no solo domingo).
    if (f.detalle === 'Feriado especial') { r.feriadoDias++; r.feriadoSoles += f.monto; }
    else if (f.detalle === 'Domingo laborado' || f.detalle === 'Feriado oficial') {
      if (esLugarDeLima(f.lugar)) { r.domLimaDias++; r.domLimaSoles += f.monto; }
      else { r.domProvDias++; r.domProvSoles += f.monto; }
    } else { r.bordoDias++; r.bordoSoles += f.monto; }
  });
  r.total = r.feriadoSoles + r.domLimaSoles + r.domProvSoles + r.bordoSoles;
  r.buque = r.buques.size === 0 ? 'NO TIENE' : r.buques.size === 1 ? [...r.buques][0] : 'VARIOS';
  r.per = r.pers.size === 0 ? 'NO TIENE' : r.pers.size === 1 ? [...r.pers][0] : 'VARIOS';
  return r;
}

// Todos los operadores con al menos un día generado en [desdeISO,hastaISO]
// — recorre los mismos 3 operadores que ya tienen reportes de Gastos
// (GASTOS_OPERATIVOS_DEMO), igual universo que usa la grilla principal.
function operadoresConDiasABordo(desdeISO, hastaISO) {
  const usuarios = [...new Set(
    GASTOS_OPERATIVOS_DEMO
      .map(g => obtenerDetalleGastoPorTipo(g.tipo, g.id)?.firmaTrabajador)
      .filter(Boolean)
  )];
  return usuarios
    .map(usuario => ({ usuario, resumen: calcularResumenDiasABordoOperador(usuario, desdeISO, hastaISO) }))
    .filter(({ resumen }) => resumen.feriadoDias + resumen.domLimaDias + resumen.domProvDias + resumen.bordoDias > 0);
}

// =================================================
// DATOS DE PRUEBA — REPORTES PASADOS, para poder probar en el móvil
// (Reportes: búsqueda/filtros/descarga) y en la web (Historial) con
// reportes de Alimentos y Movilidad YA CARGADOS, no solo el estado vacío.
// Crea 3 jornadas CERRADAS reales de e.allccaco en fechas del período
// activo que ya quedaron en el pasado (nunca hoy ni futuro), cada una con
// su código de jornada asignado (obtenerOCrearCodigoReporteJornada) y sus
// filas de Alimentos/Movilidad. Corre una sola vez (idempotente, flag en
// localStorage) y nunca pisa algo que el usuario ya haya registrado para
// esas fechas.
// =================================================
(function sembrarReportesPasadosDemo() {
  const FLAG = 'seedReportesPasadosV1';
  if (localStorage.getItem(FLAG)) return;
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof obtenerUsuarioPorNombre !== 'function') return;

  const usuario = 'e.allccaco';
  if (!obtenerUsuarioPorNombre(usuario)) { localStorage.setItem(FLAG, '1'); return; }

  const hoyISODia = new Date().toISOString().slice(0, 10);
  const dias = [
    {
      fechaISO: '2026-09-15', inicio: '07:00', fin: '18:30',
      alimentos: [
        { comida: 'Desayuno', lugar: 'Supe', hora: '07:30', costo: 8.00, sinSustento: false },
        { comida: 'Almuerzo', lugar: 'Supe', hora: '13:00', costo: 18.00, sinSustento: false },
        { comida: 'Cena', lugar: 'Supe', hora: '19:00', costo: 14.00, sinSustento: false }
      ],
      movilidad: [
        { empresa: 'Taxi Seguro Supe', distritoPartida: 'Supe Puerto', distritoDestino: 'Supe', motivo: 'Traslado a muelle', importe: 15.00, sinSustento: false }
      ]
    },
    {
      fechaISO: '2026-09-22', inicio: '07:15', fin: '19:00',
      alimentos: [
        { comida: 'Desayuno', lugar: 'Supe', hora: '07:40', costo: 7.00, sinSustento: true },
        { comida: 'Almuerzo', lugar: 'Supe', hora: '13:10', costo: 20.00, sinSustento: false }
      ],
      movilidad: [
        { empresa: 'Taxi Seguro Supe', distritoPartida: 'Supe', distritoDestino: 'Supe Puerto', motivo: 'Traslado a operación', importe: 12.00, sinSustento: false }
      ]
    },
    {
      fechaISO: '2026-09-29', inicio: '06:45', fin: '17:50',
      alimentos: [
        { comida: 'Almuerzo', lugar: 'Supe', hora: '12:50', costo: 19.00, sinSustento: false },
        { comida: 'Cena', lugar: 'Supe', hora: '18:30', costo: 16.00, sinSustento: false }
      ],
      movilidad: [
        { empresa: 'Taxi Seguro Supe', distritoPartida: 'Supe Puerto', distritoDestino: 'Supe', motivo: 'Traslado a muelle', importe: 10.00, sinSustento: false },
        { empresa: 'Taxi Seguro Supe', distritoPartida: 'Supe', distritoDestino: 'Terminal Norte', motivo: 'Cambio de terminal', importe: 14.00, sinSustento: false }
      ]
    }
  ];

  dias.forEach(dia => {
    if (dia.fechaISO >= hoyISODia) return; // defensa: nunca sembrar hoy ni futuro

    const fechaDD = fechaISOaDDMMYYYY(dia.fechaISO);
    const claveJornada = `${usuario}_${dia.fechaISO}`;
    if (!JORNADAS_MOVIL_DEMO[claveJornada]) {
      const inicioISO = `${dia.fechaISO}T${dia.inicio}:00.000Z`;
      const finISO = `${dia.fechaISO}T${dia.fin}:00.000Z`;
      JORNADAS_MOVIL_DEMO[claveJornada] = {
        id: claveJornada, usuario, fecha: dia.fechaISO,
        inicio: { hora: dia.inicio, fecha: fechaDD, fechaHoraISO: inicioISO, gps: null, fuente: 'marcada', sincronizado: true, sincronizadoEn: inicioISO },
        fin: { hora: dia.fin, fecha: fechaDD, fechaHoraISO: finISO, gps: null, fuente: 'marcada', sincronizado: true, sincronizadoEn: finISO },
        estado: 'cerrada', operaciones: [],
        horas: calcularHorasJornada({ fechaHoraISO: inicioISO }, { fechaHoraISO: finISO })
      };
    }
    const jornada = JORNADAS_MOVIL_DEMO[claveJornada];

    const periodo = asegurarReporteGasto(usuario, dia.fechaISO);
    const codigoAlim = obtenerOCrearCodigoReporteJornada('Alimentos', jornada.id).codigo;
    const codigoMov = obtenerOCrearCodigoReporteJornada('Movilidad', jornada.id).codigo;
    const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(usuario) : [];
    const cliente = operaciones.length ? operaciones.map(o => o.cliente).join(' / ') : '—';
    const operacionPer = operaciones.length ? operaciones.map(o => o.per).join(' / ') : '—';

    const detalleAlim = obtenerDetalleGastoPorTipo('Alimentos', periodo.ids['Alimentos']);
    dia.alimentos.forEach(a => {
      if (detalleAlim.grilla.some(f => f.fecha === fechaDD && f.comida === a.comida)) return;
      detalleAlim.grilla.push({
        fecha: fechaDD, comida: a.comida, lugar: a.lugar, cliente, operacionPer,
        jornadaId: jornada.id, codigoJornada: codigoAlim,
        hora: a.hora, costo: a.costo,
        evidencia: a.sinSustento ? [] : ['Evidencia 1'], sinSustento: a.sinSustento,
        agregadoPosterior: false, justificacion: '', agregadoEn: null
      });
    });

    const detalleMov = obtenerDetalleGastoPorTipo('Movilidad', periodo.ids['Movilidad']);
    dia.movilidad.forEach(m => {
      if (detalleMov.grilla.some(f => f.fecha === fechaDD && f.empresa === m.empresa && f.motivo === m.motivo)) return;
      detalleMov.grilla.push({
        fecha: fechaDD, empresa: m.empresa, distritoPartida: m.distritoPartida, distritoDestino: m.distritoDestino,
        motivo: m.motivo, importeDia: m.importe, totalDia: m.importe,
        jornadaId: jornada.id, codigoJornada: codigoMov,
        evidencia: m.sinSustento ? [] : ['Evidencia 1'], sinSustento: m.sinSustento,
        agregadoPosterior: false, justificacion: '', agregadoEn: null
      });
    });
  });

  guardarJornadasMovil();
  guardarEstadoGastos();
  localStorage.setItem(FLAG, '1');
})();

// =================================================
// DATOS DE PRUEBA — JORNADAS DEL PERÍODO ACTUAL (10/11/2026) de varios
// operadores, con distintos estados de reporte para ver "Jornadas iniciadas"
// en cada caso: todo registrado / falta Cena / solo movilidad / nada
// registrado / agregado posterior. Solo días ya pasados; nunca pisa una
// jornada que el usuario ya haya creado. Corre una sola vez.
// =================================================
(function sembrarJornadasPeriodoActualEjemplos() {
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof obtenerUsuarioPorNombre !== 'function') return;

  const hoyISODia = new Date().toISOString().slice(0, 10);
  const F = '2026-11-10';
  const jornadas = [
    { usuario: 'j.ramos', inicio: '07:00', fin: '19:30', lugar: 'Callao',
      alimentos: [['Desayuno', '07:20', 8], ['Almuerzo', '13:10', 20], ['Cena', '19:30', 15]],
      movilidad: [['Taxi Seguro Callao', 'Callao', 'Terminal Callao', 'Traslado a muelle', 15]] },
    { usuario: 'b.jimenez', inicio: '06:45', fin: '18:30', lugar: 'Pisco',
      alimentos: [['Desayuno', '07:00', 8], ['Almuerzo', '13:00', 18]],
      movilidad: [] },
    { usuario: 'm.juarez', inicio: '08:00', fin: '17:00', lugar: 'Supe',
      alimentos: [],
      movilidad: [['Taxi Seguro Supe', 'Supe', 'Supe Puerto', 'Traslado a operación', 12]] },
    { usuario: 'j.solis', inicio: '07:30', fin: '17:30', lugar: 'Callao',
      alimentos: [], movilidad: [] },
    { usuario: 'l.paredes', inicio: '07:10', fin: '18:00', lugar: 'Callao', posterior: true,
      alimentos: [['Desayuno', '07:30', 8], ['Almuerzo', '13:20', 19]],
      movilidad: [['Transportes Callao', 'Callao', 'Terminal Callao', 'Cambio de terminal', 10]] }
  ];

  jornadas.forEach(dia => {
    if (F >= hoyISODia) return; // defensa: nunca sembrar hoy ni futuro
    const usuario = dia.usuario;
    if (!obtenerUsuarioPorNombre(usuario)) return;
    const claveJornada = `${usuario}_${F}`;
    // No pisa lo que el usuario ya registró; sí reemplaza la jornada genérica 'demo' (08:00–17:00) que se crea sola para ayer.
    const existente = JORNADAS_MOVIL_DEMO[claveJornada];
    if (existente && !existente.demo) return;

    const fechaDD = fechaISOaDDMMYYYY(F);
    const inicioISO = `${F}T${dia.inicio}:00.000Z`;
    const finISO = `${F}T${dia.fin}:00.000Z`;
    JORNADAS_MOVIL_DEMO[claveJornada] = {
      id: claveJornada, usuario, fecha: F,
      inicio: { hora: dia.inicio, fecha: fechaDD, fechaHoraISO: inicioISO, gps: null, fuente: 'marcada', sincronizado: true, sincronizadoEn: inicioISO },
      fin: { hora: dia.fin, fecha: fechaDD, fechaHoraISO: finISO, gps: null, fuente: 'marcada', sincronizado: true, sincronizadoEn: finISO },
      estado: 'cerrada', operaciones: [],
      horas: calcularHorasJornada({ fechaHoraISO: inicioISO }, { fechaHoraISO: finISO })
    };
    const jornada = JORNADAS_MOVIL_DEMO[claveJornada];
    const periodo = asegurarReporteGasto(usuario, F);
    const codigoAlim = obtenerOCrearCodigoReporteJornada('Alimentos', jornada.id).codigo;
    const codigoMov = obtenerOCrearCodigoReporteJornada('Movilidad', jornada.id).codigo;
    const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(usuario) : [];
    const cliente = operaciones.length ? operaciones.map(o => o.cliente).join(' / ') : '—';
    const operacionPer = operaciones.length ? operaciones.map(o => o.per).join(' / ') : '—';

    const detalleAlim = obtenerDetalleGastoPorTipo('Alimentos', periodo.ids['Alimentos']);
    dia.alimentos.forEach(([comida, hora, costo]) => {
      if (detalleAlim.grilla.some(f => f.fecha === fechaDD && f.comida === comida)) return;
      const posterior = !!dia.posterior && comida === 'Almuerzo';
      detalleAlim.grilla.push({
        fecha: fechaDD, comida, lugar: dia.lugar, cliente, operacionPer,
        jornadaId: jornada.id, codigoJornada: codigoAlim, hora, costo,
        evidencia: ['Evidencia 1'], sinSustento: false,
        agregadoPosterior: posterior,
        justificacion: posterior ? 'Olvidé registrarlo el mismo día' : '',
        agregadoEn: posterior ? `${F}T20:00:00.000Z` : null
      });
    });
    const detalleMov = obtenerDetalleGastoPorTipo('Movilidad', periodo.ids['Movilidad']);
    dia.movilidad.forEach(([empresa, partida, destino, motivo, importe]) => {
      if (detalleMov.grilla.some(f => f.fecha === fechaDD && f.empresa === empresa && f.motivo === motivo)) return;
      detalleMov.grilla.push({
        fecha: fechaDD, empresa, distritoPartida: partida, distritoDestino: destino, motivo,
        importeDia: importe, totalDia: importe,
        jornadaId: jornada.id, codigoJornada: codigoMov,
        evidencia: ['Evidencia 1'], sinSustento: false,
        agregadoPosterior: false, justificacion: '', agregadoEn: null
      });
    });
  });

  guardarJornadasMovil();
  guardarEstadoGastos();
})();

// =================================================
// DATOS DE PRUEBA — PRECINTOS USADOS EL 10/11/2026 (período actual), para
// que "Jornadas iniciadas" muestre precintos usados/scrap en cada caso.
// Crea un lote (PRE26000100) con sus asignaciones y los usos/scrap de ese
// día; idempotente (si el lote ya existe no hace nada).
// =================================================
(function sembrarPrecintosUsadosPeriodoActual() {
  if (typeof PRECINTOS_REGISTROS_DEMO === 'undefined' || typeof ASIGNACIONES_PRECINTOS_DEMO === 'undefined' || typeof GENERAR_REGISTROS_PRECINTOS_DEMO === 'undefined') return;
  const CODIGO = 'PRE26000100';
  if (PRECINTOS_REGISTROS_DEMO.some(r => r.codigo === CODIGO)) return;
  const F = '10/11/2026';
  const hoyISODia = new Date().toISOString().slice(0, 10);
  if (fechaDDMMYYYYaISO(F) >= hoyISODia) return; // nunca hoy ni futuro

  const K = n => 'R-9' + String(n).padStart(4, '0');
  const lista = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => K(a + i));
  PRECINTOS_REGISTROS_DEMO.push({
    codigo: CODIGO, fecha: '09/11/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria', precintos: lista(1, 10)
  });

  const maxId = ASIGNACIONES_PRECINTOS_DEMO.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0);
  const nro = ASIGNACIONES_PRECINTOS_DEMO.reduce((m, a) => Math.max(m, parseInt(String(a.codigo).replace(/\D/g, ''), 10) || 0), 0);
  const nroGrp = GENERAR_REGISTROS_PRECINTOS_DEMO.reduce((m, r) => Math.max(m, parseInt(String(r.numero).replace(/\D/g, ''), 10) || 0), 0);

  const casos = [
    { usuario: 'j.ramos', precintos: lista(1, 4), usados: lista(1, 4), scrap: [], viaje: 'V-2601', tipo: 'Descarga / M/N Naviera del Sur' },
    { usuario: 'b.jimenez', precintos: lista(5, 7), usados: lista(5, 6), scrap: [K(7)], viaje: 'V-2602', tipo: 'Carga / M/N Pacífico I' },
    { usuario: 'l.paredes', precintos: lista(8, 10), usados: [K(8)], scrap: [], viaje: 'V-2603', tipo: 'Descarga / M/N Callao Express' }
  ];
  casos.forEach((c, i) => {
    if (typeof obtenerUsuarioPorNombre === 'function' && !obtenerUsuarioPorNombre(c.usuario)) return;
    const id = maxId + 1 + i;
    const codigo = 'ASG' + String(nro + 1 + i).padStart(8, '0');
    ASIGNACIONES_PRECINTOS_DEMO.push({
      id, codigo, registroCodigos: [CODIGO], fecha: '09/11/2026',
      entregadoPor: 's.echavarria', recibidoPor: c.usuario,
      precintos: c.precintos, cantidad: c.precintos.length,
      scrap: c.scrap.map(p => ({ precinto: p, fecha: F, colaborador: c.usuario, motivo: 'Se rompió al momento de instalarlo.' })),
      motivo: 'Servicio ' + c.tipo.split('/ ')[1], observaciones: ''
    });
    GENERAR_REGISTROS_PRECINTOS_DEMO.push({
      registroCodigos: [CODIGO], numero: 'GRP' + String(nroGrp + 1 + i).padStart(8, '0'),
      fechaEmision: '09/11/2026', fechaInicio: '09/11/2026', fechaFin: '', asignacionId: id, estado: 'Pendiente',
      detalle: c.usados.map(p => ({ colaborador: c.usuario, precinto: p, viaje: c.viaje, fecha: F, observacion: '', tipoOperacion: c.tipo, terminal: 'Terminal Callao' }))
    });
  });
  tgGuardarCatalogo('precintosRegistrosData', PRECINTOS_REGISTROS_DEMO);
  tgGuardarCatalogo('precintosAsignacionesData', ASIGNACIONES_PRECINTOS_DEMO);
  tgGuardarCatalogo('precintosGenerarRegistrosData', GENERAR_REGISTROS_PRECINTOS_DEMO);
})();

// =================================================
// DATOS DE PRUEBA — HISTORIAL DE REPORTES (período anterior 10/10 al 09/11/2026)
// para el módulo Reportes: varias jornadas por operador con Alimentos y
// Movilidad (con y sin sustento, agregados posteriores) y Días a Bordo
// (jornadas de 12 h o más con precintos usados). Solo días pasados;
// idempotente por jornada/fila y nunca pisa lo que el usuario ya registró.
// =================================================
(function sembrarHistorialReportesEjemplos() {
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof obtenerUsuarioPorNombre !== 'function') return;
  const hoyISODia = new Date().toISOString().slice(0, 10);

  // --- Lote de precintos para los Días a Bordo de ejemplo ---
  const CODIGO_LOTE = 'PRE26000101';
  if (typeof PRECINTOS_REGISTROS_DEMO !== 'undefined' && !PRECINTOS_REGISTROS_DEMO.some(r => r.codigo === CODIGO_LOTE)) {
    const R = n => 'R-91' + String(n).padStart(3, '0');
    PRECINTOS_REGISTROS_DEMO.push({ codigo: CODIGO_LOTE, fecha: '12/10/2026', estado: 'Registrado', material: 'Plástico', ingresadoPor: 's.echavarria', precintos: [1, 2, 3, 4, 5, 6].map(R) });
    const maxId = ASIGNACIONES_PRECINTOS_DEMO.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0);
    const nro = ASIGNACIONES_PRECINTOS_DEMO.reduce((m, a) => Math.max(m, parseInt(String(a.codigo).replace(/\D/g, ''), 10) || 0), 0);
    const nroGrp = GENERAR_REGISTROS_PRECINTOS_DEMO.reduce((m, r) => Math.max(m, parseInt(String(r.numero).replace(/\D/g, ''), 10) || 0), 0);
    [
      { usuario: 'j.ramos', precintos: [1, 2, 3, 4].map(R), usos: [[R(1), '14/10/2026', 'V-2501'], [R(2), '14/10/2026', 'V-2501'], [R(3), '28/10/2026', 'V-2504'], [R(4), '28/10/2026', 'V-2504']], tipo: 'Descarga / M/N Naviera del Sur' },
      { usuario: 'l.paredes', precintos: [5, 6].map(R), usos: [[R(5), '21/10/2026', 'V-2502'], [R(6), '04/11/2026', 'V-2506']], tipo: 'Carga / M/N Callao Express' }
    ].forEach((c, i) => {
      if (!obtenerUsuarioPorNombre(c.usuario)) return;
      const id = maxId + 1 + i;
      ASIGNACIONES_PRECINTOS_DEMO.push({
        id, codigo: 'ASG' + String(nro + 1 + i).padStart(8, '0'), registroCodigos: [CODIGO_LOTE], fecha: '12/10/2026',
        entregadoPor: 's.echavarria', recibidoPor: c.usuario, precintos: c.precintos, cantidad: c.precintos.length,
        motivo: 'Servicio ' + c.tipo.split('/ ')[1], observaciones: ''
      });
      GENERAR_REGISTROS_PRECINTOS_DEMO.push({
        registroCodigos: [CODIGO_LOTE], numero: 'GRP' + String(nroGrp + 1 + i).padStart(8, '0'),
        fechaEmision: '12/10/2026', fechaInicio: '12/10/2026', fechaFin: '', asignacionId: id, estado: 'Pendiente',
        detalle: c.usos.map(([p, f, v]) => ({ colaborador: c.usuario, precinto: p, viaje: v, fecha: f, observacion: '', tipoOperacion: c.tipo, terminal: 'Terminal Callao' }))
      });
    });
    tgGuardarCatalogo('precintosRegistrosData', PRECINTOS_REGISTROS_DEMO);
    tgGuardarCatalogo('precintosAsignacionesData', ASIGNACIONES_PRECINTOS_DEMO);
    tgGuardarCatalogo('precintosGenerarRegistrosData', GENERAR_REGISTROS_PRECINTOS_DEMO);
  }

  // --- Jornadas + Alimentos + Movilidad ---
  // al: [comida, hora, costo, sinSustento?]  mo: [empresa, partida, destino, motivo, importe, sinSustento?]
  const largo = { inicio: '07:00', fin: '19:30' }, normal = { inicio: '07:30', fin: '17:30' };
  const usuarios = {
    'j.ramos': { cliente: 'Naviera del Sur S.A.', per: 'PER/09634-25', lugar: 'Callao', dias: [
      ['2026-10-14', largo, [['Desayuno', '07:20', 8], ['Almuerzo', '13:10', 20], ['Cena', '19:30', 15]], [['Taxi Seguro Callao', 'Callao', 'Terminal Callao', 'Traslado a muelle', 15]]],
      ['2026-10-21', normal, [['Desayuno', '07:45', 7, true], ['Almuerzo', '13:00', 19]], [['Taxi Seguro Callao', 'Terminal Callao', 'Callao', 'Retorno de operación', 12]]],
      ['2026-10-28', largo, [['Desayuno', '07:10', 8], ['Almuerzo', '13:15', 20], ['Cena', '19:20', 16]], [['Taxi Seguro Callao', 'Callao', 'Terminal Callao', 'Traslado a muelle', 14], ['Taxi Seguro Callao', 'Terminal Callao', 'Callao', 'Retorno de operación', 14]]],
      ['2026-11-04', normal, [['Almuerzo', '12:50', 18]], []]
    ] },
    'b.jimenez': { cliente: 'Naviera del Pacífico S.A.', per: 'PER/09474-26', lugar: 'Pisco', dias: [
      ['2026-10-13', normal, [['Desayuno', '07:00', 8], ['Almuerzo', '13:00', 18]], [['Taxi Seguro Pisco', 'Pisco', 'Terminal Pisco', 'Traslado a operación', 14]]],
      ['2026-10-20', normal, [['Almuerzo', '13:20', 19], ['Cena', '18:00', 14]], []],
      ['2026-11-03', normal, [['Desayuno', '07:15', 8], ['Almuerzo', '13:05', 20]], [['Taxi Seguro Pisco', 'Terminal Pisco', 'Pisco', 'Retorno de operación', 16, true]]]
    ] },
    'm.juarez': { cliente: 'Peru LNG', per: 'PER/09476-26', lugar: 'Supe', dias: [
      ['2026-10-15', normal, [['Desayuno', '07:30', 8], ['Almuerzo', '13:00', 17]], [['Taxi Seguro Supe', 'Supe', 'Supe Puerto', 'Traslado a muelle', 12]]],
      ['2026-10-27', normal, [['Almuerzo', '12:45', 18], ['Cena', '18:15', 15]], [['Taxi Seguro Supe', 'Supe Puerto', 'Supe', 'Retorno de operación', 10]]]
    ] },
    'j.solis': { cliente: 'Petroperú', per: 'PER/09477-26', lugar: 'Talara', dias: [
      ['2026-10-16', normal, [['Desayuno', '07:20', 8], ['Almuerzo', '13:10', 19], ['Cena', '18:40', 15]], [['Mototaxi Talara', 'Talara', 'Terminal Talara', 'Traslado a operación', 8]]],
      ['2026-11-05', normal, [['Almuerzo', '13:00', 20]], []]
    ] },
    'l.paredes': { cliente: 'Sandra Motors', per: 'PER/09473-26', lugar: 'Callao', dias: [
      ['2026-10-12', normal, [['Desayuno', '07:30', 8], ['Almuerzo', '13:20', 19]], [['Transportes Callao', 'Callao', 'Terminal Callao', 'Cambio de terminal', 10]]],
      ['2026-10-21', largo, [['Desayuno', '07:10', 8], ['Almuerzo', '13:00', 20], ['Cena', '19:30', 16]], [['Transportes Callao', 'Callao', 'Terminal Callao', 'Traslado a muelle', 12], ['Transportes Callao', 'Terminal Callao', 'Callao', 'Retorno de operación', 12]]],
      ['2026-11-04', largo, [['Desayuno', '07:20', 8, true], ['Almuerzo', '13:10', 20]], [['Transportes Callao', 'Callao', 'Terminal Callao', 'Traslado a muelle', 12]]]
    ] }
  };

  Object.keys(usuarios).forEach(usuario => {
    if (!obtenerUsuarioPorNombre(usuario)) return;
    const u = usuarios[usuario];
    u.dias.forEach(([fechaISO, horario, alimentos, movilidad]) => {
      if (fechaISO >= hoyISODia) return; // nunca hoy ni futuro
      const fechaDD = fechaISOaDDMMYYYY(fechaISO);
      const claveJornada = usuario + '_' + fechaISO;
      const existente = JORNADAS_MOVIL_DEMO[claveJornada];
      if (existente && !existente.demo && !existente.backfill) return; // lo ya registrado se respeta
      const inicioISO = fechaISO + 'T' + horario.inicio + ':00.000Z';
      const finISO = fechaISO + 'T' + horario.fin + ':00.000Z';
      JORNADAS_MOVIL_DEMO[claveJornada] = {
        id: claveJornada, usuario, fecha: fechaISO,
        inicio: { hora: horario.inicio, fecha: fechaDD, fechaHoraISO: inicioISO, gps: null, ubicacionTexto: u.lugar, fuente: 'marcada', sincronizado: true, sincronizadoEn: inicioISO },
        fin: { hora: horario.fin, fecha: fechaDD, fechaHoraISO: finISO, gps: null, ubicacionTexto: u.lugar, fuente: 'marcada', sincronizado: true, sincronizadoEn: finISO },
        estado: 'cerrada', operaciones: [],
        horas: calcularHorasJornada({ fechaHoraISO: inicioISO }, { fechaHoraISO: finISO })
      };
      const jornada = JORNADAS_MOVIL_DEMO[claveJornada];
      const periodo = asegurarReporteGasto(usuario, fechaISO);
      const codigoAlim = obtenerOCrearCodigoReporteJornada('Alimentos', jornada.id).codigo;
      const codigoMov = obtenerOCrearCodigoReporteJornada('Movilidad', jornada.id).codigo;

      const detalleAlim = obtenerDetalleGastoPorTipo('Alimentos', periodo.ids['Alimentos']);
      alimentos.forEach(([comida, hora, costo, sinSustento]) => {
        if (detalleAlim.grilla.some(f => f.fecha === fechaDD && f.comida === comida)) return;
        detalleAlim.grilla.push({
          fecha: fechaDD, comida, lugar: u.lugar, cliente: u.cliente, operacionPer: u.per,
          jornadaId: jornada.id, codigoJornada: codigoAlim, hora, costo,
          evidencia: sinSustento ? [] : ['Evidencia 1'], sinSustento: !!sinSustento,
          agregadoPosterior: false, justificacion: '', agregadoEn: null
        });
      });
      const detalleMov = obtenerDetalleGastoPorTipo('Movilidad', periodo.ids['Movilidad']);
      movilidad.forEach(([empresa, partida, destino, motivo, importe, sinSustento]) => {
        if (detalleMov.grilla.some(f => f.fecha === fechaDD && f.empresa === empresa && f.motivo === motivo)) return;
        detalleMov.grilla.push({
          fecha: fechaDD, empresa, distritoPartida: partida, distritoDestino: destino, motivo,
          importeDia: importe, totalDia: importe, cliente: u.cliente, operacionPer: u.per,
          jornadaId: jornada.id, codigoJornada: codigoMov,
          evidencia: sinSustento ? [] : ['Evidencia 1'], sinSustento: !!sinSustento,
          agregadoPosterior: false, justificacion: '', agregadoEn: null
        });
      });
    });
  });

  guardarJornadasMovil();
  guardarEstadoGastos();
})();

// =================================================
// DATOS DE PRUEBA — PRECINTOS UTILIZADOS POR LOS OPERADORES CON OPERACIÓN
// ASIGNADA (j.torres, j.gomez, r.bravo, e.allccaco), el 10/11/2026. Cada uno
// recibe un lote con precintos usados (con el viaje/terminal de su
// operación), alguno en scrap y alguno todavía asignado sin usar — se ven
// en "Jornadas iniciadas", Operaciones (Asignar Precinto) y Reporte de
// Precintos. Idempotente (lote PRE26000102).
// =================================================
(function sembrarPrecintosUtilizadosOperadores() {
  if (typeof PRECINTOS_REGISTROS_DEMO === 'undefined' || typeof ASIGNACIONES_PRECINTOS_DEMO === 'undefined' || typeof GENERAR_REGISTROS_PRECINTOS_DEMO === 'undefined') return;
  const CODIGO = 'PRE26000102';
  if (PRECINTOS_REGISTROS_DEMO.some(r => r.codigo === CODIGO)) return;
  const F = '10/11/2026';
  if (fechaDDMMYYYYaISO(F) >= new Date().toISOString().slice(0, 10)) return; // nunca hoy ni futuro

  const S = n => 'S-92' + String(n).padStart(3, '0');
  const casos = [
    { usuario: 'j.torres', desde: 1, total: 6, usados: 3, scrap: 1, viaje: 'V-2287', tipo: 'Descarga / M/N Naviera del Sur', terminal: 'Terminal Portuario Multipropósito Muelle Norte' },
    { usuario: 'j.gomez', desde: 7, total: 5, usados: 3, scrap: 0, viaje: 'V-2401', tipo: 'Descarga / M/N Cordillera', terminal: 'Terminal Norte' },
    { usuario: 'r.bravo', desde: 12, total: 5, usados: 2, scrap: 1, viaje: 'V-2214', tipo: 'Descarga / M/N Costa Azul', terminal: 'Supe' },
    { usuario: 'e.allccaco', desde: 17, total: 4, usados: 2, scrap: 0, viaje: 'V-2201', tipo: 'Carga / M/N Naviera del Sur', terminal: 'Supe' }
  ].filter(c => typeof obtenerUsuarioPorNombre !== 'function' || obtenerUsuarioPorNombre(c.usuario));
  if (!casos.length) return;

  const todos = [];
  casos.forEach(c => { c.lista = Array.from({ length: c.total }, (_, i) => S(c.desde + i)); todos.push(...c.lista); });
  PRECINTOS_REGISTROS_DEMO.push({ codigo: CODIGO, fecha: '09/11/2026', estado: 'Registrado', material: 'Plástico', ingresadoPor: 's.echavarria', precintos: todos });

  const maxId = ASIGNACIONES_PRECINTOS_DEMO.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0);
  const nro = ASIGNACIONES_PRECINTOS_DEMO.reduce((m, a) => Math.max(m, parseInt(String(a.codigo).replace(/\D/g, ''), 10) || 0), 0);
  const nroGrp = GENERAR_REGISTROS_PRECINTOS_DEMO.reduce((m, r) => Math.max(m, parseInt(String(r.numero).replace(/\D/g, ''), 10) || 0), 0);
  casos.forEach((c, i) => {
    const id = maxId + 1 + i;
    const usados = c.lista.slice(0, c.usados);
    const scrap = c.lista.slice(c.usados, c.usados + c.scrap); // el resto queda asignado, sin usar
    ASIGNACIONES_PRECINTOS_DEMO.push({
      id, codigo: 'ASG' + String(nro + 1 + i).padStart(8, '0'), registroCodigos: [CODIGO], fecha: '09/11/2026',
      entregadoPor: 's.echavarria', recibidoPor: c.usuario, precintos: c.lista, cantidad: c.lista.length,
      scrap: scrap.map(p => ({ precinto: p, fecha: F, colaborador: c.usuario, motivo: 'Se rompió al momento de instalarlo.' })),
      motivo: 'Servicio ' + c.tipo.split('/ ')[1], observaciones: ''
    });
    GENERAR_REGISTROS_PRECINTOS_DEMO.push({
      registroCodigos: [CODIGO], numero: 'GRP' + String(nroGrp + 1 + i).padStart(8, '0'),
      fechaEmision: '09/11/2026', fechaInicio: '09/11/2026', fechaFin: '', asignacionId: id, estado: 'Pendiente',
      detalle: usados.map(p => ({ colaborador: c.usuario, precinto: p, viaje: c.viaje, fecha: F, observacion: '', tipoOperacion: c.tipo, terminal: c.terminal }))
    });
  });
  tgGuardarCatalogo('precintosRegistrosData', PRECINTOS_REGISTROS_DEMO);
  tgGuardarCatalogo('precintosAsignacionesData', ASIGNACIONES_PRECINTOS_DEMO);
  tgGuardarCatalogo('precintosGenerarRegistrosData', GENERAR_REGISTROS_PRECINTOS_DEMO);
})();

// =================================================
// COMIDAS OLVIDADAS (PROMPT_GASTOS_PENDIENTES_SPRINT4 §2) — jornadas YA
// CERRADAS, dentro del plazo de olvidos (CONFIG_JORNADA_DEMO.
// plazoOlvidoHoras desde que cerraron), con una comida habilitada por el
// corte horario de ESA jornada (igual criterio que comidaDisponible en
// gastos-movil.js, repetido acá porque esta revisión corre también desde
// Operaciones, que no carga ese archivo) sin gasto registrado y sin
// descartar ("No corresponde/no consumí"). Dejan de avisar solas al
// vencer el plazo (ya no entran al filtro) o al registrarse (ya hay fila).
// =================================================
const OLVIDOS_DESCARTADOS_MOVIL_DEMO = tgCargarCatalogo('olvidosDescartadosData', {});
function guardarOlvidosDescartados() { tgGuardarCatalogo('olvidosDescartadosData', OLVIDOS_DESCARTADOS_MOVIL_DEMO); }

// "No corresponde / no consumí" (§2): descarta el aviso de esa comida en
// esa fecha puntual para siempre, sin registrar ningún gasto.
function descartarComidaOlvidada(usuario, fechaISO, comida) {
  OLVIDOS_DESCARTADOS_MOVIL_DEMO[`${usuario}_${fechaISO}_${comida}`] = true;
  guardarOlvidosDescartados();
}

// Por rango de horas (incluye Cena, antes sin corte). Desayuno/Almuerzo se
// miden contra el INICIO de la Jornada (si llegaste tarde, ya no
// corresponde esa comida — igual que antes); Cena contra el FIN (se
// relaciona con cuándo terminaste el día, no con cuándo lo empezaste: una
// jornada que arrancó temprano en la mañana igual puede cerrar de noche).
// Sin fin todavía (jornada abierta) no se bloquea Cena — recién se puede
// juzgar cuando el día ya cerró. Ver corteDesayunoDesde/Hasta,
// corteAlmuerzoDesde/Hasta, corteCenaDesde/Hasta en CONFIG_JORNADA_DEMO
// (data-movil.js).
function comidaHabilitadaPorCorte(comida, horaInicioJornada, horaFinJornada) {
  if (typeof CONFIG_JORNADA_DEMO === 'undefined') return true;
  const prefijo = comida === 'Desayuno' ? 'corteDesayuno' : comida === 'Almuerzo' ? 'corteAlmuerzo' : 'corteCena';
  const desde = CONFIG_JORNADA_DEMO[`${prefijo}Desde`];
  const hasta = CONFIG_JORNADA_DEMO[`${prefijo}Hasta`];
  if (!desde || !hasta) return true;
  if (comida === 'Cena') {
    if (!horaFinJornada) return true;
    return horaFinJornada >= desde && horaFinJornada < hasta;
  }
  if (!horaInicioJornada) return true;
  return horaInicioJornada >= desde && horaInicioJornada < hasta;
}

// Todas las comidas olvidadas de un operador, agrupadas por jornada —
// recorre sus jornadas cerradas dentro del plazo y arma sus 3 reportes
// (asegurarReporteGasto, mismo que usa el móvil para saber "en qué id
// guardar") para ver qué comida le falta cada día.
function obtenerComidasOlvidadasOperador(usuario) {
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof CONFIG_JORNADA_DEMO === 'undefined') return [];
  const ahora = Date.now();
  const plazoMs = CONFIG_JORNADA_DEMO.plazoOlvidoHoras * 3600000;
  const porDia = [];

  Object.values(JORNADAS_MOVIL_DEMO)
    .filter(j => j.usuario === usuario && j.estado === 'cerrada' && j.fin && j.inicio)
    .forEach(j => {
      const msDesdeCierre = ahora - new Date(j.fin.fechaHoraISO).getTime();
      if (msDesdeCierre < 0 || msDesdeCierre > plazoMs) return;

      const periodo = asegurarReporteGasto(j.usuario, j.fecha);
      const detalle = obtenerDetalleGastoPorTipo('Alimentos', periodo.ids['Alimentos']);
      const fechaDD = fechaISOaDDMMYYYY(j.fecha);

      const comidasFaltantes = ['Desayuno', 'Almuerzo', 'Cena'].filter(comida => {
        if (!comidaHabilitadaPorCorte(comida, j.inicio.hora, j.fin.hora)) return false;
        if (OLVIDOS_DESCARTADOS_MOVIL_DEMO[`${usuario}_${j.fecha}_${comida}`]) return false;
        return !detalle.grilla.some(f => f.fecha === fechaDD && f.comida === comida);
      });
      if (comidasFaltantes.length) porDia.push({ fechaISO: j.fecha, fecha: fechaDD, comidas: comidasFaltantes, jornadaId: j.id });
    });

  return porDia.sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));
}

// Días cerrados (dentro del plazo de olvido) en los que el operador no
// generó NINGÚN reporte de Alimentos o de Movilidad — distinto de "comida
// olvidada" (que mira comida por comida dentro de un reporte que sí
// existe): acá es que el reporte entero quedó sin una sola fila. Usada por
// la campana de "Reportes" en el móvil.
function obtenerReportesNoGeneradosOperador(usuario) {
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof CONFIG_JORNADA_DEMO === 'undefined') return [];
  const ahora = Date.now();
  const plazoMs = CONFIG_JORNADA_DEMO.plazoOlvidoHoras * 3600000;
  const avisos = [];

  Object.values(JORNADAS_MOVIL_DEMO)
    .filter(j => j.usuario === usuario && j.estado === 'cerrada' && j.fin && j.inicio)
    .forEach(j => {
      const msDesdeCierre = ahora - new Date(j.fin.fechaHoraISO).getTime();
      if (msDesdeCierre < 0 || msDesdeCierre > plazoMs) return;

      const periodo = asegurarReporteGasto(j.usuario, j.fecha);
      const fechaDD = fechaISOaDDMMYYYY(j.fecha);

      ['Movilidad', 'Alimentos'].forEach(tipo => {
        const detalle = obtenerDetalleGastoPorTipo(tipo, periodo.ids[tipo]);
        const tieneAlgo = detalle && detalle.grilla.some(f => f.fecha === fechaDD);
        if (!tieneAlgo) {
          avisos.push({ tipo, fechaISO: j.fecha, fecha: fechaDD, mensaje: `No se generó reporte de ${tipo} ${fechaDD}` });
        }
      });
    });

  return avisos.sort((a, b) => b.fechaISO.localeCompare(a.fechaISO));
}

// =================================================
// ESCENARIOS DE PRUEBA — JORNADA OLVIDADA / GASTO OLVIDADO (usuario
// j.torres). Las fechas son RELATIVAS a hoy para que los plazos
// (CONFIG_JORNADA_DEMO.plazoOlvidoHoras, 48 h por defecto, contado desde el
// fin de cada día) siempre den estos casos:
//   · Ayer      → jornada marcada (07:30–17:30) con solo el Desayuno
//                 registrado: faltan Almuerzo y Cena (gasto olvidado,
//                 pide justificación; editable, dentro del plazo).
//   · Hace 2 d. → SIN jornada, dentro del plazo: aparece "Declarar jornada".
//   · Hace 3 d. → SIN jornada, plazo vencido: no se puede registrar.
//   · Hace 4 d. → jornada DECLARADA con gastos agregados después (solo
//                 ver/descargar, fuera de plazo).
//   · Hace 5 d. → jornada que inició 12:00 (Desayuno fuera de corte) con
//                 solo Almuerzo y Cena (solo ver, fuera de plazo).
//   · Hace 6 d. → jornada normal con Alimentos y Movilidad completos.
// Corre una vez (flag en localStorage); para repetirlo, borra la clave
// "seedEscenariosJornadaTorresV1" y recarga.
// =================================================
(function sembrarEscenariosJornadaTorres() {
  const FLAG = 'seedEscenariosJornadaTorresV1';
  if (localStorage.getItem(FLAG)) return;
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof obtenerUsuarioPorNombre !== 'function') return;
  const usuario = 'j.torres';
  if (!obtenerUsuarioPorNombre(usuario)) { localStorage.setItem(FLAG, '1'); return; }

  const pad = n => String(n).padStart(2, '0');
  const isoHace = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(usuario) : [];
  const cliente = operaciones.length ? operaciones.map(o => o.cliente).join(' / ') : '—';
  const operacionPer = operaciones.length ? operaciones.map(o => o.per).join(' / ') : '—';

  // Hace 2 y 3 días NO debe haber jornada (una demo previa pudo crearla).
  [2, 3].forEach(n => {
    const clave = `${usuario}_${isoHace(n)}`;
    if (JORNADAS_MOVIL_DEMO[clave] && JORNADAS_MOVIL_DEMO[clave].demo) delete JORNADAS_MOVIL_DEMO[clave];
  });

  const bloqueHora = (fechaISO, hora, fuente) => ({
    hora, horaLarga: horaA12(hora), fecha: fechaISOaDDMMYYYY(fechaISO), fechaHoraISO: `${fechaISO}T${hora}:00`,
    ubicacionTexto: fuente === 'declarada' ? 'Jornada declarada manualmente' : 'Ubicación registrada', fuente, sincronizado: true
  });
  const crearJornada = (n, inicio, fin, extra) => {
    const fechaISO = isoHace(n), clave = `${usuario}_${fechaISO}`;
    const fuente = extra && extra.declarada ? 'declarada' : 'marcada';
    const j = Object.assign({
      id: clave, usuario, fecha: fechaISO,
      inicio: bloqueHora(fechaISO, inicio, fuente), fin: bloqueHora(fechaISO, fin, fuente),
      estado: 'cerrada', operaciones: operaciones.slice(0, 3)
    }, extra || {});
    j.horas = calcularHorasJornada(j.inicio, j.fin);
    JORNADAS_MOVIL_DEMO[clave] = j;
  };

  const cargarGastos = (n, alimentos, movilidad, posterior) => {
    const fechaISO = isoHace(n), fechaDD = fechaISOaDDMMYYYY(fechaISO);
    const jornada = JORNADAS_MOVIL_DEMO[`${usuario}_${fechaISO}`];
    const periodo = asegurarReporteGasto(usuario, fechaISO);
    const extra = posterior
      ? { agregadoPosterior: true, justificacion: posterior, agregadoEn: new Date().toISOString() }
      : { agregadoPosterior: false, justificacion: '', agregadoEn: null };
    const detAlim = obtenerDetalleGastoPorTipo('Alimentos', periodo.ids['Alimentos']);
    const codAlim = obtenerOCrearCodigoReporteJornada('Alimentos', jornada.id).codigo;
    alimentos.forEach(a => {
      if (detAlim.grilla.some(f => f.fecha === fechaDD && f.comida === a.comida)) return;
      detAlim.grilla.push(Object.assign({
        fecha: fechaDD, comida: a.comida, lugar: a.lugar, cliente, operacionPer,
        jornadaId: jornada.id, codigoJornada: codAlim, hora: a.hora, costo: a.costo,
        evidencia: ['Evidencia 1'], sinSustento: false
      }, extra));
    });
    if (!movilidad.length) return;
    const detMov = obtenerDetalleGastoPorTipo('Movilidad', periodo.ids['Movilidad']);
    const codMov = obtenerOCrearCodigoReporteJornada('Movilidad', jornada.id).codigo;
    movilidad.forEach(m => {
      if (detMov.grilla.some(f => f.fecha === fechaDD && f.empresa === m.empresa && f.motivo === m.motivo)) return;
      detMov.grilla.push(Object.assign({
        fecha: fechaDD, empresa: m.empresa, distritoPartida: m.partida, distritoDestino: m.destino,
        motivo: m.motivo, importeDia: m.importe, totalDia: m.importe,
        jornadaId: jornada.id, codigoJornada: codMov, evidencia: ['Evidencia 1'], sinSustento: false
      }, extra));
    });
  };

  // Ayer: marcada 07:30–17:30, solo Desayuno registrado.
  crearJornada(1, '07:30', '17:30', { demo: true });
  cargarGastos(1, [{ comida: 'Desayuno', lugar: 'Terminal Norte', hora: '07:50', costo: 9.00 }], [], null);

  // Hace 4 días: jornada declarada + gastos agregados después.
  const justDeclarada = 'No marqué la jornada por falta de señal en el terminal.';
  crearJornada(4, '07:30', '18:00', { declarada: true, declaradaEn: new Date().toISOString(), justificacion: justDeclarada });
  cargarGastos(4,
    [{ comida: 'Desayuno', lugar: 'Terminal Norte', hora: '07:45', costo: 8.00 }, { comida: 'Almuerzo', lugar: 'Terminal Norte', hora: '13:10', costo: 19.00 }],
    [{ empresa: 'Taxi Seguro Norte', partida: 'Callao', destino: 'Terminal Norte', motivo: 'Traslado a operación', importe: 14.00 }],
    justDeclarada);

  // Hace 5 días: inició 12:00 → Desayuno fuera de corte; solo Almuerzo y Cena.
  crearJornada(5, '12:00', '20:00');
  cargarGastos(5,
    [{ comida: 'Almuerzo', lugar: 'Terminal Norte', hora: '12:30', costo: 18.00 }, { comida: 'Cena', lugar: 'Terminal Norte', hora: '20:15', costo: 15.00 }],
    [], null);

  // Hace 6 días: jornada completa.
  crearJornada(6, '07:00', '18:30');
  cargarGastos(6,
    [{ comida: 'Desayuno', lugar: 'Terminal Norte', hora: '07:20', costo: 8.00 }, { comida: 'Almuerzo', lugar: 'Terminal Norte', hora: '13:00', costo: 20.00 }, { comida: 'Cena', lugar: 'Terminal Norte', hora: '19:00', costo: 14.00 }],
    [{ empresa: 'Taxi Seguro Norte', partida: 'Callao', destino: 'Terminal Norte', motivo: 'Traslado a muelle', importe: 15.00 }],
    null);

  guardarJornadasMovil();
  guardarEstadoGastos();
  localStorage.setItem(FLAG, '1');
})();

// =================================================
// MÁS REGISTROS DE PRUEBA PARA j.torres — jornadas y reportes de períodos
// ANTERIORES (se ven con las flechas ‹ › de la tarjeta de período, en
// Generar y en Reportes). Fechas relativas a hoy; variedad de casos:
// jornadas completas, solo algunas comidas, varios viajes en el día, gastos
// agregados después con justificación y una jornada declarada. Corre una
// vez (flag en localStorage): para repetirlo, borra la clave
// "seedMasRegistrosJornadaTorresV1" y recarga.
// =================================================
(function sembrarMasRegistrosJornadaTorres() {
  const FLAG = 'seedMasRegistrosJornadaTorresV1';
  if (localStorage.getItem(FLAG)) return;
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof obtenerUsuarioPorNombre !== 'function') return;
  const usuario = 'j.torres';
  if (!obtenerUsuarioPorNombre(usuario)) { localStorage.setItem(FLAG, '1'); return; }

  const pad = n => String(n).padStart(2, '0');
  const isoHace = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(usuario) : [];
  const cliente = operaciones.length ? operaciones.map(o => o.cliente).join(' / ') : '—';
  const operacionPer = operaciones.length ? operaciones.map(o => o.per).join(' / ') : '—';

  const bloqueHora = (fechaISO, hora, fuente) => ({
    hora, horaLarga: horaA12(hora), fecha: fechaISOaDDMMYYYY(fechaISO), fechaHoraISO: `${fechaISO}T${hora}:00`,
    ubicacionTexto: fuente === 'declarada' ? 'Jornada declarada manualmente' : 'Ubicación registrada', fuente, sincronizado: true
  });

  // [hace, inicio, fin, alimentos[[comida, lugar, hora, costo]], viajes[[empresa, partida, destino, motivo, importe]], extra]
  const dias = [
    [8,  '07:10', '18:00', [['Desayuno', 'Terminal Norte', '07:30', 9], ['Almuerzo', 'Terminal Norte', '13:05', 19], ['Cena', 'Callao', '18:30', 15]],
         [['Taxi Seguro Norte', 'Callao', 'Terminal Norte', 'Traslado a muelle', 14], ['Taxi Seguro Norte', 'Terminal Norte', 'Callao', 'Retorno de operación', 14]]],
    [9,  '08:00', '17:00', [['Desayuno', 'Callao', '08:20', 8], ['Almuerzo', 'Callao', '13:15', 18]], [['Transportes Callao', 'Callao', 'Muelle 5', 'Traslado a operación', 12]]],
    [10, '06:30', '19:30', [['Desayuno', 'Terminal Norte', '06:50', 10], ['Almuerzo', 'Terminal Norte', '12:40', 20], ['Cena', 'Terminal Norte', '19:40', 16]],
         [['Taxi Seguro Norte', 'Callao', 'Terminal Norte', 'Traslado a operación', 15]]],
    [12, '12:00', '21:00', [['Almuerzo', 'Terminal Norte', '12:30', 18], ['Cena', 'Terminal Norte', '21:10', 15]], []],
    [13, '07:00', '17:30', [['Desayuno', 'Supe', '07:20', 8], ['Almuerzo', 'Supe', '13:00', 19]],
         [['Taxi Seguro Supe', 'Supe Puerto', 'Supe', 'Traslado a muelle', 10], ['Taxi Seguro Supe', 'Supe', 'Supe Puerto', 'Retorno de operación', 10], ['Taxi Seguro Supe', 'Supe Puerto', 'Terminal Norte', 'Cambio de terminal', 14]]],
    [14, '07:40', '16:50', [['Desayuno', 'Terminal Norte', '08:00', 9]], [['Transportes Callao', 'Callao', 'Terminal Norte', 'Traslado a muelle', 13]]],
    [15, '08:15', '18:20', [['Desayuno', 'Callao', '08:30', 8], ['Almuerzo', 'Callao', '13:20', 19], ['Cena', 'Callao', '18:40', 14]], [],
         { posterior: 'Registré los consumos al día siguiente por falta de señal en el terminal.' }],
    [16, '07:25', '17:40', [['Desayuno', 'Terminal Norte', '07:45', 9], ['Almuerzo', 'Terminal Norte', '13:10', 20]],
         [['Taxi Seguro Norte', 'Callao', 'Terminal Norte', 'Traslado a operación', 14]], { declarada: 'No marqué la jornada: se me agotó la batería del celular.' }],
    [19, '06:50', '18:10', [['Desayuno', 'Supe', '07:05', 8], ['Almuerzo', 'Supe', '12:50', 18], ['Cena', 'Supe', '18:20', 14]],
         [['Taxi Seguro Supe', 'Supe Puerto', 'Supe', 'Traslado a muelle', 11], ['Taxi Seguro Supe', 'Supe', 'Supe Puerto', 'Retorno de operación', 11]]],
    [21, '09:00', '17:00', [['Almuerzo', 'Pisco', '13:30', 19]], [['Transportes Pisco', 'Pisco', 'Terminal Portuario', 'Traslado a operación', 14]]],
    [22, '07:00', '18:45', [['Desayuno', 'Pisco', '07:20', 9], ['Almuerzo', 'Pisco', '13:00', 20], ['Cena', 'Pisco', '19:00', 15]],
         [['Transportes Pisco', 'Pisco', 'Terminal Portuario', 'Traslado a operación', 14], ['Transportes Pisco', 'Terminal Portuario', 'Pisco', 'Retorno de operación', 14]]],
    // Un período más atrás
    [38, '07:30', '17:30', [['Desayuno', 'Callao', '07:50', 8], ['Almuerzo', 'Callao', '13:10', 19]], [['Transportes Callao', 'Callao', 'Muelle 3', 'Traslado a muelle', 12]]],
    [40, '06:45', '19:00', [['Desayuno', 'Supe', '07:00', 9], ['Almuerzo', 'Supe', '12:45', 18], ['Cena', 'Supe', '19:15', 15]], [['Taxi Seguro Supe', 'Supe', 'Supe Puerto', 'Traslado a operación', 10]]],
    [43, '08:00', '16:30', [['Almuerzo', 'Terminal Norte', '13:00', 18]], []]
  ];

  dias.forEach(([n, inicio, fin, alimentos, viajes, extra]) => {
    extra = extra || {};
    const fechaISO = isoHace(n), fechaDD = fechaISOaDDMMYYYY(fechaISO), clave = `${usuario}_${fechaISO}`;
    if (!JORNADAS_MOVIL_DEMO[clave]) {
      const fuente = extra.declarada ? 'declarada' : 'marcada';
      const j = {
        id: clave, usuario, fecha: fechaISO,
        inicio: bloqueHora(fechaISO, inicio, fuente), fin: bloqueHora(fechaISO, fin, fuente),
        estado: 'cerrada', operaciones: operaciones.slice(0, 3)
      };
      if (extra.declarada) { j.declarada = true; j.declaradaEn = new Date().toISOString(); j.justificacion = extra.declarada; }
      j.horas = calcularHorasJornada(j.inicio, j.fin);
      JORNADAS_MOVIL_DEMO[clave] = j;
    }
    const jornada = JORNADAS_MOVIL_DEMO[clave];
    const justificacion = extra.posterior || extra.declarada || '';
    const posterior = justificacion
      ? { agregadoPosterior: true, justificacion, agregadoEn: new Date().toISOString() }
      : { agregadoPosterior: false, justificacion: '', agregadoEn: null };

    const periodo = asegurarReporteGasto(usuario, fechaISO);
    const detAlim = obtenerDetalleGastoPorTipo('Alimentos', periodo.ids['Alimentos']);
    const codAlim = obtenerOCrearCodigoReporteJornada('Alimentos', jornada.id).codigo;
    alimentos.forEach(([comida, lugar, hora, costo]) => {
      if (detAlim.grilla.some(f => f.fecha === fechaDD && f.comida === comida)) return;
      detAlim.grilla.push(Object.assign({
        fecha: fechaDD, comida, lugar, cliente, operacionPer,
        jornadaId: jornada.id, codigoJornada: codAlim, hora, costo,
        evidencia: ['Evidencia 1'], sinSustento: false
      }, posterior));
    });
    if (viajes.length) {
      const detMov = obtenerDetalleGastoPorTipo('Movilidad', periodo.ids['Movilidad']);
      const codMov = obtenerOCrearCodigoReporteJornada('Movilidad', jornada.id).codigo;
      viajes.forEach(([empresa, partida, destino, motivo, importe]) => {
        if (detMov.grilla.some(f => f.fecha === fechaDD && f.empresa === empresa && f.motivo === motivo)) return;
        detMov.grilla.push(Object.assign({
          fecha: fechaDD, empresa, distritoPartida: partida, distritoDestino: destino, motivo,
          importeDia: importe, totalDia: importe,
          jornadaId: jornada.id, codigoJornada: codMov, evidencia: ['Evidencia 1'], sinSustento: false
        }, posterior));
      });
    }
  });

  guardarJornadasMovil();
  guardarEstadoGastos();
  localStorage.setItem(FLAG, '1');
})();

// =================================================
// EJEMPLOS DE PRECINTOS USADOS Y SCRAP — j.torres. Reparte precintos que
// todavía están "asignados" (sin uso) a sus jornadas de prueba (ver
// sembrarMasRegistrosJornadaTorres), para ver y probar "Precintos usados" en
// Generar: jornadas cerradas = solo consulta. Fechas relativas a hoy. Corre
// una vez (flag en localStorage): para repetirlo, borra la clave
// "seedPrecintosJornadaTorresV1" y recarga.
// =================================================
(function sembrarPrecintosJornadaTorres() {
  const FLAG = 'seedPrecintosJornadaTorresV1';
  if (localStorage.getItem(FLAG)) return;
  if (typeof obtenerTodosLosPrecintosConEstado !== 'function' || typeof obtenerGenerarRegistroPorAsignacion !== 'function') return;
  const usuario = 'j.torres';

  // Precintos de j.torres que aún no tienen uso ni scrap, de su operación
  // móvil (V-2287, Terminal Norte).
  const libres = obtenerTodosLosPrecintosConEstado()
    .filter(f => f.estado === 'asignado' && f.asignacion && f.asignacion.recibidoPor === usuario)
    .map(f => f.precinto);
  if (!libres.length) { localStorage.setItem(FLAG, '1'); return; }

  const pad = n => String(n).padStart(2, '0');
  const fechaHace = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const op = (typeof OPERACIONES_ASIGNADAS_MOVIL_DEMO !== 'undefined' && OPERACIONES_ASIGNADAS_MOVIL_DEMO.find(o => o.nroViaje === 'V-2287')) || null;
  const viaje = op ? op.nroViaje : 'V-2287';
  const terminal = op ? op.terminal : 'Terminal Norte';
  const per = op ? op.per : 'PER/09634-25';

  // [hace N días, cantidad usados, cantidad scrap, motivo del scrap]
  const plan = [
    [4, 3, 0], [5, 2, 1, 'Sello roto al sacarlo del empaque; no se pudo instalar.'],
    [6, 3, 0], [8, 2, 0], [9, 3, 1, 'Numeración ilegible; se reemplazó por otro.'],
    [10, 2, 0], [13, 2, 0]
  ];

  plan.forEach(([n, usados, scrap, motivo]) => {
    const fecha = fechaHace(n);
    for (let i = 0; i < usados && libres.length; i++) {
      const precinto = libres.shift();
      const asignacion = obtenerAsignacionDePrecinto(precinto);
      if (asignacion && !obtenerGenerarRegistroPorAsignacion(asignacion.id)) asegurarReportePrecinto(asignacion.id, asignacion.registroCodigos || []);
      const registro = asignacion ? obtenerGenerarRegistroPorAsignacion(asignacion.id) : null;
      if (!registro) continue;
      registro.detalle.push({ colaborador: usuario, precinto, viaje, tipoOperacion: 'Descarga', terminal, fecha, observacion: '' });
    }
    for (let i = 0; i < scrap && libres.length; i++) {
      const precinto = libres.shift();
      const asignacion = obtenerAsignacionDePrecinto(precinto);
      if (!asignacion) continue;
      if (!asignacion.scrap) asignacion.scrap = [];
      asignacion.scrap.push({ precinto, fecha, colaborador: usuario, motivo, per, terminal, viaje });
    }
  });

  guardarEstadoPrecintos();
  localStorage.setItem(FLAG, '1');
})();

// =================================================
// EJEMPLOS CON EVIDENCIA — j.torres, ayer (período actual): una Cena con 2
// evidencias y un viaje de Movilidad con 3, para ver cómo se muestran los
// archivos adjuntos en Reportes (detalle de cada registro). Corre una vez
// (flag en localStorage): para repetirlo, borra la clave
// "seedEvidenciaTorresV1" y recarga.
// =================================================
(function sembrarEvidenciaJornadaTorres() {
  const FLAG = 'seedEvidenciaTorresV1';
  if (localStorage.getItem(FLAG)) return;
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof obtenerUsuarioPorNombre !== 'function') return;
  const usuario = 'j.torres';
  if (!obtenerUsuarioPorNombre(usuario)) { localStorage.setItem(FLAG, '1'); return; }

  const d = new Date(); d.setDate(d.getDate() - 1);
  const pad = n => String(n).padStart(2, '0');
  const fechaISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fechaDD = fechaISOaDDMMYYYY(fechaISO);
  const jornada = JORNADAS_MOVIL_DEMO[`${usuario}_${fechaISO}`];
  if (!jornada) return; // se reintenta cuando exista la jornada de ayer

  const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(usuario) : [];
  const periodo = asegurarReporteGasto(usuario, fechaISO);

  const detAlim = obtenerDetalleGastoPorTipo('Alimentos', periodo.ids['Alimentos']);
  if (!detAlim.grilla.some(f => f.fecha === fechaDD && f.comida === 'Cena')) {
    detAlim.grilla.push({
      fecha: fechaDD, comida: 'Cena', lugar: 'Restaurante Terminal Norte',
      cliente: operaciones.length ? operaciones.map(o => o.cliente).join(' / ') : '—',
      operacionPer: operaciones.length ? operaciones.map(o => o.per).join(' / ') : '—',
      jornadaId: jornada.id, codigoJornada: obtenerOCrearCodigoReporteJornada('Alimentos', jornada.id).codigo,
      hora: '18:10', costo: 14.00,
      evidencia: ['Evidencia 1 (boleta-cena.jpg)', 'Evidencia 2 (ticket-pos.jpg)'], sinSustento: false,
      agregadoPosterior: false, justificacion: '', agregadoEn: null
    });
  }

  const detMov = obtenerDetalleGastoPorTipo('Movilidad', periodo.ids['Movilidad']);
  if (!detMov.grilla.some(f => f.fecha === fechaDD && f.empresa === 'Taxi Seguro Norte')) {
    detMov.grilla.push({
      fecha: fechaDD, empresa: 'Taxi Seguro Norte', distritoPartida: 'Callao', distritoDestino: 'Terminal Norte',
      motivo: 'Traslado a operación', importeDia: 12.00, totalDia: 12.00,
      jornadaId: jornada.id, codigoJornada: obtenerOCrearCodigoReporteJornada('Movilidad', jornada.id).codigo,
      evidencia: ['Evidencia 1 (recibo-taxi.jpg)', 'Evidencia 2 (captura-app.png)', 'Evidencia 3 (ruta-gps.png)'], sinSustento: false,
      agregadoPosterior: false, justificacion: '', agregadoEn: null
    });
  }

  guardarEstadoGastos();
  localStorage.setItem(FLAG, '1');
})();

// =================================================
// DATOS DE PRUEBA — DÍAS A BORDO DEL 10/11/2026 para los operadores con
// operación asignada. Un Día a Bordo sale de una jornada cerrada de 12 h o
// más (CONFIG_JORNADA_DEMO.horasMinimasDiaABordo) con un precinto usado ese
// día (ver generarDiasABordoOperador). La jornada genérica 'demo' de ayer
// (08:00–17:00, 9 h) no alcanzaba, así que se reemplaza por una de 07:00 a
// 19:30; lo que el operador ya registró (Alimentos/Movilidad) no se toca.
// =================================================
(function sembrarJornadasLargasDiasABordo() {
  if (typeof JORNADAS_MOVIL_DEMO === 'undefined' || typeof calcularHorasJornada !== 'function') return;
  const F = '2026-11-10';
  if (F >= new Date().toISOString().slice(0, 10)) return; // nunca hoy ni futuro
  const fechaDD = fechaISOaDDMMYYYY(F);
  let cambio = false;
  ['j.torres', 'j.gomez', 'r.bravo', 'e.allccaco'].forEach(usuario => {
    const j = JORNADAS_MOVIL_DEMO[usuario + '_' + F];
    if (!j || !j.demo) return; // sin jornada genérica de ayer, o ya registrada por el usuario
    const inicioISO = F + 'T07:00:00.000Z', finISO = F + 'T19:30:00.000Z';
    j.inicio = { hora: '07:00', horaLarga: '07:00 am', fecha: fechaDD, fechaHoraISO: inicioISO, ubicacionTexto: 'Ubicación registrada', fuente: 'marcada', sincronizado: true };
    j.fin = { hora: '19:30', horaLarga: '07:30 pm', fecha: fechaDD, fechaHoraISO: finISO, ubicacionTexto: 'Ubicación registrada', fuente: 'marcada', sincronizado: true };
    j.horas = calcularHorasJornada({ fechaHoraISO: inicioISO }, { fechaHoraISO: finISO });
    delete j.demo;
    cambio = true;
  });
  if (cambio) guardarJornadasMovil();
})();
