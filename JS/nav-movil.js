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
    id: 'perfil', href: 'perfil-movil.html', etiqueta: 'Perfil',
    icono: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  }
];

function renderNavInferiorMovil(activo) {
  const cont = document.getElementById('movilBottomnav');
  if (!cont) return;
  cont.innerHTML = ITEMS_NAV_MOVIL.map(it => `
    <a class="movil-nav-item${it.id === activo ? ' activo' : ''}" href="${it.href}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${it.icono}</svg>
      ${it.etiqueta}
    </a>`).join('');
}
