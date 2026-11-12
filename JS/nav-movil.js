// =================================================
// NAV INFERIOR MÓVIL — único origen de los 4 ítems del menú inferior.
// Antes el bloque .movil-bottomnav estaba copiado en cada HTML con sets de
// iconos y tamaños mezclados (ver PROMPT_MOVIL_MENU_INFERIOR.md). Ahora cada
// página solo trae <div class="movil-bottomnav" id="movilBottomnav"></div>
// y llama a renderNavInferiorMovil('<id>') con su propio ítem activo.
// =================================================
const ITEMS_NAV_MOVIL = [
  {
    // Antes era una cuadrícula de 4 rectángulos: mucha más tinta/densidad
    // visual que los otros 3 íconos de una sola forma, se veía "más grueso"
    // aunque comparta el mismo stroke-width — un ancla (una sola forma,
    // además con mejor encaje temático para "Operaciones" portuarias) queda
    // visualmente pareja con Gastos/Reportes/Perfil.
    id: 'operaciones', href: 'operaciones-movil.html', etiqueta: 'Operaciones',
    icono: '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>'
  },
  {
    // "Gastos" → "Generar": esta pantalla es donde se GENERA/registra el
    // reporte del día (Alimentos/Movilidad); "Reportes" (otro ítem de este
    // mismo menú) es donde se VEN todos los reportes ya generados y se
    // descargan — "Reporte"/"Reportes" quedaban demasiado parecidos entre
    // sí, "Generar" distingue mejor el propósito de cada pantalla.
    // Id/href sin tocar — solo cambia la etiqueta visible.
    id: 'gastos', href: 'gastos-movil.html', etiqueta: 'Generar',
    icono: '<path d="M6 2h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2Z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/>'
  },
  {
    id: 'reportes', href: 'reportes-movil.html', etiqueta: 'Reportes',
    icono: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>'
  },
  {
    // Solo para usuarios Administrativos (ver esUsuarioAdministrativoMovil,
    // data-disponibilidad.js): el resto de usuarios no ve este ítem.
    id: 'disponibilidad', href: 'disponibilidad-movil.html', etiqueta: 'Personal', soloAdministrativo: true,
    icono: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  },
  {
    // Dashboard de Cabotaje (Inicio, web): módulo propio, solo para Administrativos.
    id: 'cabotaje', href: 'cabotaje-movil.html', etiqueta: 'Cabotaje', soloAdministrativo: true,
    icono: '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/>'
  },
  {
    // Dashboard de Nominación (Inicio, web): módulo propio, solo para Administrativos.
    id: 'nominacion', href: 'nominacion-movil.html', etiqueta: 'Nominación', soloAdministrativo: true,
    icono: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14,2 14,8 20,8"/><path d="m9 15 2 2 4-4"/>'
  },
  {
    id: 'perfil', href: 'perfil-movil.html', etiqueta: 'Perfil',
    icono: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  }
];

// "Disponibilidad del Personal", "Dashboard de Cabotaje" y "Dashboard de Nominación" son solo para usuarios Administrativos: al
// menos uno de sus roles es de categoría "Administrativo" (Configuración >
// Roles). Los roles Operativos (Inspector, Técnico, Supervisor…) no lo ven.
function esUsuarioAdministrativoMovil() {
  if (typeof obtenerUsuarioActual !== 'function') return false;
  const sesion = obtenerUsuarioActual();
  if (!sesion) return false;
  const usuario = obtenerUsuarioPorNombre(sesion.usuario);
  if (!usuario) return false;
  return obtenerIdsRolesUsuario(usuario).some(id => {
    const rol = obtenerRolPorId(id);
    return rol && (rol.categorias || []).includes('Administrativo');
  });
}

function renderNavInferiorMovil(activo) {
  const cont = document.getElementById('movilBottomnav');
  if (!cont) return;
  // "Personal" (Disponibilidad del Personal) solo lo ven los Administrativos.
  const esAdmin = typeof esUsuarioAdministrativoMovil === 'function' ? esUsuarioAdministrativoMovil() : false;
  const items = ITEMS_NAV_MOVIL.filter(it => !it.soloAdministrativo || esAdmin);
  // Con más de 5 ítems (administradores) solo el activo muestra su nombre.
  cont.classList.toggle('movil-bottomnav--compacto', items.length > 5);
  cont.innerHTML = items.map(it => `
    <a class="movil-nav-item${it.id === activo ? ' activo' : ''}" href="${it.href}" title="${it.etiqueta}" aria-label="${it.etiqueta}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${it.icono}</svg>
      ${it.etiqueta}
    </a>`).join('');
}
