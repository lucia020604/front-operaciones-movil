// =================================================
// DATA-TABLAS-GENERALES.JS
// Catálogos de "Puertos", "Productos", "Unidades de Medida", "Categoría de
// Servicio" y "Correos en Copia" compartidos entre el mantenedor de
// Tablas Generales y otros módulos (Servicios, Distancias-Horas,
// Seguimiento de Operaciones, Terminales, Muelles).
// Monedas y Tipos de Documento siguen siendo filas fijas
// dentro de tablas-generales.html y no usan este archivo.
// =================================================

// Puertos — catálogo único reutilizado tanto por el mantenedor dedicado de
// Puertos (puertos.html) como por Terminales, Distancias-Horas y
// Seguimiento de Operaciones (Puerto Inicial/Destino), que antes usaban una
// lista fija propia (TERMINALES, en operaciones.js) desincronizada de este
// catálogo. Se siembra con esos mismos 14 puertos más Paita (el que ya
// existía como demo en Tablas Generales) para no perder datos de
// operaciones ya cargadas con esos nombres. departamento/ubicacion/orden
// son propios del mantenedor de Puertos; el resto de módulos solo usa
// nombre/descripcion/estado.
const PUERTOS_DEMO = [
  { id: 1, nombre: 'Talara', descripcion: 'Puerto del norte del Perú', departamento: 'Piura', ubicacion: 'Zona costera – Piura', orden: 1, estado: 'activo' },
  { id: 2, nombre: 'Bayóvar', descripcion: 'Puerto del norte del Perú', departamento: 'Piura', ubicacion: 'Zona costera – Piura', orden: 2, estado: 'activo' },
  { id: 3, nombre: 'Paita', descripcion: 'Puerto del norte del Perú', departamento: 'Piura', ubicacion: 'Zona costera – Piura', orden: 3, estado: 'activo' },
  { id: 4, nombre: 'Eten', descripcion: 'Puerto del norte del Perú', departamento: 'Lambayeque', ubicacion: 'Zona costera – Lambayeque', orden: 4, estado: 'activo' },
  { id: 5, nombre: 'Salaverry', descripcion: 'Puerto del norte del Perú', departamento: 'La Libertad', ubicacion: 'Zona costera – La Libertad', orden: 5, estado: 'activo' },
  { id: 6, nombre: 'Chimbote', descripcion: 'Puerto del centro del Perú', departamento: 'Áncash', ubicacion: 'Zona costera – Áncash', orden: 6, estado: 'activo' },
  { id: 7, nombre: 'Supe', descripcion: 'Puerto del centro del Perú', departamento: 'Lima', ubicacion: 'Zona costera – Lima', orden: 7, estado: 'activo' },
  { id: 8, nombre: 'Relapa', descripcion: 'Puerto del centro del Perú', departamento: 'Lima', ubicacion: 'Zona costera – Lima', orden: 8, estado: 'activo' },
  { id: 9, nombre: 'Callao', descripcion: 'Puerto principal de Perú', departamento: 'Callao', ubicacion: 'Zona costera – Callao', orden: 9, estado: 'activo' },
  { id: 10, nombre: 'Conchán', descripcion: 'Puerto del centro del Perú', departamento: 'Lima', ubicacion: 'Zona costera – Lima', orden: 10, estado: 'activo' },
  { id: 11, nombre: 'Pisco', descripcion: 'Puerto del centro del Perú', departamento: 'Ica', ubicacion: 'Zona costera – Ica', orden: 11, estado: 'activo' },
  { id: 12, nombre: 'S. Nicolás', descripcion: 'Puerto del sur del Perú', departamento: 'Ica', ubicacion: 'Zona costera – Ica', orden: 12, estado: 'activo' },
  { id: 13, nombre: 'Mollendo', descripcion: 'Puerto del sur del Perú', departamento: 'Arequipa', ubicacion: 'Zona costera – Arequipa', orden: 13, estado: 'activo' },
  { id: 14, nombre: 'Tablones', descripcion: 'Puerto del sur del Perú', departamento: 'Arequipa', ubicacion: 'Zona costera – Arequipa', orden: 14, estado: 'activo' },
  { id: 15, nombre: 'Ilo', descripcion: 'Puerto del sur del Perú', departamento: 'Moquegua', ubicacion: 'Zona costera – Moquegua', orden: 15, estado: 'activo' }
];

// Departamentos del Perú — usado por el select del mantenedor de Puertos
// (campo Departamento y filtro).
const DEPARTAMENTOS_PERU = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao',
  'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque',
  'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno',
  'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
];

const PRODUCTOS_DEMO = [
  { id: 1, nombre: 'LNG', descripcion: 'Gas Natural Licuado', estado: 'activo' },
  { id: 2, nombre: 'GLP', descripcion: 'Gas Licuado de Petróleo', estado: 'activo' },
  { id: 3, nombre: 'Crudo', descripcion: 'Petróleo crudo', estado: 'activo' },
  { id: 4, nombre: 'Diesel B5', descripcion: 'Diesel de bajo azufre', estado: 'activo' }
];

