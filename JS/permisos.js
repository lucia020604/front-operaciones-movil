// =================================================
// PERMISOS.JS
// Oculta, en cada página, las opciones de sidebar/topbar y el acceso
// directo a páginas para las que el rol de la sesión actual no tenga
// permiso "ver". Requiere que data-usuarios.js esté cargado antes
// (define PAGINA_PERMISO, tienePermisoVer y seccionTienePermisoVer).
// =================================================

// Relaciona cada tab del topbar con su permiso: "grupo" se oculta si
// ninguna opción de esa sección tiene "ver"; "clave" se oculta si esa
// llave puntual dentro de "general" no tiene "ver".
const TAB_PERMISO = {
  'Seguridad':    { tipo: 'grupo', grupo: 'seguridad' },
  'Mantenedores': { tipo: 'grupo', grupo: 'mantenedores' },
  'Inicio':       { tipo: 'clave', grupo: 'general', clave: 'inicio' },
  'Servicios':    { tipo: 'clave', grupo: 'general', clave: 'servicios' },
  'Operaciones':  { tipo: 'clave', grupo: 'general', clave: 'operaciones' },
  'Precintos':    { tipo: 'clave', grupo: 'general', clave: 'precintos' },
  'Reportes':     { tipo: 'clave', grupo: 'general', clave: 'reportes' }
};

function aplicarRestriccionesPorRol() {
  const sesion = obtenerUsuarioActual();

  if (!sesion) {
    window.location.href = '../../index.html';
    return;
  }

  const rol = obtenerRolPorId(sesion.rolId);

  // Oculta cada opción del sidebar sin permiso de "ver"
  document.querySelectorAll('.sidebar-menu .sidebar-link').forEach(link => {
    const archivo = link.getAttribute('href').split('/').pop();
    const permiso = PAGINA_PERMISO[archivo];
    if (permiso && !tienePermisoVer(rol, permiso.grupo, permiso.clave)) {
      link.closest('.sidebar-item').style.display = 'none';
    }
  });

  // Oculta cada tab del topbar sin permiso de "ver"
  document.querySelectorAll('.topbar-nav .nav-item').forEach(tab => {
    const permiso = TAB_PERMISO[tab.textContent.trim()];
    if (!permiso) return;
    const visible = permiso.tipo === 'grupo'
      ? seccionTienePermisoVer(rol, permiso.grupo)
      : tienePermisoVer(rol, permiso.grupo, permiso.clave);
    if (!visible) tab.style.display = 'none';
  });

  // Si la página actual no tiene permiso de "ver", redirige
  const archivoActual = window.location.pathname.split('/').pop();
  const permisoActual = PAGINA_PERMISO[archivoActual];
  if (permisoActual && !tienePermisoVer(rol, permisoActual.grupo, permisoActual.clave)) {
    mostrarToast('No tienes permiso para acceder a esta sección');
    setTimeout(() => { window.location.href = '../../index.html'; }, 600);
  }
}

document.addEventListener('DOMContentLoaded', aplicarRestriccionesPorRol);
