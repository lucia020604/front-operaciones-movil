// =================================================
// DATA-USUARIOS.JS
// Fuente única de datos de usuarios y roles (prototipo sin backend).
// La usan: login (index.js), Usuarios (usuarios.js), Roles (roles.js)
// e Información Profesional (informacion-profesional.js, vía el campo
// "usuario" agregado a cada PERFILES[n]).
// =================================================

// Set de permisos "ver" en todo el sistema — lo usan todos los roles
// existentes salvo el rol de demostración "Consulta Restringida".
function permisosCompletos() {
  return {
    general: {
      inicio: { ver: true },
      servicios: { ver: true, crear: true, editar: true, eliminar: true },
      operaciones: { ver: true },
      reportes: { ver: true },
      precintos: { ver: true, crear: true, editar: true, eliminar: true, asignar: true, autorizar: true }
    },
    seguridad: {
      roles: { ver: true, crear: true, editar: true, inactivar: true },
      usuarios: { ver: true, crear: true, editar: true, cambiarPassword: true, restablecerPassword: true },
      informacionProfesional: { ver: true, crear: true, editar: true, inactivar: true }
    },
    mantenedores: {
      configuracionDocumentos: { ver: true },
      clientes: { ver: true, crear: true, editar: true, eliminar: true },
      tablasGenerales: { ver: true, exportar: true, aprobar: true },
      puertos: { ver: true, crear: true, editar: true, inactivar: true },
      terminales: { ver: true, crear: true, editar: true, inactivar: true },
      muelles: { ver: true, crear: true, editar: true, inactivar: true },
      configuracionTipoOperacion: { ver: true, editar: true, anular: true },
      actividades: { ver: true, crear: true, editar: true, inactivar: true }
    }
  };
}

const ROLES_DEMO = [
  { id: 1, nombre: 'Administrador', categorias: ['Administrativo'], estado: 'activo', permisos: permisosCompletos() },
  { id: 2, nombre: 'Gerente de Laboratorio', categorias: ['Administrativo'], estado: 'activo', permisos: permisosCompletos() },
  { id: 3, nombre: 'Analista', categorias: ['Administrativo'], estado: 'activo', permisos: permisosCompletos() },
  { id: 4, nombre: 'Inspector', categorias: ['Operativo'], estado: 'activo', permisos: permisosCompletos() },
  { id: 5, nombre: 'Técnico Especialista', categorias: ['Operativo'], estado: 'activo', permisos: permisosCompletos() },
  { id: 6, nombre: 'Supervisor', categorias: ['Operativo'], estado: 'activo', permisos: permisosCompletos() },
  { id: 7, nombre: 'Jefe de Área', categorias: ['Administrativo'], estado: 'activo', permisos: permisosCompletos() },
  { id: 8, nombre: 'Practicante', categorias: ['Operativo'], estado: 'inactivo', permisos: permisosCompletos() },
  {
    id: 9, nombre: 'Consulta Restringida', categorias: ['Administrativo', 'Operativo'], estado: 'activo',
    permisos: permisosCompletos()
  }
];

// Firmas de demostración (prototipo sin backend): representan la imagen que un
// usuario ya adjuntó desde Configuración > Usuarios (campo "Adjuntar firma").
// El resto de usuarios queda con firma: null hasta que la carguen desde ahí.
const FIRMA_DEMO_JEFE = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="90" viewBox="0 0 220 90">' +
  '<path d="M10 60 C 30 20, 45 20, 55 45 S 75 75, 90 45 S 105 15, 120 40 S 140 70, 155 35 S 175 15, 195 50" ' +
  'fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round"/>' +
  '<line x1="15" y1="72" x2="205" y2="72" stroke="#111111" stroke-width="1.5"/></svg>'
);
const FIRMA_DEMO_GERENTE = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="90" viewBox="0 0 220 90">' +
  '<path d="M12 30 C 25 55, 40 15, 55 40 S 80 65, 95 30 C 105 55, 120 20, 135 45 S 165 60, 180 30 S 195 55, 205 35" ' +
  'fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round"/>' +
  '<line x1="15" y1="72" x2="205" y2="72" stroke="#111111" stroke-width="1.5"/></svg>'
);
const FIRMA_DEMO_COLABORADOR = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="90" viewBox="0 0 220 90">' +
  '<path d="M14 45 C 28 15, 42 65, 58 35 S 88 15, 100 45 S 122 70, 140 30 S 168 20, 182 50 S 198 60, 206 40" ' +
  'fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round"/>' +
  '<line x1="15" y1="72" x2="205" y2="72" stroke="#111111" stroke-width="1.5"/></svg>'
);