const UNIDADES_MEDIDA_DEMO = [
  { id: 1, nombre: 'Barril', descripcion: 'Unidad de volumen para hidrocarburos (BBL)', estado: 'activo' },
  { id: 2, nombre: 'Tonelada Métrica', descripcion: 'Unidad de masa equivalente a 1000 kg (TM)', estado: 'activo' },
  { id: 3, nombre: 'Metro Cúbico', descripcion: 'Unidad de volumen (m3)', estado: 'activo' }
];

const CATEGORIAS_SERVICIO_DEMO = [
  { id: 1, nombre: 'Inspección de Carga', descripcion: '', estado: 'activo' },
  { id: 2, nombre: 'Muestreo y Análisis', descripcion: '', estado: 'activo' },
  { id: 3, nombre: 'Certificación de Calidad y Cantidad', descripcion: '', estado: 'activo' },
  { id: 4, nombre: 'Supervisión de Estiba', descripcion: '', estado: 'activo' },
  { id: 5, nombre: 'Control de Calidad Ambiental', descripcion: '', estado: 'activo' }
];

// Materiales de precinto (Precintos > Control de Precintos / Asignación de
// Precintos): un precinto puede ser de plástico, metálico o circular — se
// administra aquí para que el combo de esos módulos no dependa de opciones
// fijas en el HTML.
const MATERIALES_PRECINTO_DEMO = [
  { id: 1, nombre: 'Plástico', descripcion: '', estado: 'activo' },
  { id: 2, nombre: 'Metálico', descripcion: '', estado: 'activo' },
  { id: 3, nombre: 'Circular', descripcion: '', estado: 'activo' }
];

// Correos que pueden ir "en copia" al enviar la Aceptación del Servicio,
// sin necesidad de que sean usuarios del sistema (a diferencia del
// checkbox "Incluir en copia" del mantenedor de Usuarios). El campo
// Descripción se usa como el correo electrónico.
const CORREOS_COPIA_DEMO = [
  { id: 1, nombre: 'Facturación Intertek', descripcion: 'facturacion@intertek.com', estado: 'activo' },
  { id: 2, nombre: 'Gerencia Comercial', descripcion: 'gerencia.comercial@intertek.com', estado: 'activo' }
];

// Texto legal que se muestra al pie del modal de Aceptación del Servicio,
// uno por idioma (Nombre = idioma). El campo Descripción es el cuerpo
// completo (párrafos separados por línea en blanco); el título del bloque
// sigue siendo fijo, solo el texto legal se administra acá.
const TERMINOS_CONDICIONES_DEMO = [
  { id: 1, nombre: 'Español', estado: 'activo', descripcion:
    'Todo el trabajo realizado está sujeto a los términos y condiciones generales de Intertek, cuya copia se adjunta a esta confirmación de asistencia. Tenga en cuenta que la aceptación de nuestra cotización y la programación del trabajo confirmarán su conformidad para operar según los T&Cs de Intertek.\n\n' +
    '"Los términos y condiciones de Intertek (de servicios y de compra de bienes y servicios) contienen disposiciones específicas sobre confidencialidad, propiedad intelectual y protección de datos, disponibles en la intranet. https://www.intertek.com/terms/"'
  },
  { id: 2, nombre: 'English', estado: 'activo', descripcion:
    "All work carried out is subject to Intertek's general terms and conditions, a copy of which is attached to this confirmation of attendance. Please note that acceptance of our quotation and an appointment to carry out the work will confirm your agreement to trade as per Intertek's T&Cs.\n\n" +
    '"Intertek terms and conditions (of services and of purchase of goods and services) contain specific provisions for dealing with confidentiality, intellectual property and data protection are available on the intranet. https://www.intertek.com/terms/"'
  }
];

function tgCargarCatalogo(storageKey, demo) {
  const raw = localStorage.getItem(storageKey);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(storageKey, JSON.stringify(demo));
  return JSON.parse(JSON.stringify(demo));
}

function tgGuardarCatalogo(storageKey, lista) {
  localStorage.setItem(storageKey, JSON.stringify(lista));
}

function cargarPuertos() {
  return tgCargarCatalogo('puertosData', PUERTOS_DEMO).filter(p => p.estado === 'activo');
}

function cargarProductos() {
  return tgCargarCatalogo('productosData', PRODUCTOS_DEMO).filter(p => p.estado === 'activo');
}

function cargarUnidadesMedida() {
  return tgCargarCatalogo('unidadesMedidaData', UNIDADES_MEDIDA_DEMO).filter(u => u.estado === 'activo');
}

function cargarCategoriasServicio() {
  return tgCargarCatalogo('categoriasServicioData', CATEGORIAS_SERVICIO_DEMO).filter(c => c.estado === 'activo');
}

function cargarTerminosCondiciones() {
  return tgCargarCatalogo('terminosCondicionesData', TERMINOS_CONDICIONES_DEMO).filter(t => t.estado === 'activo');
}

function cargarCorreosCopia() {
  return tgCargarCatalogo('correosCopiaData', CORREOS_COPIA_DEMO).filter(c => c.estado === 'activo');
}

function cargarMaterialesPrecinto() {
  return tgCargarCatalogo('materialesPrecintoData', MATERIALES_PRECINTO_DEMO).filter(m => m.estado === 'activo');
}
