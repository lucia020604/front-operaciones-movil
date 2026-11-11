// =================================================
// DISPONIBILIDAD-MOVIL.JS
// Módulo "Disponibilidad del Personal" de la app móvil — solo para usuarios
// Administrativos. Misma información que la página web: por operario, los
// días del mes Programados / Vacaciones / Descanso Médico / Permisos
// Especiales / Disponibles, y el calendario con el detalle de cada día.
// =================================================
function dispActualizarHora() {
  const el = document.getElementById('horaStatusBar');
  if (!el) return;
  const a = new Date();
  const pad = n => String(n).padStart(2, '0');
  el.textContent = horaA12(`${pad(a.getHours())}:${pad(a.getMinutes())}`);
}
dispActualizarHora();
setInterval(dispActualizarHora, 15000);

const dispHoy = new Date();
let dispAnio = dispHoy.getFullYear();
let dispMes = dispHoy.getMonth();
let dispCal = { id: null, anio: dispAnio, mes: dispMes, diaSel: null };
let dispEstadoFiltro = 'todos'; // 'todos' o un estado de DISP_ESTADO_LABEL (hoy)

function dispEsc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function dispRolesHtml(roles) {
  let html = `<span class="disp-rol-chip">${dispEsc(roles[0])}</span>`;
  if (roles.length > 1) html += `<span class="disp-rol-chip mas" title="${dispEsc(roles.slice(1).join(', '))}">+${roles.length - 1}</span>`;
  return html;
}

function inicializarDisponibilidadMovil() {
  if (!obtenerUsuarioActual()) { window.location.href = 'login-movil.html'; return; }
  if (!esUsuarioAdministrativoMovil()) { window.location.href = 'operaciones-movil.html'; return; }

  const rol = document.getElementById('dispRolFiltro');
  const roles = [...new Set(Object.values(DISP_PERFILES).flatMap(p => p.roles))].sort();
  rol.innerHTML = '<option value="todos">Todos los roles</option>' + roles.map(r => `<option value="${dispEsc(r)}">${dispEsc(r)}</option>`).join('');
  renderDisponibilidadMovil();
}

function dispCambiarMes(delta) {
  const d = new Date(dispAnio, dispMes + delta, 1);
  dispAnio = d.getFullYear(); dispMes = d.getMonth();
  renderDisponibilidadMovil();
}

function dispElegirEstado(clave) {
  dispEstadoFiltro = clave;
  renderDisponibilidadMovil();
}

function dispISOHoy() { return dispISO(dispHoy.getFullYear(), dispHoy.getMonth(), dispHoy.getDate()); }

function dispFiltrados() {
  const texto = document.getElementById('dispBuscar').value.trim().toLowerCase();
  const rol = document.getElementById('dispRolFiltro').value;
  const orden = document.getElementById('dispOrden').value;
  const hoyISO = dispISOHoy();

  const ids = Object.keys(DISP_PERFILES).filter(id => {
    const p = DISP_PERFILES[id];
    if (!`${p.nombre} ${p.apellido}`.toLowerCase().includes(texto)) return false;
    if (rol !== 'todos' && !p.roles.includes(rol)) return false;
    if (dispEstadoFiltro !== 'todos' && dispEstadoDia(id, hoyISO).estado !== dispEstadoFiltro) return false;
    return true;
  });

  const cuenta = id => dispContarEstadosMes(id, dispAnio, dispMes);
  const nombre = id => `${DISP_PERFILES[id].nombre} ${DISP_PERFILES[id].apellido}`;
  const porNombre = (a, b) => nombre(a).localeCompare(nombre(b), 'es');
  const clave = {
    nombre: porNombre,
    disponibles: (a, b) => cuenta(b).disponible - cuenta(a).disponible || porNombre(a, b),
    programados: (a, b) => cuenta(b).programado - cuenta(a).programado || porNombre(a, b),
    ausencias: (a, b) => {
      const aus = c => c.vacaciones + c.descanso + c.permiso;
      return aus(cuenta(b)) - aus(cuenta(a)) || porNombre(a, b);
    }
  }[orden] || porNombre;
  return ids.sort(clave);
}

function dispFiltrosActivos() {
  return !!document.getElementById('dispBuscar').value.trim()
    || document.getElementById('dispRolFiltro').value !== 'todos'
    || dispEstadoFiltro !== 'todos'
    || document.getElementById('dispOrden').value !== 'nombre';
}

function dispLimpiarFiltros() {
  document.getElementById('dispBuscar').value = '';
  document.getElementById('dispRolFiltro').value = 'todos';
  document.getElementById('dispOrden').value = 'nombre';
  dispEstadoFiltro = 'todos';
  renderDisponibilidadMovil();
}