const USUARIOS_DEMO = [
  { usuario: 'j.torres', password: 'Torres#2026', estadoPass: 'vigente',
    nombre: 'Juan', apellido: 'Torres', email: 'j.torres@intertek.com', celular: '+51 994 204 994',
    rolId: 1, rolesIds: [1, 7], estado: 'activo', perfilId: null, locacionPrincipal: 'Callao', incluirCopia: true,
    fechaVenc: '20/09/2026', ultimaActualizacion: '20/06/2026', firma: FIRMA_DEMO_JEFE,
    historialPassword: [
      { fecha: '15/07/2026', hora: '09:12', modificadoPor: 'Juan Torres' },
      { fecha: '02/05/2026', hora: '16:45', modificadoPor: 'Juan Torres' },
      { fecha: '10/01/2026', hora: '11:20', modificadoPor: 'Juan Torres' }
    ] },

  { usuario: 'l.paredes', password: 'Paredes#2026', estadoPass: 'porVencer',
    fechaLabel: 'Vence el 01/06/2026', diasRestantes: 15,
    nombre: 'Lucía', apellido: 'Paredes', email: 'l.paredes@intertek.com', celular: '+51 970 565 381',
    rolId: 3, estado: 'activo', perfilId: null, locacionPrincipal: 'Pisco',
    fechaVenc: '01/06/2026', ultimaActualizacion: '01/03/2026' },

  { usuario: 'm.rojas', password: 'Rojas#2026', estadoPass: 'vencida',
    fechaLabel: 'Venció el 01/06/2026',
    nombre: 'Marco', apellido: 'Rojas', email: 'm.rojas@intertek.com', celular: '+51 987 112 334',
    rolId: 2, estado: 'activo', perfilId: null, locacionPrincipal: 'Mollendo',
    fechaVenc: '01/06/2026', ultimaActualizacion: '01/12/2025', firma: FIRMA_DEMO_GERENTE },

  { usuario: 'j.elcorrobarrutia', password: 'Elcorro#2026', estadoPass: 'vigente',
    nombre: 'Juan', apellido: 'Elcorrobarrutia', email: 'j.elcorrobarrutia@intertek.com', celular: '+51 945 220 118',
    rolId: 2, estado: 'activo', perfilId: null, locacionPrincipal: 'Ilo',
    fechaVenc: '15/12/2026', ultimaActualizacion: '18/09/2026' },

  { usuario: 's.echavarria', password: 'Echavarria#2026', estadoPass: 'porVencer',
    nombre: 'Sandra', apellido: 'Echavarria', email: 'sechavarria@sigcomt.com', celular: '+51 989 445 210',
    rolId: 6, estado: 'activo', perfilId: 1, locacionPrincipal: 'Talara',
    fechaVenc: '28/08/2026', ultimaActualizacion: '10/06/2026' },

  { usuario: 'm.juarez', password: 'Juarez#2026', estadoPass: 'vigente',
    nombre: 'Maria', apellido: 'Juarez', email: 'm.juarez@intertek.com', celular: '+51 912 665 778',
    rolId: 8, estado: 'inactivo', perfilId: null, locacionPrincipal: 'Chimbote',
    fechaVenc: '28/08/2026', ultimaActualizacion: '10/06/2026' },

  { usuario: 'j.solis', password: 'Solis#2026', estadoPass: 'vencida',
    nombre: 'Jose', apellido: 'Solis', email: 'j.solis@intertek.com', celular: '+51 923 887 456',
    rolId: 3, estado: 'activo', perfilId: null, locacionPrincipal: 'Salaverry',
    fechaVenc: '28/08/2026', ultimaActualizacion: '28/05/2026' },

  { usuario: 'b.jimenez', password: 'Jimenez#2026', estadoPass: 'vigente',
    nombre: 'Bandy', apellido: 'Jimenez', email: 'b.jimenez@externo.com', celular: '+51 976 341 209',
    rolId: 1, rolesIds: [1, 6], estado: 'activo', perfilId: 2, locacionPrincipal: 'Callao',
    fechaVenc: '15/07/2027', ultimaActualizacion: '15/07/2026' },

  { usuario: 'j.ramos', password: 'Ramos#2026', estadoPass: 'vigente',
    nombre: 'Josue', apellido: 'Ramos', email: 'j.ramos@intertek.com', celular: '+51 968 203 741',
    rolId: 7, rolesIds: [7, 6], estado: 'activo', perfilId: 3, locacionPrincipal: 'Supe',
    fechaVenc: '10/01/2027', ultimaActualizacion: '10/01/2026', firma: FIRMA_DEMO_JEFE },

  { usuario: 'j.gomez', password: 'Gomez#2026', estadoPass: 'vigente',
    nombre: 'Julio César', apellido: 'Gómez', email: 'julio.gomez@intertek.com', celular: '+51 994 204 994',
    rolId: 4, estado: 'activo', perfilId: null, locacionPrincipal: 'Pisco', contactoOficina: true,
    fechaVenc: '20/09/2026', ultimaActualizacion: '20/06/2026', firma: FIRMA_DEMO_COLABORADOR },

  { usuario: 'e.allccaco', password: 'Allccaco#2026', estadoPass: 'vigente',
    nombre: 'Edward', apellido: 'Allccaco', email: 'edward.allccaco@intertek.com', celular: '+51 994 204 994',
    rolId: 5, rolesIds: [5, 4], estado: 'activo', perfilId: null, locacionPrincipal: 'Callao', contactoOficina: true,
    fechaVenc: '20/09/2026', ultimaActualizacion: '20/06/2026', firma: FIRMA_DEMO_COLABORADOR },

  { usuario: 'r.bravo', password: 'Bravo#2026', estadoPass: 'vigente',
    nombre: 'Rudy', apellido: 'Bravo Flores', email: 'richard.bravo@intertek.com', celular: '+51 970 565 381',
    rolId: 5, rolesIds: [5, 4], estado: 'activo', perfilId: null, locacionPrincipal: 'Callao', contactoOficina: true,
    fechaVenc: '20/09/2026', ultimaActualizacion: '20/06/2026', firma: FIRMA_DEMO_COLABORADOR },

  // Usuario de demostración con acceso a todos los módulos del sistema
  // (rol 9, "Consulta Restringida" — ver "permisos" arriba).
  { usuario: 'admiIntertek', password: 'admiIntertek', estadoPass: 'vigente',
    nombre: 'Carla', apellido: 'Ventura', email: 'c.ventura@intertek.com', celular: '+51 994 500 112',
    rolId: 9, estado: 'activo', perfilId: null, locacionPrincipal: 'Callao', incluirCopia: true,
    fechaVenc: '17/07/2027', ultimaActualizacion: '17/07/2026' }
];

