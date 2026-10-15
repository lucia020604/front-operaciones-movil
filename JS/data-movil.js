// =================================================
// DATA-MOVIL.JS
// Fuente única de datos de la App Móvil (prototipo sin backend). La app
// móvil reutiliza el mismo login y la misma sesión que el sistema web
// (USUARIOS_DEMO / sessionStorage.sesionUsuario) — es el mismo sistema,
// visto desde el dispositivo del colaborador en campo.
//
// Los datos de la operación asignada se modelan aquí como un set demo
// independiente (mismo formato de PER, buque, terminal y nombres de estado
// que ya usa el resto del sistema) en lugar de acoplarse a OPERACIONES_DEMO
// de Seguimiento de Operaciones, para no modificar código fuera del
// alcance pedido en esta fase (solo App Móvil).
// =================================================

// "HH:MM" en 24h (como se guarda internamente, para poder comparar cortes
// de comida/plazos con un simple "<") -> "hh:mm am/pm" SOLO para mostrar —
// nunca se compara ni se guarda el resultado, siempre el string de 24h.
function horaA12(horaHHMM) {
  if (!horaHHMM || !horaHHMM.includes(':')) return horaHHMM || '';
  let [h, m] = horaHHMM.split(':').map(Number);
  const sufijo = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${sufijo}`;
}

// Igual que horaA12, pero tolera valores que YA vienen con am/pm (datos de
// ejemplo antiguos guardados como texto, antes de que existiera horaA12) —
// evita un "NaN" si se le pasa algo que no es un "HH:MM" limpio de 24h.
function horaA12Seguro(valor) {
  if (!valor || /am|pm/i.test(valor)) return valor || '—';
  return horaA12(valor);
}

// Inverso de horaA12Seguro: de "hh:mm am/pm" (o ya "HH:MM" de 24h) a
// "HH:MM" de 24h — para poder precargar un valor guardado como texto en un
// selector de hora que trabaja internamente en 24h.
function horaA24DesdeTexto(valor) {
  if (!valor) return '';
  const m = valor.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return '';
  let h = Number(m[1]);
  const min = Number(m[2]);
  const sufijo = (m[3] || '').toLowerCase();
  if (sufijo === 'pm' && h < 12) h += 12;
  if (sufijo === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Datos adicionales de perfil (Área, DNI) por usuario — el resto de datos
// del Perfil (Nombre, Apellido, Rol, Celular) ya están en USUARIOS_DEMO.
const PERFIL_MOVIL_EXTRA_DEMO = {
  'e.allccaco': { dni: '45120384' },
  'r.bravo':    { dni: '46220157' },
  'j.gomez':    { dni: '41985023' },
  'j.torres':   { dni: '40873219' }
};

// Direcciones + coordenadas demo que devuelve "Actualizar Ubicación" cuando
// no hay geolocalización real disponible (ver obtenerUbicacionSimulada) —
// coordenadas aproximadas reales de Supe Puerto, Barranca.
const UBICACIONES_DEMO_MOVIL = [
  { texto: 'Av. Costanera 245, Supe Puerto, Barranca', lat: -10.7735, lng: -77.7336 },
  { texto: 'Muelle Fiscal N.° 2, Supe Puerto, Barranca', lat: -10.7721, lng: -77.7351 },
  { texto: 'Jr. Los Pescadores 118, Supe, Barranca', lat: -10.7958, lng: -77.7244 }
];

// Frases demo que devuelve el dictado por voz simulado (botón de micrófono).
const FRASES_DICTADO_DEMO = [
  'Operación en curso sin novedades.',
  'Demora por espera de marea, se reanuda en 30 minutos.',
  'Se coordina con el buque el inicio de la siguiente etapa.'
];

// Secuencia de estados de la operación (coincide con las columnas ya usadas
// en Reporte Mensual de Cabotaje: Eta, Arriba, Fondea, Amarre inicio, Inicia,
// Termina, Firma de Documentos, Zarpe).
//
// "tipo" define qué campo se pide al registrar el estado — no todos son
// fecha y hora: "numero" y "texto" también existen (ej. cantidad de amarras,
// responsable de firma). campoLabel/campoPlaceholder solo aplican a esos dos
// tipos (en "fechaHora" el campo ya se explica solo con la etiqueta del
// estado). Esto no viene de una pantalla existente del sistema web (ahí el
// horario de operaciones es siempre fecha/hora) — es una extensión propia
// de la app móvil para operaciones cuyo estado no es un simple timestamp.
const ESTADOS_OPERACION_MOVIL = [
  { clave: 'eta', etiqueta: 'Eta', tipo: 'fechaHora' },
  { clave: 'arriba', etiqueta: 'Arriba', tipo: 'fechaHora' },
  { clave: 'fondea', etiqueta: 'Fondea', tipo: 'fechaHora' },
  { clave: 'amarreInicio', etiqueta: 'Amarre inicio', tipo: 'numero', campoLabel: 'N° de amarras', campoPlaceholder: 'Ej. 4' },
  { clave: 'inicia', etiqueta: 'Inicia', tipo: 'fechaHora' },
  { clave: 'termina', etiqueta: 'Termina', tipo: 'fechaHora' },
  { clave: 'firmaDocumentos', etiqueta: 'Firma de Documentos', tipo: 'texto', campoLabel: 'Responsable de la firma', campoPlaceholder: 'Nombre y apellido' },
  { clave: 'zarpe', etiqueta: 'Zarpe', tipo: 'fechaHora' }
];

// Operaciones asignadas al colaborador en sesión. Un operador puede tener
// más de una operación asignada el mismo día (ej. termina una y empieza otra
// en un terminal distinto), por eso es una lista y no un objeto único —
// "Añadir Hora", "Horario" y "Asignar Precinto" se abren desde la tarjeta de
// cada operación y actúan solo sobre esa operación.
// Las 4 cubren a los 4 operadores con precintos en data-precintos.js
// (ASIGNACIONES_PRECINTOS_DEMO: j.gomez, j.torres, r.bravo, e.allccaco) —
// cliente/viaje/terminal de j.gomez y j.torres calzan con su Asignación
// ASG26000009/ASG26000008 (misma M/N y Terminal), para que "Asignar
// Precinto" se vea como parte de la misma operación real en vez de un dato
// suelto sin relación.
const OPERACIONES_ASIGNADAS_MOVIL_DEMO = [
  {
    codigo: 'OP-2026-041',
    cliente: 'Naviera del Sur',
    per: 'PER/09461-25',
    nroViaje: 'V-2201',
    terminal: 'Supe',
    operacion: 'Loading',
    personalAsignado: 'Edward Allccaco',
    productos: ['LNG'],
    // admiVisadoPorSistema: si el área administrativa ya marcó "Revisado" desde
    // el sistema, el horario queda bloqueado para edición desde el móvil.
    revisadoPorSistema: false,
    estados: {
      eta: { fecha: '06/07/2026', hora: '06:00', comentario: '' },
      arriba: { fecha: '06/07/2026', hora: '08:10', comentario: '' },
      fondea: { fecha: '', hora: '', comentario: '' },
      amarreInicio: { valor: '', comentario: '' },
      inicia: { fecha: '', hora: '', comentario: '' },
      termina: { fecha: '', hora: '', comentario: '' },
      firmaDocumentos: { valor: '', comentario: '' },
      zarpe: { fecha: '', hora: '', comentario: '' }
    }
  },
  {
    codigo: 'OP-2026-052',
    cliente: 'Pesquera Costa Azul',
    per: 'PER/09512-25',
    nroViaje: 'V-2214',
    terminal: 'Supe',
    operacion: 'Discharging',
    // r.bravo tiene la Asignación ASG26000090 (los 3 materiales, caso de
    // prueba del reporte por material) — su viaje/terminal calzan con este.
    personalAsignado: 'Rudy Bravo Flores',
    productos: ['Diesel B5', 'Gasolina 90'],
    revisadoPorSistema: true,
    estados: {
      eta: { fecha: '06/07/2026', hora: '14:30', comentario: '' },
      arriba: { fecha: '06/07/2026', hora: '16:05', comentario: '' },
      fondea: { fecha: '06/07/2026', hora: '16:40', comentario: '' },
      amarreInicio: { valor: '', comentario: '' },
      inicia: { fecha: '', hora: '', comentario: '' },
      termina: { fecha: '', hora: '', comentario: '' },
      firmaDocumentos: { valor: '', comentario: '' },
      zarpe: { fecha: '', hora: '', comentario: '' }
    }
  },
  // Misma Asignación ASG26000009 (Reporte de Precintos): Terminal Norte,
  // M/N Cordillera, descarga — E-50005/E-50006 quedan disponibles para
  // reportar un Uso nuevo desde acá (E-50001 al E-50004/E-50007/E-50008 ya
  // usados, E-50009/E-50010 ya scrap).
  {
    codigo: 'OP-2026-063',
    cliente: 'Naviera Cordillera',
    per: 'PER/09573-25',
    nroViaje: 'V-2401',
    terminal: 'Terminal Norte',
    operacion: 'Discharging',
    personalAsignado: 'Julio César Gómez',
    productos: ['Concentrado de cobre'],
    revisadoPorSistema: false,
    estados: {
      eta: { fecha: '02/10/2026', hora: '07:15', comentario: '' },
      arriba: { fecha: '02/10/2026', hora: '09:40', comentario: '' },
      fondea: { fecha: '', hora: '', comentario: '' },
      amarreInicio: { valor: '', comentario: '' },
      inicia: { fecha: '', hora: '', comentario: '' },
      termina: { fecha: '', hora: '', comentario: '' },
      firmaDocumentos: { valor: '', comentario: '' },
      zarpe: { fecha: '', hora: '', comentario: '' }
    }
  },
  // Misma Asignación ASG26000008: todavía sin ningún Uso reportado (solo
  // A-09951 como scrap) — ejemplo de operación recién empezada, sin ningún
  // estado registrado aún.
  {
    codigo: 'OP-2026-074',
    cliente: 'Naviera del Sur',
    per: 'PER/09634-25',
    nroViaje: 'V-2287',
    terminal: 'Terminal Portuario Multipropósito Muelle Norte',
    operacion: 'Discharging',
    personalAsignado: 'Juan Torres',
    productos: ['Contenedores'],
    revisadoPorSistema: false,
    estados: {
      eta: { fecha: '', hora: '', comentario: '' },
      arriba: { fecha: '', hora: '', comentario: '' },
      fondea: { fecha: '', hora: '', comentario: '' },
      amarreInicio: { valor: '', comentario: '' },
      inicia: { fecha: '', hora: '', comentario: '' },
      termina: { fecha: '', hora: '', comentario: '' },
      firmaDocumentos: { valor: '', comentario: '' },
      zarpe: { fecha: '', hora: '', comentario: '' }
    }
  }
];

// =================================================
// JORNADA (PROMPT_GASTOS_JORNADA_SPRINT4 §1) — "Comenzar el día" es el
// inicio de jornada, "Finalizar el día" el fin; es el eje del que cuelgan
// Gastos (cortes de comida, gating de registro) y Días a Bordo (ver
// data-gastos.js → generarDiasABordoOperador). Persistida (antes era un
// objeto en memoria que se perdía al recargar — rompía "sin internet,
// sincroniza después" apenas se refrescaba la página).
// Clave 'usuario_fechaISO' — fechaISO es la del INICIO, así una jornada que
// cruza medianoche se queda en la fecha en que empezó (§5).
// Forma: { id, usuario, fecha, inicio:{hora,fecha,fechaHoraISO,gps,fuente,
// sincronizado,sincronizadoEn}, fin:{...}|null, estado:'abierta'|'cerrada',
// operaciones:[per...], horas }.
// =================================================
const JORNADAS_MOVIL_DEMO = tgCargarCatalogo('jornadasMovilData', {});
function guardarJornadasMovil() { tgGuardarCatalogo('jornadasMovilData', JORNADAS_MOVIL_DEMO); }

// Parámetros configurables de Jornada/Gastos que antes no existían en
// ninguna parte (Configuración de Gastos, web, es quien los edita) — ver
// PROMPT_GASTOS_JORNADA_SPRINT4 §1/§3/§5.
const CONFIG_JORNADA_SEED = {
  umbralDesvioMin: 15,            // minutos de diferencia hora dispositivo vs. sincronización para marcar "desvío"
  // Cortes de comida por RANGO de horas (antes un solo corte, sin Cena) —
  // una comida se puede registrar si la hora relevante de la Jornada (ver
  // comidaHabilitadaPorCorte, data-gastos.js) cae dentro de su rango
  // [desde, hasta). Los 3 "desde" quedan en 00:00 por defecto (no son
  // excluyentes entre sí): una jornada que arrancó temprano sigue
  // calificando para las 3, igual que antes — el "hasta" de cada una es
  // el corte real (antes Cena no tenía ninguno).
  corteDesayunoDesde: '00:00', corteDesayunoHasta: '11:00',
  corteAlmuerzoDesde: '00:00', corteAlmuerzoHasta: '15:00',
  corteCenaDesde: '00:00', corteCenaHasta: '23:59',
  plazoOlvidoHoras: 48,            // horas desde el FIN de jornada para poder agregar un "gasto olvidado"
  horasMinimasDiaABordo: 12,        // duración mínima de la jornada para generar Día a Bordo
  // Recordatorio de comidas olvidadas (PROMPT_GASTOS_PENDIENTES_SPRINT4 §2).
  recordatorioOlvidosActivo: true,
  horaRecordatorioOlvidos: '18:00',
  // Cuándo se intenta el aviso (push/banner) al registrar la Jornada:
  // 'inicio' (Comenzar el día) o 'fin' (Finalizar) — antes avisaba en
  // los dos sin poder elegir, ver confirmarRegistroJornada.
  momentoRecordatorioOlvidos: 'fin',
  modificadoPor: null,
  fechaModificacion: null
};
const CONFIG_JORNADA_DEMO = tgCargarCatalogo('configJornadaData', CONFIG_JORNADA_SEED);
// Migración: una copia ya guardada de antes de que existiera algún campo
// nuevo se queda sin él — se completa con el valor del seed sin pisar lo que
// el supervisor ya haya configurado.
Object.keys(CONFIG_JORNADA_SEED).forEach(clave => {
  if (CONFIG_JORNADA_DEMO[clave] === undefined) CONFIG_JORNADA_DEMO[clave] = CONFIG_JORNADA_SEED[clave];
});
function guardarConfigJornada() { tgGuardarCatalogo('configJornadaData', CONFIG_JORNADA_DEMO); }

// Migración/seed: completa Jornadas 'cerradas' (con horas suficientes) para
// los días en que el seed de Precintos YA tiene un Uso reportado pero nunca
// existió una Jornada — sin esto, los Días a Bordo de ejemplo (grilla de
// Gastos, Resumen Total) quedarían todos en cero apenas se exige una
// Jornada cerrada con horas suficientes (ver generarDiasABordoOperador,
// data-gastos.js — el criterio nuevo es jornada + buque, no solo Uso). Las
// jornadas reales que se creen desde "Comenzar/Finalizar el día" no pasan
// por acá — esto solo rellena lo que el seed necesita para seguir
// viéndose completo. Corre una vez por clave faltante (idempotente).
(function backfillJornadasDesdeUsoPrecintos() {
  if (typeof obtenerTodosLosPrecintosConEstado !== 'function') return;
  let cambio = false;
  const hoyISO = obtenerFechaHoyISO();

  // Limpieza: una corrida anterior de este backfill pudo haber cerrado la
  // jornada de HOY (si el seed de Precintos trae un Uso con fecha de hoy) —
  // eso deja al usuario sin forma de volver a "Comenzar/Finalizar el día"
  // para hacer pruebas. El backfill es solo para completar historial; nunca
  // debe decidir el estado del día en curso, así que se descarta.
  Object.keys(JORNADAS_MOVIL_DEMO).forEach(clave => {
    const j = JORNADAS_MOVIL_DEMO[clave];
    if (j.backfill && j.fecha === hoyISO) { delete JORNADAS_MOVIL_DEMO[clave]; cambio = true; }
  });

  obtenerTodosLosPrecintosConEstado()
    .filter(f => f.uso && f.asignacion)
    .forEach(f => {
      const usuario = f.asignacion.recibidoPor;
      const fechaISO = fechaDDMMYYYYaISO(f.uso.fecha);
      if (fechaISO === hoyISO) return; // el día de hoy lo maneja el usuario, no el seed
      const clave = `${usuario}_${fechaISO}`;
      if (JORNADAS_MOVIL_DEMO[clave]) return;
      cambio = true;
      const horas = CONFIG_JORNADA_DEMO.horasMinimasDiaABordo + 1;
      const inicioISO = `${fechaISO}T07:00:00.000Z`;
      const finISO = new Date(new Date(inicioISO).getTime() + horas * 3600000).toISOString();
      // Ubicación de ejemplo (ítem 7, Sprint 4): el backfill no tiene GPS
      // real, pero sí sabe en qué terminal se usó el precinto ese día — se
      // usa como lugar de inicio/fin de jornada para que el Detalle web
      // (Días a Bordo) no se vea vacío en el historial de ejemplo.
      const lugarBackfill = f.uso.terminal || 'Puerto';
      JORNADAS_MOVIL_DEMO[clave] = {
        id: clave, usuario, fecha: fechaISO,
        inicio: { hora: '07:00', fecha: fechaISOaDDMMYYYY(fechaISO), fechaHoraISO: inicioISO, gps: null, ubicacionTexto: lugarBackfill, fuente: 'marcada', sincronizado: true, sincronizadoEn: inicioISO },
        fin: { hora: finISO.slice(11, 16), fecha: fechaISOaDDMMYYYY(finISO.slice(0, 10)), fechaHoraISO: finISO, gps: null, ubicacionTexto: lugarBackfill, fuente: 'marcada', sincronizado: true, sincronizadoEn: finISO },
        estado: 'cerrada', operaciones: [], horas, backfill: true
      };
    });
  if (cambio) guardarJornadasMovil();
})();

// Fecha de HOY en el huso horario LOCAL del dispositivo, no UTC — con
// Date().toISOString() el "día" cambia 5h antes de medianoche en Perú
// (UTC-5), así que un operador que marca "Finalizar el día"/asigna un
// precinto en la noche terminaba con la Jornada fechada "mañana" (UTC)
// mientras el precinto quedaba con la fecha de "hoy" (local): no
// coincidían nunca y el reporte de precintos aparecía vacío al finalizar
// (bug reportado: "agrego precintos... y al finalizar sigue apareciendo
// como que no se asignaron"). getFullYear/getMonth/getDate SÍ son locales.
function obtenerFechaHoyISO() {
  const ahora = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
}

function obtenerJornadaHoy(usuario, fechaISO) {
  fechaISO = fechaISO || obtenerFechaHoyISO();
  const clave = `${usuario}_${fechaISO}`;
  if (!JORNADAS_MOVIL_DEMO[clave]) {
    JORNADAS_MOVIL_DEMO[clave] = { id: clave, usuario, fecha: fechaISO, inicio: null, fin: null, estado: 'pendiente', operaciones: [], horas: 0 };
  }
  return JORNADAS_MOVIL_DEMO[clave];
}

// Para pruebas: reinicia la jornada de un usuario (la de HOY y cualquier
// otra que haya quedado 'abierta', p.ej. una que cruzó medianoche) cada vez
// que cierra o abre sesión — así se puede repetir el flujo de "Comenzar/
// Finalizar el día" sin tener que limpiar localStorage a mano. Llamado
// desde login-movil.js (al iniciar sesión) y perfil-movil.js (al cerrarla).
// No toca jornadas CERRADAS de otros días (esas sí deben conservarse: son
// las que alimentan Días a Bordo y Gastos).
function reiniciarJornadaDeHoy(usuario) {
  if (!usuario) return;
  const hoyISO = obtenerFechaHoyISO();
  let cambio = false;
  Object.keys(JORNADAS_MOVIL_DEMO).forEach(clave => {
    const j = JORNADAS_MOVIL_DEMO[clave];
    if (j.usuario === usuario && (j.fecha === hoyISO || j.estado === 'abierta')) {
      delete JORNADAS_MOVIL_DEMO[clave];
      cambio = true;
    }
  });
  if (cambio) guardarJornadasMovil();
}

// La jornada "activa" de un usuario: una que sigue 'abierta' (puede ser de
// AYER si cruzó medianoche y todavía no se cerró) tiene prioridad sobre la
// de hoy — así "Finalizar" sigue actuando sobre la misma jornada aunque
// cambie el día calendario mientras sigue abierta.
function obtenerJornadaActiva(usuario) {
  const abiertas = Object.values(JORNADAS_MOVIL_DEMO).filter(j => j.usuario === usuario && j.estado === 'abierta');
  if (abiertas.length) return abiertas.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  return obtenerJornadaHoy(usuario);
}

// Última jornada CERRADA de un usuario (abierta o no la de hoy) — la usan
// los cortes de comida y el gating de Gastos para saber si hay una jornada
// marcada o declarada en la fecha del gasto que se quiere registrar.
function obtenerJornadaPorFecha(usuario, fechaISO) {
  return JORNADAS_MOVIL_DEMO[`${usuario}_${fechaISO}`] || null;
}

// Duración en horas entre inicio y fin (datetime completo, no solo la hora)
// — así una jornada que cruza medianoche se calcula bien.
function calcularHorasJornada(inicio, fin) {
  if (!inicio || !fin) return 0;
  const ms = new Date(fin.fechaHoraISO) - new Date(inicio.fechaHoraISO);
  return Math.max(0, ms / 3600000);
}

// "Operaciones involucradas" de una jornada (PROMPT_GASTOS_PANTALLAS_JORNADA_
// SPRINT4 §1): no se trackean aparte — se derivan de los Precintos usados
// ese día por el operador (mismo criterio que ya usa
// abrirModalFinalizarJornada/generarDiasABordoOperador), resueltas a
// {per,cliente,buque,terminal,viaje} contra OPERACIONES_ASIGNADAS_MOVIL_DEMO.
// Nunca inventa un dato que no esté ya en esas dos fuentes.
function obtenerOperacionesDeJornada(usuario, fechaISO) {
  if (typeof obtenerTodosLosPrecintosConEstado !== 'function') return [];
  const viajes = new Set();
  obtenerTodosLosPrecintosConEstado()
    .filter(f => f.uso && f.asignacion && f.asignacion.recibidoPor === usuario)
    .forEach(f => { if (fechaDDMMYYYYaISO(f.uso.fecha) === fechaISO) viajes.add(f.uso.viaje); });

  return [...viajes].map(viaje => {
    const op = (typeof OPERACIONES_ASIGNADAS_MOVIL_DEMO !== 'undefined') ? OPERACIONES_ASIGNADAS_MOVIL_DEMO.find(o => o.nroViaje === viaje) : null;
    // El buque no está en OPERACIONES_ASIGNADAS_MOVIL_DEMO — viene del texto
    // "Descarga / M/N Cordillera" del evento de Uso (misma separación por la
    // PRIMERA barra que usa generarDiasABordoOperador, data-gastos.js).
    const usoDeEseViaje = obtenerTodosLosPrecintosConEstado().find(f => f.uso && f.uso.viaje === viaje);
    const textoOperacion = usoDeEseViaje ? String(usoDeEseViaje.uso.tipoOperacion || '') : '';
    const separador = textoOperacion.indexOf('/');
    const buque = (separador === -1 ? '' : textoOperacion.slice(separador + 1)).trim();
    return {
      per: op ? op.per : (viaje || '—'),
      cliente: op ? op.cliente : '—',
      buque: buque || '—',
      terminal: op ? op.terminal : '—',
      viaje: viaje || '—'
    };
  });
}

// Operaciones ASIGNADAS a un operador (corrección: un operador SIEMPRE tiene
// su(s) operación(es) asignada(s) — ver OPERACIONES_ASIGNADAS_MOVIL_DEMO.
// personalAsignado —, independientemente de si reportó o no un Uso de
// precinto ese día. Esto ya NO depende de la fecha ni de Precintos; para
// saber si hubo precintos usados en una jornada puntual, ver
// obtenerPrecintosDeJornada más abajo. Antes "operaciones involucradas" se
// calculaba a partir de los Usos del día, lo que hacía que una jornada sin
// precintos reportados se viera sin operaciones — incorrecto.
function obtenerOperacionesAsignadasOperador(usuario) {
  const u = (typeof obtenerUsuarioPorNombre === 'function') ? obtenerUsuarioPorNombre(usuario) : null;
  if (!u || typeof OPERACIONES_ASIGNADAS_MOVIL_DEMO === 'undefined') return [];
  const nombreCompleto = `${u.nombre} ${u.apellido}`;
  return OPERACIONES_ASIGNADAS_MOVIL_DEMO
    .filter(op => op.personalAsignado === nombreCompleto)
    .map(op => ({ per: op.per, cliente: op.cliente, terminal: op.terminal, viaje: op.nroViaje, operacion: op.operacion }));
}

// Precintos (usados o scrap) que el operador reportó en la fecha de una
// jornada puntual — mismo criterio que abrirModalFinalizarJornada (§2,
// operaciones-movil.js), centralizado acá para que Gastos pueda mostrar
// "Precintos usados: Sí/No" sin duplicar el filtro.
function obtenerPrecintosDeJornada(usuario, fechaISO) {
  if (typeof obtenerTodosLosPrecintosConEstado !== 'function') return [];
  return obtenerTodosLosPrecintosConEstado().filter(f => {
    if (!f.asignacion || f.asignacion.recibidoPor !== usuario) return false;
    if (f.estado !== 'usado' && f.estado !== 'scrap') return false;
    const fechaEvento = f.estado === 'scrap' ? f.scrapDetalle.fecha : f.uso.fecha;
    return fechaDDMMYYYYaISO(fechaEvento) === fechaISO;
  });
}

// Texto compacto "PER · Cliente · Buque" de una o varias operaciones, usado
// en los campos informativos de Alimentos/Movilidad/Gastos/Reportes — varias
// operaciones se separan por " / " (§1).
function textoOperacionesInvolucradas(operaciones) {
  if (!operaciones || !operaciones.length) return 'Sin operaciones asignadas';
  return operaciones.map(o => `${o.per} · ${o.cliente}${o.buque && o.buque !== '—' ? ' · ' + o.buque : ''}`).join(' / ');
}

// Geolocalización real del dispositivo (navigator.geolocation) con fallback
// simulado si no hay permiso/soporte (mismo patrón que BarcodeDetector en
// Precintos: API real primero, aviso + alternativa si falla) — "callback"
// recibe { lat, lng, precision, textoSimulado } (textoSimulado: dirección
// legible, de la geocodificación inversa si hay coordenadas reales, o del
// punto demo si cayó al fallback — nunca se muestran coordenadas solas).
function obtenerUbicacionDispositivo(callback) {
  if (!navigator.geolocation) { obtenerUbicacionSimulada(callback); return; }
  navigator.geolocation.getCurrentPosition(
    pos => resolverDireccionLegible(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy || 0), callback),
    () => obtenerUbicacionSimulada(callback),
    { enableHighAccuracy: true, timeout: 6000 }
  );
}

// Coordenadas reales -> dirección legible (mejor esfuerzo, con tope de 4s
// para no colgar el formulario): geocodificación inversa real (Nominatim,
// OpenStreetMap, sin API key) y, si no responde a tiempo o falla, muestra
// las coordenadas con un rótulo en vez de dejarlas solas sin contexto.
async function resolverDireccionLegible(lat, lng, precision, callback) {
  try {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 4000);
    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`, { signal: controlador.signal });
    clearTimeout(timeout);
    const datos = await resp.json();
    const direccion = datos && datos.display_name;
    callback({ lat, lng, precision, textoSimulado: direccion || `Ubicación GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})` });
  } catch (err) {
    callback({ lat, lng, precision, textoSimulado: `Ubicación GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})` });
  }
}
function obtenerUbicacionSimulada(callback) {
  const demo = UBICACIONES_DEMO_MOVIL[Math.floor(Math.random() * UBICACIONES_DEMO_MOVIL.length)];
  callback({ lat: demo.lat, lng: demo.lng, precision: 30, textoSimulado: demo.texto });
}

// Distancia entre 2 puntos GPS en metros (fórmula de Haversine) — la usa la
// geocerca de Muelles/Terminales para sugerir "¿Estás en {muelle}?".
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = g => g * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