// Chips "Estado de hoy": con el conteo de cuántos operarios hay en cada uno
// (sobre los que cumplen búsqueda y rol, para que el número sea útil).
function dispRenderChips() {
  const texto = document.getElementById('dispBuscar').value.trim().toLowerCase();
  const rol = document.getElementById('dispRolFiltro').value;
  const hoyISO = dispISOHoy();
  const base = Object.keys(DISP_PERFILES).filter(id => {
    const p = DISP_PERFILES[id];
    return `${p.nombre} ${p.apellido}`.toLowerCase().includes(texto) && (rol === 'todos' || p.roles.includes(rol));
  });
  const conteo = { todos: base.length };
  Object.keys(DISP_ESTADO_LABEL).forEach(k => { conteo[k] = base.filter(id => dispEstadoDia(id, hoyISO).estado === k).length; });

  const chip = (clave, etiqueta) => `<button type="button" class="disp-chip${dispEstadoFiltro === clave ? ' activo' : ''}" onclick="dispElegirEstado('${clave}')"${clave === 'todos' ? '' : ` style="--c:${DISP_ESTADO_COLOR[clave]}"`}>
      ${clave === 'todos' ? '' : '<i></i>'}${etiqueta}<b>${conteo[clave]}</b></button>`;
  document.getElementById('dispChipsEstado').innerHTML =
    chip('todos', 'Hoy: todos') + Object.keys(DISP_ESTADO_LABEL).map(k => chip(k, DISP_ESTADO_LABEL[k])).join('');
}

function renderDisponibilidadMovil() {
  document.getElementById('dispMesTexto').textContent = `${DISP_MESES[dispMes]} ${dispAnio}`;
  const ids = dispFiltrados();

  // Resumen del mes (de los operarios filtrados)
  const tot = { programado: 0, vacaciones: 0, descanso: 0, permiso: 0, disponible: 0 };
  ids.forEach(id => { const c = dispContarEstadosMes(id, dispAnio, dispMes); Object.keys(tot).forEach(k => tot[k] += c[k]); });
  const kpi = clave => `<div class="disp-kpi" style="--c:${DISP_ESTADO_COLOR[clave]}"><span><i></i>${DISP_ESTADO_LABEL[clave]}</span><strong>${tot[clave]}</strong></div>`;
  const diasMes = new Date(dispAnio, dispMes + 1, 0).getDate();
  document.getElementById('dispResumen').innerHTML =
    `<div class="disp-kpi-total"><strong>${ids.length}</strong><span>operario${ids.length === 1 ? '' : 's'} · ${diasMes} días</span></div>` +
    `<div class="disp-kpis">${['disponible', 'programado', 'vacaciones', 'descanso', 'permiso'].map(kpi).join('')}</div>`;

  dispRenderChips();
  const lista = document.getElementById('dispLista');
  document.getElementById('dispContador').textContent = `${ids.length} operario${ids.length === 1 ? '' : 's'}`;
  document.getElementById('dispLimpiar').style.display = dispFiltrosActivos() ? '' : 'none';
  if (!ids.length) {
    lista.innerHTML = `<p class="submodulo-tabla-vacio">No se encontraron operarios con los filtros aplicados.</p>
      <button type="button" class="btn-accion btn-cancelar" style="width:100%;margin-top:8px;" onclick="dispLimpiarFiltros()">Limpiar filtros</button>`;
    return;
  }

  const hoyISO = dispISOHoy();
  lista.innerHTML = ids.map(id => {
    const p = DISP_PERFILES[id];
    const c = dispContarEstadosMes(id, dispAnio, dispMes);
    const iniciales = (p.nombre[0] + p.apellido[0]).toUpperCase();
    const hoy = dispEstadoDia(id, hoyISO).estado;
    const orden = ['programado', 'vacaciones', 'descanso', 'permiso', 'disponible'];
    const barra = orden.filter(k => c[k]).map(k => `<span style="flex:${c[k]};background:${DISP_ESTADO_COLOR[k]}" title="${DISP_ESTADO_LABEL[k]}: ${c[k]}"></span>`).join('');
    const cel = (clave, etiqueta) => `<div class="disp-conteo"><strong style="color:${DISP_ESTADO_COLOR[clave]}">${c[clave]}</strong><span>${etiqueta}</span></div>`;
    return `
      <div class="disp-operario">
        <div class="disp-operario-cab">
          <span class="disp-avatar">${iniciales}</span>
          <div class="disp-operario-id">
            <div class="disp-nombre">${dispEsc(p.nombre)} ${dispEsc(p.apellido)}</div>
            <div class="disp-roles">${dispRolesHtml(p.roles)}<span class="disp-hoy" style="--c:${DISP_ESTADO_COLOR[hoy]}"><i></i>Hoy: ${DISP_ESTADO_LABEL[hoy]}</span></div>
          </div>
        </div>
        <div class="disp-barra" aria-hidden="true">${barra}</div>
        <div class="disp-conteos">
          ${cel('programado', 'Programados')}${cel('vacaciones', 'Vacaciones')}${cel('descanso', 'Desc. médico')}${cel('permiso', 'Permisos')}${cel('disponible', 'Disponibles')}
        </div>
        <button type="button" class="btn-accion btn-cancelar disp-btn-cal" onclick="abrirCalendarioDisp('${id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
          Ver calendario
        </button>
      </div>`;
  }).join('');
}