function obtenerUsuarioPorLogin(usuario, passwordIngresado) {
  return USUARIOS_DEMO.find(u => u.usuario.toLowerCase() === usuario.toLowerCase() && u.password === passwordIngresado);
}

function obtenerUsuarioPorNombre(usuario) {
  return USUARIOS_DEMO.find(u => u.usuario === usuario);
}

function obtenerRolPorId(id) {
  return ROLES_DEMO.find(r => r.id === Number(id));
}

function obtenerRolPorNombre(nombre) {
  return ROLES_DEMO.find(r => r.nombre === nombre);
}

// Ids de todos los roles de un usuario — la mayoría tiene uno solo (rolId),
// pero un usuario puede tener más de un rol asignado (rolesIds).
function obtenerIdsRolesUsuario(u) {
  return u.rolesIds && u.rolesIds.length ? u.rolesIds : [u.rolId];
}

function obtenerUsuarioActual() {
  const raw = sessionStorage.getItem('sesionUsuario');
  return raw ? JSON.parse(raw) : null;
}

function guardarSesionUsuario(usuarioObj) {
  sessionStorage.setItem('sesionUsuario', JSON.stringify({
    usuario: usuarioObj.usuario,
    nombre: usuarioObj.nombre,
    apellido: usuarioObj.apellido,
    rolId: usuarioObj.rolId
  }));
}

// Firma de un usuario, tal como fue adjuntada desde Configuración > Usuarios
// (campo "Adjuntar firma"). La reutilizan las pantallas de Precintos y Gastos
// Operativos para "Revisado"/"Autorizado"/"Firma del trabajador": no se
// captura una firma nueva en esas pantallas, solo se muestra la ya registrada.
function obtenerFirmaUsuario(usuario) {
  const u = typeof usuario === 'string' ? obtenerUsuarioPorNombre(usuario) : usuario;
  return (u && u.firma) ? u.firma : null;
}

// Registra en el historial del usuario quién y cuándo cambió la contraseña
// (usado por el cambio propio desde el topbar y por el cambio forzado al
// vencer la contraseña en el login). Los más recientes quedan primero.
function registrarCambioPassword(usuarioObj, modificadoPor) {
  const ahora = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fecha = `${pad(ahora.getDate())}/${pad(ahora.getMonth() + 1)}/${ahora.getFullYear()}`;
  const hora = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

  if (!Array.isArray(usuarioObj.historialPassword)) usuarioObj.historialPassword = [];
  usuarioObj.historialPassword.unshift({ fecha, hora, modificadoPor });
}

