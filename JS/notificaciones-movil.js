// =================================================
// NOTIFICACIONES DEL INSPECTOR (app móvil) — misma estructura que la campana
// del sistema web (main.js: notifAgregar / notifUpsertar / paneles con
// pestañas Todas / No leídas, avisos grupales con "Ver detalle"), pero
// guardadas POR USUARIO: la lista del web es una sola para todos, acá cada
// inspector ve solo lo suyo. Dos orígenes:
//   · Operación asignada  → aviso puntual (id por operación, no se repite).
//   · Reporte olvidado    → aviso grupal "en vivo": días con Alimentos y/o
//                           Movilidad sin registrar, dentro del plazo máximo
//                           de Configuración de gastos (se actualiza en el
//                           lugar y desaparece cuando ya no queda nada).
// La campana vive en el encabezado de cada pantalla principal y lleva a la
// pantalla completa "Notificaciones" (notificaciones-movil.html) — no es un
// modal. Al tocar un aviso se va directo a donde hay que actuar.
// =================================================
const NOTIF_MOVIL_MAX = 50;
let NOTIF_MOVIL_USUARIO = null;
let notifMovilFiltro = 'todas';

function notifMovilClave() { return `notificacionesMovil_${NOTIF_MOVIL_USUARIO}`; }

function notifMovilCargar() {
  try { return JSON.parse(localStorage.getItem(notifMovilClave()) || '[]'); } catch (e) { return []; }
}

function notifMovilGuardar(lista) {
  try { localStorage.setItem(notifMovilClave(), JSON.stringify(lista.slice(0, NOTIF_MOVIL_MAX))); } catch (e) { /* sin espacio: se ignora */ }
}

// Aviso puntual: si ya existe uno con ese id no se duplica. Devuelve true si
// se creó.
function notifMovilAgregar({ id, tipo, prioridad = 'info', titulo, mensaje, url = '', items = null, creada = null }) {
  const lista = notifMovilCargar();
  if (lista.some(n => n.id === id)) return false;
  lista.unshift({ id, tipo, prioridad, titulo, mensaje, url, items, creada: creada || new Date().toISOString(), leida: false });
  notifMovilGuardar(lista);
  return true;
}

// Aviso grupal que resume un estado cambiante: se crea o se actualiza en el
// lugar; si cambió el título o el mensaje vuelve a quedar sin leer.
// Devuelve true si hay información nueva (creada o cambiada).
function notifMovilUpsertar({ id, tipo, prioridad = 'info', titulo, mensaje, url = '', items = null }) {
  const lista = notifMovilCargar();
  const existente = lista.find(n => n.id === id);
  let nuevo = false;
  if (existente) {
    const cambio = existente.titulo !== titulo || existente.mensaje !== mensaje;
    Object.assign(existente, { tipo, prioridad, titulo, mensaje, url, items });
    if (cambio) { existente.leida = false; existente.creada = new Date().toISOString(); nuevo = true; }
  } else {
    lista.unshift({ id, tipo, prioridad, titulo, mensaje, url, items, creada: new Date().toISOString(), leida: false });
    nuevo = true;
  }
  notifMovilGuardar(lista);
  return nuevo;
}

function notifMovilEliminar(id) {
  const lista = notifMovilCargar();
  const filtrada = lista.filter(n => n.id !== id);
  if (filtrada.length !== lista.length) notifMovilGuardar(filtrada);
}

function notifMovilMarcarLeida(id) {
  const lista = notifMovilCargar();
  const n = lista.find(x => x.id === id);
  if (!n || n.leida) return;
  n.leida = true;
  notifMovilGuardar(lista);
}

function notifMovilMarcarTodas() {
  const lista = notifMovilCargar();
  lista.forEach(n => { n.leida = true; });
  notifMovilGuardar(lista);
  notifMovilRender();
}

function notifMovilDescartar(id, event) {
  event.stopPropagation();
  notifMovilGuardar(notifMovilCargar().filter(n => n.id !== id));
  notifMovilRender();
}

function notifMovilCambiarFiltro(filtro) {
  notifMovilFiltro = filtro;
  notifMovilRender();
}

// ---------------------------------------------------------------- generación
const TIPO_OPERACION_NOTIF = { Loading: 'Carga', Discharging: 'Descarga' };