// ---------- Calendario de un operario (modal) ----------
function abrirCalendarioDisp(id) {
  dispCal = { id, anio: dispAnio, mes: dispMes, diaSel: null };
  const hoy = dispHoy;
  if (hoy.getFullYear() === dispAnio && hoy.getMonth() === dispMes) dispCal.diaSel = hoy.getDate();
  renderCalendarioDisp();
  abrirModal('modalCalendarioDisp');
}

function dispCalCambiarMes(delta) {
  const d = new Date(dispCal.anio, dispCal.mes + delta, 1);
  dispCal.anio = d.getFullYear(); dispCal.mes = d.getMonth(); dispCal.diaSel = null;
  renderCalendarioDisp();
}

function dispCalElegirDia(dia) {
  dispCal.diaSel = dia;
  renderCalendarioDisp();
}

function renderCalendarioDisp() {
  const { id, anio, mes, diaSel } = dispCal;
  const p = DISP_PERFILES[id];
  document.getElementById('dispCalNombre').textContent = `${p.nombre} ${p.apellido}`;
  document.getElementById('dispCalMes').textContent = `${DISP_MESES[mes]} ${anio}`;

  const total = new Date(anio, mes + 1, 0).getDate();
  const offset = (new Date(anio, mes, 1).getDay() + 6) % 7; // lunes = 0
  const hoyISO = dispISO(dispHoy.getFullYear(), dispHoy.getMonth(), dispHoy.getDate());
  let celdas = DISP_DIAS_SEMANA.map(d => `<span class="disp-cal-dow">${d}</span>`).join('');
  celdas += '<span></span>'.repeat(offset);
  for (let d = 1; d <= total; d++) {
    const iso = dispISO(anio, mes, d);
    const e = dispEstadoDia(id, iso).estado;
    celdas += `<button type="button" class="disp-cal-dia${d === diaSel ? ' sel' : ''}${iso === hoyISO ? ' hoy' : ''}" style="--c:${DISP_ESTADO_COLOR[e]}" onclick="dispCalElegirDia(${d})">${d}</button>`;
  }
  document.getElementById('dispCalGrid').innerHTML = celdas;

  const c = dispContarEstadosMes(id, anio, mes);
  document.getElementById('dispCalLeyenda').innerHTML = Object.keys(DISP_ESTADO_LABEL)
    .map(k => `<span class="disp-leyenda-item"><i style="background:${DISP_ESTADO_COLOR[k]}"></i>${DISP_ESTADO_LABEL[k]} (${c[k]})</span>`).join('');

  const det = document.getElementById('dispCalDetalle');
  if (!diaSel) { det.innerHTML = '<p class="disp-cal-ayuda">Toca un día para ver el detalle.</p>'; return; }
  const iso = dispISO(anio, mes, diaSel);
  const r = dispEstadoDia(id, iso);
  const fila = (k, v) => v ? `<div class="disp-det-fila"><span>${k}</span><strong>${dispEsc(v)}</strong></div>` : '';
  const a = r.asignacion;
  det.innerHTML = `
    <div class="disp-det-cab"><span>${dispFormatearFecha(iso)}</span><span class="disp-det-estado" style="--c:${DISP_ESTADO_COLOR[r.estado]}">${DISP_ESTADO_LABEL[r.estado]}</span></div>
    ${fila('Periodo', r.detalle)}
    ${fila('Motivo', r.motivo)}
    ${a ? fila('Proyecto', a.proyecto) + fila('Horario', a.horario) + fila('Supervisor', a.supervisor) + fila('Observaciones', a.observaciones) : ''}`;
}
