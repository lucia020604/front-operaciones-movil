// =================================================
// DATA-TERMINAL-MUELLE.JS
// Catálogos de "Terminales" y "Muelles", relacionados jerárquicamente con
// Puertos (data-tablas-generales.js): Puerto → Terminal → Muelle.
//
// Nombrados TERMINAL_PUERTO_DEMO / cargarTerminalesPuerto() (en vez de
// TERMINALES/cargarTerminales) para no chocar con la constante TERMINALES
// que ya existe en operaciones.js — esa es la lista de PUERTOS que usa la
// matriz de Distancias-Horas, un concepto distinto al de este archivo.
//
// Depende de tgCargarCatalogo/tgGuardarCatalogo (data-tablas-generales.js),
// que debe cargarse antes que este script.
// =================================================

const TERMINAL_PUERTO_DEMO = [
  { id: 1, nombre: 'Terminal Norte', puerto: 'Callao', descripcion: 'Terminal de graneles líquidos', estado: 'activo' },
  { id: 2, nombre: 'Terminal Sur', puerto: 'Callao', descripcion: 'Terminal de contenedores', estado: 'activo' },
  { id: 3, nombre: 'Terminal Paita', puerto: 'Paita', descripcion: 'Terminal multipropósito', estado: 'activo' }
];

// latitud/longitud/radioMetros: geocerca (PROMPT_GASTOS_JORNADA_SPRINT4 §1)
// — al abrir la app móvil dentro del radio de un muelle sin jornada
// abierta, se sugiere "¿Estás en {muelle}? Comenzar el día" (comparación
// local con distanciaMetros, data-movil.js, sin pedir nada a un servidor).
// Coordenadas aproximadas reales (Terminal Norte/Sur del Callao).
const MUELLE_DEMO = [
  { id: 1, nombre: 'Muelle 1', terminal: 'Terminal Norte', descripcion: 'Atraque para buques tanque', estado: 'activo', latitud: -12.0392, longitud: -77.1531, radioMetros: 300 },
  { id: 2, nombre: 'Muelle 2', terminal: 'Terminal Norte', descripcion: 'Atraque para buques tanque', estado: 'activo', latitud: -12.0405, longitud: -77.1548, radioMetros: 300 },
  { id: 3, nombre: 'Muelle 5', terminal: 'Terminal Sur', descripcion: 'Atraque para portacontenedores', estado: 'activo', latitud: -12.0456, longitud: -77.1489, radioMetros: 300 }
];

function cargarTerminalesPuerto() {
  return tgCargarCatalogo('terminalesPuertoData', TERMINAL_PUERTO_DEMO).filter(t => t.estado === 'activo');
}

// Migración: una copia de MUELLE_DEMO guardada antes de la geocerca se
// queda sin latitud/longitud/radioMetros — se completa con el valor del
// seed (por nombre) sin pisar lo que el supervisor ya haya configurado.
function cargarMuelles() {
  const lista = tgCargarCatalogo('muellesData', MUELLE_DEMO);
  let cambio = false;
  lista.forEach(m => {
    if (m.latitud !== undefined) return;
    const base = MUELLE_DEMO.find(d => d.nombre === m.nombre);
    m.latitud = base ? base.latitud : null;
    m.longitud = base ? base.longitud : null;
    m.radioMetros = base ? base.radioMetros : 300;
    cambio = true;
  });
  if (cambio) tgGuardarCatalogo('muellesData', lista);
  return lista.filter(m => m.estado === 'activo');
}