function notifMovilTextoFechaHora(fecha) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)} ${horaA12(`${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`)}`;
}

// Revisa el estado actual del inspector y suma/actualiza sus avisos. Si hubo
// algo nuevo y la pantalla tiene banner de push (Operaciones), lo muestra.
function notifMovilGenerar() {
  if (!NOTIF_MOVIL_USUARIO) return;
  const usuario = NOTIF_MOVIL_USUARIO;
  let primeroNuevo = null;

  // 1) Operaciones asignadas
  const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(usuario) : [];
  operaciones.forEach(op => {
    const ubicacion = [op.puerto, op.terminal, op.muelle].filter(Boolean).join(' · ');
    const creado = notifMovilUpsertar({
      id: `asignada-${op.codigo}`, tipo: 'operacion_asignada', prioridad: 'info',
      titulo: 'Nueva operación asignada',
      mensaje: `${TIPO_OPERACION_NOTIF[op.operacion] || op.operacion} · ${op.cliente} · ${op.per}${ubicacion ? '. ' + ubicacion : ''}`,
      url: 'operaciones-movil.html'
    });
    if (creado && !primeroNuevo) primeroNuevo = { app: 'Operaciones', titulo: 'Nueva operación asignada', cuerpo: `${op.per} · ${op.cliente}${ubicacion ? ' (' + ubicacion + ')' : ''}` };
  });

  // 2) Reportes olvidados (Alimentos y/o Movilidad sin registrar)
  const activo = typeof CONFIG_JORNADA_DEMO !== 'undefined' && CONFIG_JORNADA_DEMO.recordatorioOlvidosActivo;
  const comidas = activo && typeof obtenerComidasOlvidadasOperador === 'function' ? obtenerComidasOlvidadasOperador(usuario) : [];
  const noGenerados = activo && typeof obtenerReportesNoGeneradosOperador === 'function' ? obtenerReportesNoGeneradosOperador(usuario) : [];

  const porDia = {};
  const dia = (fechaISO, fecha) => porDia[fechaISO] || (porDia[fechaISO] = { fechaISO, fecha, partes: [], alimentos: false, movilidad: false });
  comidas.forEach(d => {
    const x = dia(d.fechaISO, d.fecha);
    x.alimentos = true;
    x.partes.push(`Alimentos: faltan ${d.comidas.join(', ')}`);
  });
  noGenerados.forEach(a => {
    const d = dia(a.fechaISO, a.fecha);
    if (a.tipo === 'Alimentos') {
      if (d.alimentos) return;
      d.alimentos = true;
    } else {
      d.movilidad = true;
    }
    d.partes.push(`${a.tipo} sin registrar`);
  });

  // El primero en vencer es el día más antiguo: el aviso lleva directo al
  // formulario de ese día (Alimentos si le faltan comidas, si no Movilidad).
  const dias = Object.values(porDia).sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));
  if (!dias.length) {
    notifMovilEliminar('reportes-pendientes');
  } else {
    const plazoH = CONFIG_JORNADA_DEMO.plazoOlvidoHoras;
    const d = dias[0];
    const j = JORNADAS_MOVIL_DEMO[`${usuario}_${d.fechaISO}`];
    const vence = j && j.fin ? ` Vence ${notifMovilTextoFechaHora(new Date(new Date(j.fin.fechaHoraISO).getTime() + plazoH * 3600000))}.` : '';
    const mensaje = dias.length === 1
      ? `Jornada del ${d.fecha} — ${d.partes.join(' · ')}.${vence}`
      : `Empieza por la jornada del ${d.fecha} — ${d.partes.join(' · ')}.${vence} Tienes ${dias.length - 1} más.`;
    const cambio = notifMovilUpsertar({
      id: 'reportes-pendientes', tipo: 'reporte_pendiente', prioridad: 'por_vencer',
      titulo: `${dias.length} ${dias.length === 1 ? 'día' : 'días'} con reporte pendiente`,
      mensaje,
      url: `gastos-movil.html?olvido=${d.fechaISO}&tipo=${d.alimentos ? 'Alimentos' : 'Movilidad'}`,
      items: null
    });
    if (cambio && !primeroNuevo) primeroNuevo = { app: 'Gastos Operativos', titulo: 'Reporte pendiente', cuerpo: `${dias.length === 1 ? '1 día' : dias.length + ' días'} sin completar. Toca para llenarlo.` };
  }

  notifMovilRenderBadge();
  if (primeroNuevo) notifMovilPush(primeroNuevo);
  notifMovilRender();
}

// Banner de push simulado (solo en pantallas que lo traen, hoy Operaciones):
// muestra cómo llega el aviso al celular en tiempo real.
let notifMovilPushTimeout = null;
function notifMovilPush({ app, titulo, cuerpo }) {
  const banner = document.getElementById('pushSimBanner');
  if (!banner) return;
  const el = id => document.getElementById(id);
  const appEl = banner.querySelector('.push-sim-banner-app');
  if (appEl) appEl.textContent = app;
  el('pushSimTitulo').textContent = titulo;
  el('pushSimCuerpo').textContent = cuerpo;
  el('pushSimHora').textContent = 'ahora';
  banner.classList.remove('push-sim-banner--visible');
  void banner.offsetWidth; // reinicia la animación si ya estaba visible
  banner.classList.add('push-sim-banner--visible');
  clearTimeout(notifMovilPushTimeout);
  notifMovilPushTimeout = setTimeout(() => banner.classList.remove('push-sim-banner--visible'), 4500);
}

// ---------------------------------------------------------------- interfaz
function notifMovilRenderBadge() {
  const sinLeer = notifMovilCargar().filter(n => !n.leida).length;
  const badge = document.getElementById('movilNotifBadge');
  if (badge) {
    badge.textContent = sinLeer > 9 ? '9+' : String(sinLeer);
    badge.style.display = sinLeer ? 'flex' : 'none';
  }
  return sinLeer;
}

function notifMovilRender() {
  const lista = notifMovilCargar();
  const sinLeer = notifMovilRenderBadge();

  const contador = document.getElementById('notifMovilContador');
  if (contador) contador.textContent = sinLeer ? `(${sinLeer} sin leer)` : '';
  const marcar = document.getElementById('notifMovilMarcarTodas');
  if (marcar) marcar.style.display = sinLeer ? '' : 'none';
  document.querySelectorAll('.notif-panel-tab').forEach(tab => {
    tab.classList.toggle('activa', tab.dataset.filtro === notifMovilFiltro);
  });

  const body = document.getElementById('notifMovilBody');
  if (!body) return;
  const visibles = notifMovilFiltro === 'no_leidas' ? lista.filter(n => !n.leida) : lista;
  body.innerHTML = visibles.length
    ? visibles.map(n => `
      <div class="notif-item notif-item-${n.prioridad} ${n.leida ? '' : 'notif-item-sinleer'}" onclick="notifMovilAbrir('${n.id}')">
        <span class="notif-item-icono">${NOTIF_ICONOS[n.prioridad] || NOTIF_ICONOS.info}</span>
        <div class="notif-item-texto">
          <strong>${n.titulo}</strong>
          <p>${n.mensaje}</p>
          <span class="notif-item-hora">${notifTiempoRelativo(n.creada)}</span>
        </div>
        ${n.leida ? '' : '<span class="notif-item-punto"></span>'}
        <button type="button" class="notif-item-descartar" title="Descartar" onclick="notifMovilDescartar('${n.id}', event)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>`).join('')
    : `<div class="notif-panel-vacio">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>
        <p>${notifMovilFiltro === 'no_leidas' ? 'No tienes notificaciones sin leer.' : 'No tienes notificaciones.'}</p>
      </div>`;
}