// =================================================
// MODELO DE PERMISOS: qué página corresponde a qué llave dentro de
// "permisos", usado tanto por permisos.js (ocultar sidebar/tabs y
// bloquear el acceso directo) como por index.js (a dónde redirigir
// tras el login según lo que el rol pueda ver).
// =================================================
const PAGINA_PERMISO = {
  'reporte-cabotaje.html':              { grupo: 'general', clave: 'inicio' },
  'alertas-documentos.html':            { grupo: 'general', clave: 'inicio' },
  'reporte-nominacion.html':            { grupo: 'general', clave: 'inicio' },
  'nominaciones.html':                  { grupo: 'general', clave: 'servicios' },
  'seguimiento-operaciones.html':       { grupo: 'general', clave: 'operaciones' },
  'distancias-horas.html':              { grupo: 'general', clave: 'operaciones' },
  'horario-buques.html':                { grupo: 'general', clave: 'operaciones' },
  'retrasos-buques.html':                { grupo: 'general', clave: 'operaciones' },
  'relaciones-portuarias.html':          { grupo: 'general', clave: 'operaciones' },
  'control-precintos.html':             { grupo: 'general', clave: 'precintos' },
  'reporte-precintos.html':             { grupo: 'general', clave: 'precintos' },
  'registro-gastos-operativos.html':    { grupo: 'general', clave: 'precintos' },
  'roles.html':                         { grupo: 'seguridad', clave: 'roles' },
  'usuarios.html':                      { grupo: 'seguridad', clave: 'usuarios' },
  'informacion-profesional.html':       { grupo: 'seguridad', clave: 'informacionProfesional' },
  'descarga-documentos.html':           { grupo: 'seguridad', clave: 'informacionProfesional' },
  'disponibilidad-personal.html':       { grupo: 'general', clave: 'operaciones' },
  'configuracion-documentos.html':      { grupo: 'mantenedores', clave: 'configuracionDocumentos' },
  'cliente.html':                       { grupo: 'mantenedores', clave: 'clientes' },
  'tablas-generales.html':              { grupo: 'mantenedores', clave: 'tablasGenerales' },
  'puertos.html':                       { grupo: 'mantenedores', clave: 'puertos' },
  'terminales.html':                    { grupo: 'mantenedores', clave: 'terminales' },
  'muelles.html':                       { grupo: 'mantenedores', clave: 'muelles' },
  'configuracion-tipo-operacion.html':  { grupo: 'mantenedores', clave: 'configuracionTipoOperacion' },
  'actividades.html':                   { grupo: 'mantenedores', clave: 'actividades' }
};

// Orden de prioridad para elegir la primera página permitida (usado para
// redirigir tras el login a un rol sin acceso a Inicio). Servicios va
// primero; luego Operaciones y, por último, las páginas de Configuración.
const ORDEN_PAGINAS_LOGIN = [
  { carpeta: 'SERVICIOS',     archivo: 'nominaciones.html' },
  { carpeta: 'OPERACIONES',   archivo: 'seguimiento-operaciones.html' },
  { carpeta: 'OPERACIONES',   archivo: 'distancias-horas.html' },
  { carpeta: 'OPERACIONES',   archivo: 'horario-buques.html' },
  { carpeta: 'OPERACIONES',   archivo: 'retrasos-buques.html' },
  { carpeta: 'OPERACIONES',   archivo: 'relaciones-portuarias.html' },
  { carpeta: 'CONFIGURACION', archivo: 'roles.html' },
  { carpeta: 'CONFIGURACION', archivo: 'usuarios.html' },
  { carpeta: 'CONFIGURACION', archivo: 'informacion-profesional.html' },
  { carpeta: 'CONFIGURACION', archivo: 'disponibilidad-personal.html' },
  { carpeta: 'CONFIGURACION', archivo: 'configuracion-documentos.html' },
  { carpeta: 'CONFIGURACION', archivo: 'cliente.html' },
  { carpeta: 'CONFIGURACION', archivo: 'puertos.html' },
  { carpeta: 'CONFIGURACION', archivo: 'terminales.html' },
  { carpeta: 'CONFIGURACION', archivo: 'muelles.html' },
  { carpeta: 'CONFIGURACION', archivo: 'configuracion-tipo-operacion.html' },
  { carpeta: 'CONFIGURACION', archivo: 'actividades.html' },
  { carpeta: 'CONFIGURACION', archivo: 'tablas-generales.html' }
];

function tienePermisoVer(rol, grupo, clave) {
  return !!(rol && rol.permisos && rol.permisos[grupo] && rol.permisos[grupo][clave] && rol.permisos[grupo][clave].ver);
}

function seccionTienePermisoVer(rol, grupo) {
  return !!(rol && rol.permisos && rol.permisos[grupo] && Object.values(rol.permisos[grupo]).some(p => p.ver));
}

function primeraPaginaPermitida(rol) {
  const pagina = ORDEN_PAGINAS_LOGIN.find(p => {
    const permiso = PAGINA_PERMISO[p.archivo];
    return permiso && tienePermisoVer(rol, permiso.grupo, permiso.clave);
  });
  return pagina ? `MODULES/${pagina.carpeta}/${pagina.archivo}` : null;
}