function abrirNotificacionesMovil() {
  window.location.href = 'notificaciones-movil.html';
}

// Click en una notificación: la marca como leída y lleva directo a donde se
// debe actuar (la operación asignada, o el formulario del reporte pendiente).
function notifMovilAbrir(id) {
  const n = notifMovilCargar().find(x => x.id === id);
  if (!n) return;
  notifMovilMarcarLeida(id);
  if (n.url) window.location.href = n.url;
  else notifMovilRender();
}

// Flecha del encabezado de la pantalla: vuelve a la pantalla anterior.
function notifMovilAtras() {
  if (document.referrer && history.length > 1) history.back();
  else window.location.href = 'operaciones-movil.html';
}

function notifMovilInicializar() {
  const sesion = typeof obtenerUsuarioActual === 'function' ? obtenerUsuarioActual() : null;
  if (!sesion) return;
  NOTIF_MOVIL_USUARIO = sesion.usuario;

  const esPantallaNotificaciones = !!document.getElementById('notifMovilBody');
  const fila = document.querySelector('.movil-header-fila');

  // Campana del encabezado (en Operaciones ya existía la de la simulación
  // de push: se reutiliza y pasa a abrir la pantalla de notificaciones).
  if (!esPantallaNotificaciones && fila) {
    let btn = fila.querySelector('.movil-header-campana-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'movil-header-campana-btn';
      fila.appendChild(btn);
    }
    btn.removeAttribute('onclick');
    btn.onclick = abrirNotificacionesMovil;
    btn.title = 'Notificaciones';
    btn.setAttribute('aria-label', 'Notificaciones');
    btn.classList.add('movil-campana-notif');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      <span class="movil-notif-badge" id="movilNotifBadge" style="display:none;"></span>`;
  }

  notifMovilGenerar();
  if (esPantallaNotificaciones) notifMovilRender();
  setInterval(notifMovilGenerar, 60000);
  window.addEventListener('storage', e => { if (e.key === notifMovilClave()) { notifMovilRenderBadge(); notifMovilRender(); } });
}

document.addEventListener('DOMContentLoaded', notifMovilInicializar);
