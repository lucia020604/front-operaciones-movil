// =================================================
// SIDEBAR TOGGLE (pinned) — persiste entre páginas
// =================================================
const toggleBtn = document.getElementById('toggleSidebar');
const sidebar   = document.getElementById('sidebar');
const layoutEl  = document.querySelector('.layout');

function aplicarPinned(activo) {
  sidebar.classList.toggle('pinned', activo);
  layoutEl.classList.toggle('pinned', activo);
}

if (toggleBtn && sidebar && layoutEl) {
  // Aplica el estado guardado SIN animación al cargar la página
  sidebar.classList.add('no-transition');
  aplicarPinned(localStorage.getItem('sidebarPinned') === 'true');
  // Reactiva la transición en el siguiente frame para futuros toggles
  requestAnimationFrame(() => {
    sidebar.classList.remove('no-transition');
  });

  toggleBtn.addEventListener('click', () => {
    const nuevoEstado = !sidebar.classList.contains('pinned');
    aplicarPinned(nuevoEstado);
    localStorage.setItem('sidebarPinned', nuevoEstado);
  });
}

// =================================================
// SESIÓN: muestra en la barra superior al usuario que inició sesión
// =================================================
function renderSesionUsuario() {
  if (typeof obtenerUsuarioActual !== 'function') return;
  const sesion = obtenerUsuarioActual();
  if (!sesion) return;

  const avatarEl = document.querySelector('.user-info .avatar');
  const nombreEl = document.querySelector('.user-info .user-name');
  const iniciales = (sesion.nombre.charAt(0) + sesion.apellido.charAt(0)).toUpperCase();

  if (avatarEl) avatarEl.textContent = iniciales;
  if (nombreEl) nombreEl.textContent = `${sesion.nombre} ${sesion.apellido.charAt(0)}.`;
}

document.addEventListener('DOMContentLoaded', renderSesionUsuario);

function cerrarSesion() {
  sessionStorage.removeItem('sesionUsuario');
}

// =================================================
// MENÚ DE USUARIO (desplegable: Configuración / Cerrar sesión)
// =================================================
const userMenu = document.getElementById('userMenu');
const userMenuToggle = document.getElementById('userMenuToggle');

if (userMenu && userMenuToggle) {
  userMenuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (userMenu.classList.contains('open') && !userMenu.contains(e.target)) {
      userMenu.classList.remove('open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') userMenu.classList.remove('open');
  });
}

// =================================================
// NOTIFICACIONES (campana del topbar) — estándar único para todo el
// sistema: cualquier módulo suma sus avisos con notifAgregar(...) sin
// tocar este archivo ni la campana. Se guardan en localStorage (main.js se
// carga en todas las páginas, así que se ven igual sin importar desde
// dónde se generaron) y quedan ordenadas de más reciente a más antigua.
// Por ahora el único generador activo es el de Operaciones (reporte
// pendiente, ver seguimiento-operaciones.js), pero cualquier otro módulo
// puede sumarse después reutilizando exactamente esta misma API.
// =================================================
const NOTIF_STORAGE_KEY = 'notificacionesSistema';
const NOTIF_MAX_GUARDADAS = 50;

function notifCargarTodas() {
  const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function notifGuardarTodas(lista) {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(lista.slice(0, NOTIF_MAX_GUARDADAS)));
}

// "id" lo arma quien genera la notificación. Para un aviso puntual (ej. un
// evento único) conviene un id por evento — si ya existe uno igual no se
// duplica. Para un aviso "en vivo" que resume un estado que cambia (ej.
// "3 operaciones por vencer") conviene un id fijo por categoría (no por
// día ni por operación) y usar notifUpsertar en vez de este, así se
// actualiza en el lugar en vez de acumular una fila por cada refresco.
// "prioridad" es el estándar visual (icono/color) del panel: 'info' (azul,
// por defecto), 'por_vencer' (amarillo) y 'vencido' (rojo) cubren lo que
// necesita Operaciones hoy; un módulo nuevo puede sumar otro valor propio
// agregando su propio ícono/color en NOTIF_ICONOS sin tocar el resto.
// "items" es opcional: una lista de { titulo, subtitulo, url } — si viene,
// la notificación se comporta como grupal y el click abre un modal con el
// detalle de cada elemento en vez de navegar directo (ver notifAbrirDetalle).
function notifAgregar({ id, tipo, prioridad = 'info', titulo, mensaje, url = '', items = null }) {
  const lista = notifCargarTodas();
  if (lista.some(n => n.id === id)) return false;

  lista.unshift({ id, tipo, prioridad, titulo, mensaje, url, items, creada: new Date().toISOString(), leida: false });
  notifGuardarTodas(lista);
  notifRenderPanel();
  return true;
}

// Crea la notificación si no existe, o la actualiza "en el lugar" (misma
// posición, mismo id) si ya existía — pensado para avisos grupales que se
// recalculan en cada carga de página (ej. "cuántas operaciones vencidas
// hay ahora mismo"). Si el título o el mensaje cambiaron respecto a la
// versión guardada, vuelve a quedar sin leer porque hay información nueva
// que mostrar; si no cambió nada, se deja como estaba (leída o no).
function notifUpsertar({ id, tipo, prioridad = 'info', titulo, mensaje, url = '', items = null }) {
  const lista = notifCargarTodas();
  const existente = lista.find(n => n.id === id);
  if (existente) {
    const cambio = existente.titulo !== titulo || existente.mensaje !== mensaje;
    Object.assign(existente, { tipo, prioridad, titulo, mensaje, url, items, creada: new Date().toISOString() });
    if (cambio) existente.leida = false;
  } else {
    lista.unshift({ id, tipo, prioridad, titulo, mensaje, url, items, creada: new Date().toISOString(), leida: false });
  }
  notifGuardarTodas(lista);
  notifRenderPanel();
}

// Para cuando un aviso grupal deja de aplicar (ej. ya no queda ninguna
// operación vencida) — el generador la retira en vez de dejarla en 0.
function notifEliminar(id) {
  const lista = notifCargarTodas();
  const filtrada = lista.filter(n => n.id !== id);
  if (filtrada.length === lista.length) return;
  notifGuardarTodas(filtrada);
  notifRenderPanel();
}

// Utilidad de limpieza: saca todas las notificaciones de un "tipo" dado —
// pensada para cuando un módulo cambia la forma de sus avisos (ej. de una
// notificación por operación a una agrupada) y necesita retirar el rastro
// de la versión anterior de una sola vez, sin conocer los ids puntuales.
function notifEliminarPorTipo(tipo) {
  const lista = notifCargarTodas();
  const filtrada = lista.filter(n => n.tipo !== tipo);
  if (filtrada.length === lista.length) return;
  notifGuardarTodas(filtrada);
  notifRenderPanel();
}

function notifMarcarLeida(id) {
  const lista = notifCargarTodas();
  const n = lista.find(x => x.id === id);
  if (!n || n.leida) return;
  n.leida = true;
  notifGuardarTodas(lista);
  notifRenderPanel();
}

function notifMarcarTodasLeidas() {
  const lista = notifCargarTodas();
  let cambios = false;
  lista.forEach(n => { if (!n.leida) { n.leida = true; cambios = true; } });
  if (cambios) notifGuardarTodas(lista);
  notifRenderPanel();
}

// Handler único al hacer click en una fila del panel: si trae "items"
// (aviso grupal) abre el modal de detalle con la lista completa; si no,
// se comporta como un aviso puntual de siempre (navega a "url" si tiene).
// En ambos casos queda marcada como leída.
function notifAbrirDetalle(id) {
  const n = notifCargarTodas().find(x => x.id === id);
  if (!n) return;
  notifMarcarLeida(id);

  if (n.items && n.items.length) {
    notifMostrarModalDetalle(n);
    return;
  }
  if (n.url) window.location.href = n.url;
}

function notifMostrarModalDetalle(n) {
  let modal = document.getElementById('modalNotifDetalle');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalNotifDetalle';
    modal.innerHTML = `
      <div class="modal modal-sm notif-detalle-modal">
        <div class="modal-header notif-detalle-header">
          <div class="notif-detalle-header-izq">
            <div class="notif-detalle-header-icono" id="notifDetalleIcono"></div>
            <div class="notif-detalle-header-texto">
              <h2 class="modal-title" id="notifDetalleTitulo">Detalle</h2>
              <p id="notifDetalleMensaje"></p>
            </div>
          </div>
          <button class="modal-close" onclick="cerrarModal('modalNotifDetalle')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body notif-detalle-body">
          <div class="notif-detalle-lista" id="notifDetalleLista"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" onclick="cerrarModal('modalNotifDetalle')">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  const modalCard = modal.querySelector('.notif-detalle-modal');
  modalCard.className = `modal modal-sm notif-detalle-modal notif-detalle-modal-${n.prioridad}`;

  document.getElementById('notifDetalleIcono').innerHTML = NOTIF_ICONOS[n.prioridad] || NOTIF_ICONOS.info;
  document.getElementById('notifDetalleTitulo').textContent = n.titulo;
  document.getElementById('notifDetalleMensaje').textContent = n.mensaje || '';
  document.getElementById('notifDetalleLista').innerHTML = n.items.map(it => `
    <a class="notif-detalle-item" href="${it.url || '#'}">
      <span class="notif-detalle-item-icono">${NOTIF_ICONOS[n.prioridad] || NOTIF_ICONOS.info}</span>
      <div class="notif-detalle-item-texto">
        <strong>${it.titulo}</strong>
        ${it.subtitulo ? `<p>${it.subtitulo}</p>` : ''}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
    </a>
  `).join('');

  abrirModal('modalNotifDetalle');
}

// Descartar es independiente de "leída": saca la notificación de la lista
// sin navegar a ningún lado (por eso stopPropagation, ya que el botón vive
// dentro de la fila clickeable). No pide confirmación porque no borra nada
// más que este aviso puntual — el registro que lo originó (ej. la
// operación) no se toca.
function notifDescartar(id, event) {
  event.stopPropagation();
  const lista = notifCargarTodas().filter(n => n.id !== id);
  notifGuardarTodas(lista);
  notifRenderPanel();
}

function notifTiempoRelativo(iso) {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos}min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas}h`;
  return `hace ${Math.floor(horas / 24)}d`;
}

const NOTIF_ICONOS = {
  vencido: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  por_vencer: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
};

// 'todas' | 'no_leidas' — la pestaña activa del panel, vive en memoria (no
// hace falta persistirla: cada vez que se abre la campana tiene sentido
// arrancar mostrando todo).
let notifFiltroActual = 'todas';

function notifCambiarFiltro(filtro) {
  notifFiltroActual = filtro;
  notifRenderPanel();
}

function notifRenderPanel() {
  const lista = notifCargarTodas();
  const sinLeer = lista.filter(n => !n.leida).length;

  const badge = document.querySelector('.notif-menu .notif-dot');
  if (badge) {
    badge.textContent = sinLeer > 9 ? '9+' : String(sinLeer);
    badge.style.display = sinLeer ? 'flex' : 'none';
  }

  const contadorHeader = document.getElementById('notifPanelContador');
  if (contadorHeader) contadorHeader.textContent = sinLeer ? `(${sinLeer} sin leer)` : '';

  const btnMarcarTodas = document.getElementById('notifPanelMarcarTodas');
  if (btnMarcarTodas) btnMarcarTodas.style.display = sinLeer ? '' : 'none';

  document.querySelectorAll('.notif-panel-tab').forEach(tab => {
    tab.classList.toggle('activa', tab.dataset.filtro === notifFiltroActual);
  });

  const visibles = notifFiltroActual === 'no_leidas' ? lista.filter(n => !n.leida) : lista;

  const body = document.getElementById('notifPanelBody');
  if (!body) return;

  body.innerHTML = visibles.length
    ? visibles.map(n => `
      <div class="notif-item notif-item-${n.prioridad} ${n.leida ? '' : 'notif-item-sinleer'}" onclick="notifAbrirDetalle('${n.id}')">
        <span class="notif-item-icono">${NOTIF_ICONOS[n.prioridad] || NOTIF_ICONOS.info}</span>
        <div class="notif-item-texto">
          <strong>${n.titulo}</strong>
          <p>${n.mensaje}</p>
          <span class="notif-item-hora">${notifTiempoRelativo(n.creada)}</span>
          ${n.items && n.items.length ? '<span class="notif-item-grupo">Ver detalle</span>' : ''}
        </div>
        ${n.leida ? '' : '<span class="notif-item-punto"></span>'}
        <button type="button" class="notif-item-descartar" title="Descartar" onclick="notifDescartar('${n.id}', event)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    `).join('')
    : `<div class="notif-panel-vacio">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>
        <p>${notifFiltroActual === 'no_leidas' ? 'No tienes notificaciones sin leer.' : 'No tienes notificaciones.'}</p>
      </div>`;
}

// La campana (icon-btn con el ícono de campana en topbar-right) ya existe
// igual en el HTML de todas las páginas — acá se le agrega el panel
// desplegable en vivo, envolviéndola en un contenedor propio, en vez de
// tener que editar el topbar de cada módulo por separado.
function inicializarCampanaNotificaciones() {
  const btnCampana = document.querySelector('.topbar-right .icon-btn');
  if (!btnCampana || btnCampana.dataset.notifInit) return;
  btnCampana.dataset.notifInit = '1';

  const contenedor = document.createElement('div');
  contenedor.className = 'notif-menu';
  btnCampana.parentNode.insertBefore(contenedor, btnCampana);
  contenedor.appendChild(btnCampana);

  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-panel-header">
      <div class="notif-panel-titulo">
        <span>Notificaciones</span>
        <span class="notif-panel-contador" id="notifPanelContador"></span>
      </div>
      <button type="button" id="notifPanelMarcarTodas" onclick="notifMarcarTodasLeidas()">Marcar todas como leídas</button>
    </div>
    <div class="notif-panel-tabs">
      <button type="button" class="notif-panel-tab activa" data-filtro="todas" onclick="notifCambiarFiltro('todas')">Todas</button>
      <button type="button" class="notif-panel-tab" data-filtro="no_leidas" onclick="notifCambiarFiltro('no_leidas')">No leídas</button>
    </div>
    <div class="notif-panel-body" id="notifPanelBody"></div>
  `;
  contenedor.appendChild(panel);

  btnCampana.addEventListener('click', (e) => {
    e.stopPropagation();
    const abriendo = !contenedor.classList.contains('open');
    contenedor.classList.toggle('open');
    if (abriendo) {
      notifFiltroActual = 'todas';
      notifRenderPanel();
    }
  });

  document.addEventListener('click', (e) => {
    if (contenedor.classList.contains('open') && !contenedor.contains(e.target)) {
      contenedor.classList.remove('open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') contenedor.classList.remove('open');
  });

  // Mientras el panel está abierto, refresca el "hace Xh" de cada fila cada
  // minuto — sin esto quedaría congelado en el valor calculado al abrir.
  setInterval(() => {
    if (contenedor.classList.contains('open')) notifRenderPanel();
  }, 60000);

  // Si otra pestaña del navegador agrega/marca/descarta una notificación
  // (misma app, otra página abierta), este storage event la sincroniza acá
  // sin necesidad de recargar.
  window.addEventListener('storage', (e) => {
    if (e.key === NOTIF_STORAGE_KEY) notifRenderPanel();
  });

  notifRenderPanel();
}

document.addEventListener('DOMContentLoaded', inicializarCampanaNotificaciones);

// =================================================
// MODALES
// =================================================
// Todos los .modal-overlay comparten el mismo z-index base (ver main.css),
// así que cuando un modal abre a otro por encima (ej. "Ver etiquetas" desde
// Historial de Movimientos) el orden en que aparecen en el HTML decide cuál
// queda arriba — y eso es frágil. Acá se eleva el z-index del que se abre
// más recientemente por encima de cualquier otro ya abierto, para que el
// modal más nuevo siempre quede visible sin importar el orden del DOM.
let siguienteZIndexModal = 200;

function abrirModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    el.style.zIndex = ++siguienteZIndexModal;
  }
}

function cerrarModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    el.style.zIndex = '';
  }
}

// Cerrar al hacer click fuera del modal
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    e.target.style.zIndex = '';
  }
});

// =================================================
// VALIDACIÓN INLINE DE CAMPOS (global, todos los módulos)
// =================================================
function mostrarErrorCampo(input, mensaje) {
  input.classList.add('input-error');
  let msg = input.nextElementSibling;
  if (!msg || !msg.classList.contains('input-error-msg')) {
    msg = document.createElement('span');
    msg.className = 'input-error-msg';
    input.insertAdjacentElement('afterend', msg);
  }
  msg.textContent = mensaje;
}

function limpiarErrorCampo(input) {
  input.classList.remove('input-error');
  const msg = input.nextElementSibling;
  if (msg && msg.classList.contains('input-error-msg')) msg.remove();
}

function limpiarErroresModal(modalId) {
  document.querySelectorAll(`#${modalId} .input-error`).forEach(limpiarErrorCampo);
}

// Quita el error de un campo apenas el usuario empieza a corregirlo
document.addEventListener('input', (e) => {
  if (e.target.classList && e.target.classList.contains('input-error')) {
    limpiarErrorCampo(e.target);
  }
});

// =================================================
// MOSTRAR/OCULTAR CONTRASEÑA (global, todos los módulos)
// =================================================
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);

  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

// =================================================
// MEDIDOR DE FUERZA DE CONTRASEÑA (global, todos los módulos)
// =================================================
function medirFuerza(inputId, contenedorId) {
  const valor = document.getElementById(inputId).value;
  const cont  = document.getElementById(contenedorId);
  const texto = cont.querySelector('.fuerza-texto');

  cont.classList.remove('f-debil', 'f-media', 'f-fuerte');

  if (!valor) {
    texto.textContent = '';
    return;
  }

  let puntos = 0;
  if (valor.length >= 8) puntos++;
  if (/[A-Z]/.test(valor)) puntos++;
  if (/[0-9]/.test(valor)) puntos++;
  if (/[^A-Za-z0-9]/.test(valor)) puntos++;

  if (puntos <= 1) {
    cont.classList.add('f-debil');
    texto.textContent = 'Bajo';
  } else if (puntos <= 3) {
    cont.classList.add('f-media');
    texto.textContent = 'Medio';
  } else {
    cont.classList.add('f-fuerte');
    texto.textContent = 'Alto';
  }
}
// =================================================
// CONFIRMACIÓN DE ACCIONES (ej. inactivar un registro)
// =================================================
function confirmarAccion(mensaje, onConfirmar) {
  let modal = document.getElementById('modalConfirmarAccion');
  if (!modal) {
    // En la app móvil (marco .telefono presente) el modal se acopla al
    // tamaño del dispositivo en vez de cubrir toda la ventana del navegador
    // — ver movil.css .movil-modal-overlay.
    const contenedorMovil = document.querySelector('.telefono');
    modal = document.createElement('div');
    modal.className = contenedorMovil ? 'modal-overlay movil-modal-overlay' : 'modal-overlay';
    modal.id = 'modalConfirmarAccion';
    modal.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2 class="modal-title">Confirmar acción</h2>
          <button class="modal-close" onclick="cerrarModal('modalConfirmarAccion')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="success-msg">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <p id="confirmarAccionMensaje"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" onclick="cerrarModal('modalConfirmarAccion')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            Cancelar
          </button>
          <button class="btn-guardar" id="confirmarAccionBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            Confirmar
          </button>
        </div>
      </div>`;
    (contenedorMovil || document.body).appendChild(modal);
  }

  document.getElementById('confirmarAccionMensaje').textContent = mensaje;

  // Reemplaza el botón para no acumular listeners de confirmaciones anteriores
  const btnConfirmar = document.getElementById('confirmarAccionBtn');
  const btnNuevo = btnConfirmar.cloneNode(true);
  btnConfirmar.replaceWith(btnNuevo);
  btnNuevo.addEventListener('click', () => {
    cerrarModal('modalConfirmarAccion');
    onConfirmar();
  });

  abrirModal('modalConfirmarAccion');
}

// =================================================
// CONFIRMACIÓN DE ACCIONES QUE PIDEN UN COMENTARIO (ej. cancelar o marcar
// Reportado una operación): variante de confirmarAccion con un campo de
// comentario arriba del mensaje de la acción — onConfirmar recibe el
// comentario como único argumento ('' si se dejó vacío y era opcional).
// obligatorio=false permite confirmar sin escribir nada (ver toggleReportadoOp,
// donde el comentario es un "por qué" opcional y no un requisito).
// =================================================
function confirmarAccionConComentario(mensaje, onConfirmar, obligatorio = true, nota = '') {
  let modal = document.getElementById('modalConfirmarAccionComentario');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalConfirmarAccionComentario';
    modal.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2 class="modal-title">Confirmación</h2>
          <button class="modal-close" onclick="cerrarModal('modalConfirmarAccionComentario')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group-modal">
            <label class="modal-label">Comentario <span class="req" id="confirmarAccionComentarioReq">*</span><span id="confirmarAccionComentarioOpcional" style="display:none">(opcional)</span></label>
            <textarea class="modal-input" id="confirmarAccionComentarioInput" rows="3" placeholder="Motivo u observación..."></textarea>
          </div>
          <div class="confirmar-aviso-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <p id="confirmarAccionComentarioMensaje"></p>
          </div>
          <div class="confirmar-aviso-warning" id="confirmarAccionComentarioNotaCont" style="display:none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <p id="confirmarAccionComentarioNota"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" onclick="cerrarModal('modalConfirmarAccionComentario')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            Cancelar
          </button>
          <button class="btn-guardar" id="confirmarAccionComentarioBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            Aceptar
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  document.getElementById('confirmarAccionComentarioMensaje').textContent = mensaje;
  document.getElementById('confirmarAccionComentarioNota').textContent = nota;
  document.getElementById('confirmarAccionComentarioNotaCont').style.display = nota ? '' : 'none';
  document.getElementById('confirmarAccionComentarioReq').style.display = obligatorio ? '' : 'none';
  document.getElementById('confirmarAccionComentarioOpcional').style.display = obligatorio ? 'none' : '';
  const input = document.getElementById('confirmarAccionComentarioInput');
  input.value = '';
  input.classList.remove('input-error');

  // Reemplaza el botón para no acumular listeners de confirmaciones anteriores
  const btnConfirmar = document.getElementById('confirmarAccionComentarioBtn');
  const btnNuevo = btnConfirmar.cloneNode(true);
  btnConfirmar.replaceWith(btnNuevo);
  btnNuevo.addEventListener('click', () => {
    const comentario = input.value.trim();
    if (obligatorio && !comentario) {
      input.classList.add('input-error');
      input.focus();
      mostrarToast('Escribe un comentario para continuar.');
      return;
    }
    cerrarModal('modalConfirmarAccionComentario');
    onConfirmar(comentario);
  });

  abrirModal('modalConfirmarAccionComentario');
  setTimeout(() => input.focus(), 50);
}

// =================================================
// PEDIR UN VALOR — reemplazo temático de prompt() (que no sigue el diseño
// del sistema: aparece como el diálogo genérico del navegador, sin el
// look&feel de los modales de la app). Un solo campo de texto/número;
// onConfirmar recibe el valor tal cual (string) — la validación/parseo
// queda a cargo de quien llama, igual que antes con prompt().
// =================================================
function pedirValorModal(titulo, label, valorActual, onConfirmar, tipo = 'text') {
  let modal = document.getElementById('modalPedirValor');
  if (!modal) {
    // En la app móvil (marco .telefono presente) el modal se acopla al
    // tamaño del dispositivo en vez de cubrir toda la ventana del navegador
    // — mismo criterio que confirmarAccion, ver movil.css .movil-modal-overlay.
    const contenedorMovil = document.querySelector('.telefono');
    modal = document.createElement('div');
    modal.className = contenedorMovil ? 'modal-overlay movil-modal-overlay' : 'modal-overlay';
    modal.id = 'modalPedirValor';
    modal.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2 class="modal-title" id="pedirValorTitulo"></h2>
          <button class="modal-close" onclick="cerrarModal('modalPedirValor')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group-modal">
            <label class="modal-label" id="pedirValorLabel"></label>
            <input class="modal-input" id="pedirValorInput">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" onclick="cerrarModal('modalPedirValor')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            Cancelar
          </button>
          <button class="btn-guardar" id="pedirValorBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            Aceptar
          </button>
        </div>
      </div>`;
    (contenedorMovil || document.body).appendChild(modal);
  }

  document.getElementById('pedirValorTitulo').textContent = titulo;
  document.getElementById('pedirValorLabel').textContent = label;
  const input = document.getElementById('pedirValorInput');
  input.type = tipo;
  input.step = tipo === 'number' ? '0.01' : '';
  input.value = valorActual;
  input.classList.remove('input-error');

  // Enter confirma, igual que el prompt() nativo que reemplaza.
  const nuevoInput = input.cloneNode(true);
  input.replaceWith(nuevoInput);
  nuevoInput.value = valorActual;
  nuevoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('pedirValorBtn').click(); }
  });

  // Reemplaza el botón para no acumular listeners de llamadas anteriores.
  const btnConfirmar = document.getElementById('pedirValorBtn');
  const btnNuevo = btnConfirmar.cloneNode(true);
  btnConfirmar.replaceWith(btnNuevo);
  btnNuevo.addEventListener('click', () => {
    const valor = document.getElementById('pedirValorInput').value;
    cerrarModal('modalPedirValor');
    onConfirmar(valor);
  });

  abrirModal('modalPedirValor');
  setTimeout(() => { const el = document.getElementById('pedirValorInput'); el.focus(); el.select(); }, 50);
}

// =================================================
// CAMBIAR MI CONTRASEÑA (disponible para cualquier usuario autenticado,
// desde el menú del avatar en el topbar)
// =================================================
function abrirModalCambiarMiPassword() {
  let modal = document.getElementById('modalCambiarMiPassword');
  if (!modal) {
    // En la app móvil (marco .telefono presente) el modal se acopla al
    // tamaño del dispositivo en vez de cubrir toda la ventana del navegador
    // — ver movil.css .movil-modal-overlay.
    const contenedorMovil = document.querySelector('.telefono');
    modal = document.createElement('div');
    modal.className = contenedorMovil ? 'modal-overlay movil-modal-overlay' : 'modal-overlay';
    modal.id = 'modalCambiarMiPassword';
    modal.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2 class="modal-title">Cambiar contraseña</h2>
          <button class="modal-close" onclick="cerrarModal('modalCambiarMiPassword')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group-modal">
            <label class="modal-label">Contraseña actual <span class="req">*</span></label>
            <div class="input-wrap-pass">
              <input type="password" class="modal-input" id="miPassActual" placeholder="••••••••">
              <button type="button" class="toggle-pass-modal" onclick="togglePasswordVisibility('miPassActual','miPassActualIcon')">
                <svg id="miPassActualIcon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div class="form-group-modal">
            <label class="modal-label">
              Nueva contraseña <span class="req">*</span>
              <span class="info-icon" tabindex="0" aria-label="Políticas de contraseña" data-tooltip="La contraseña debe cumplir:&#10;• Mínimo 8 caracteres&#10;• Al menos una mayúscula&#10;• Al menos un número&#10;• Al menos un carácter especial">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </span>
            </label>
            <div class="input-wrap-pass">
              <input type="password" class="modal-input" id="miPassNueva" placeholder="••••••••" oninput="medirFuerza('miPassNueva','miPassNuevaFuerza')">
              <button type="button" class="toggle-pass-modal" onclick="togglePasswordVisibility('miPassNueva','miPassNuevaIcon')">
                <svg id="miPassNuevaIcon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="fuerza-pass" id="miPassNuevaFuerza">
              <div class="fuerza-barra"><span></span></div>
              <span class="fuerza-texto"></span>
            </div>
          </div>
          <div class="form-group-modal">
            <label class="modal-label">Confirmar nueva contraseña <span class="req">*</span></label>
            <div class="input-wrap-pass">
              <input type="password" class="modal-input" id="miPassConfirmar" placeholder="••••••••">
              <button type="button" class="toggle-pass-modal" onclick="togglePasswordVisibility('miPassConfirmar','miPassConfirmarIcon')">
                <svg id="miPassConfirmarIcon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" onclick="cerrarModal('modalCambiarMiPassword')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            Cancelar
          </button>
          <button class="btn-guardar" id="miPassGuardarBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            Guardar
          </button>
        </div>
      </div>`;
    (contenedorMovil || document.body).appendChild(modal);
  }

  ['miPassActual', 'miPassNueva', 'miPassConfirmar'].forEach(id => {
    const input = document.getElementById(id);
    input.type = 'password';
    input.value = '';
    limpiarErrorCampo(input);
  });
  const fuerza = document.getElementById('miPassNuevaFuerza');
  fuerza.classList.remove('f-debil', 'f-media', 'f-fuerte');
  fuerza.querySelector('.fuerza-texto').textContent = '';

  // Reemplaza el botón para no acumular listeners de aperturas anteriores
  const btnGuardar = document.getElementById('miPassGuardarBtn');
  const btnNuevo = btnGuardar.cloneNode(true);
  btnGuardar.replaceWith(btnNuevo);
  btnNuevo.addEventListener('click', confirmarCambiarMiPassword);

  abrirModal('modalCambiarMiPassword');
}

function confirmarCambiarMiPassword() {
  const sesion = obtenerUsuarioActual();
  if (!sesion) return;
  const usuario = obtenerUsuarioPorNombre(sesion.usuario);

  const actualInput = document.getElementById('miPassActual');
  const nuevaInput = document.getElementById('miPassNueva');
  const confirmarInput = document.getElementById('miPassConfirmar');

  limpiarErroresModal('modalCambiarMiPassword');

  if (!actualInput.value) {
    mostrarErrorCampo(actualInput, 'Ingresa tu contraseña actual');
    actualInput.focus();
    return;
  }
  if (actualInput.value !== usuario.password) {
    mostrarErrorCampo(actualInput, 'La contraseña actual no es correcta');
    actualInput.focus();
    return;
  }

  if (!nuevaInput.value) {
    mostrarErrorCampo(nuevaInput, 'Ingresa tu nueva contraseña');
    nuevaInput.focus();
    return;
  }

  const cumplePolitica = nuevaInput.value.length >= 8
    && /[A-Z]/.test(nuevaInput.value)
    && /[0-9]/.test(nuevaInput.value)
    && /[^A-Za-z0-9]/.test(nuevaInput.value);

  if (!cumplePolitica) {
    mostrarErrorCampo(nuevaInput, 'Debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial');
    nuevaInput.focus();
    return;
  }
  if (nuevaInput.value === actualInput.value) {
    mostrarErrorCampo(nuevaInput, 'La nueva contraseña debe ser distinta a la actual');
    nuevaInput.focus();
    return;
  }

  if (!confirmarInput.value) {
    mostrarErrorCampo(confirmarInput, 'Confirma tu nueva contraseña');
    confirmarInput.focus();
    return;
  }
  if (confirmarInput.value !== nuevaInput.value) {
    mostrarErrorCampo(confirmarInput, 'Las contraseñas no coinciden');
    confirmarInput.focus();
    return;
  }

  usuario.password = nuevaInput.value;
  registrarCambioPassword(usuario, `${usuario.nombre} ${usuario.apellido}`);
  guardarSesionUsuario(usuario);
  cerrarModal('modalCambiarMiPassword');

  // En la app móvil se confirma con un modal (no con el toast de escritorio,
  // que queda fuera del marco del teléfono).
  if (document.querySelector('.telefono')) {
    mostrarModalPasswordActualizadaMovil();
  } else {
    mostrarToast('Tu contraseña fue actualizada correctamente.');
  }
}

function mostrarModalPasswordActualizadaMovil() {
  mostrarModalConfirmacionMovil('Tu contraseña fue actualizada correctamente.');
}

// =================================================
// CONFIRMACIÓN GENÉRICA EN LA APP MÓVIL — reemplaza el toast de escritorio
// (mostrarToast) para avisos que confirman una acción del colaborador
// (jornada iniciada/finalizada, comentario actualizado, ubicación
// actualizada, contraseña actualizada, etc.): en el teléfono se necesita un
// modal que el usuario cierre a propósito, no un toast flotante que puede
// pasar desapercibido o quedar fuera del marco del dispositivo.
// =================================================
function mostrarModalConfirmacionMovil(mensaje, onCerrar) {
  let modal = document.getElementById('modalConfirmacionMovil');
  if (!modal) {
    const contenedorMovil = document.querySelector('.telefono');
    modal = document.createElement('div');
    modal.className = 'modal-overlay movil-modal-overlay';
    modal.id = 'modalConfirmacionMovil';
    modal.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-body">
          <div class="success-msg">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>
            <p id="modalConfirmacionMovilMensaje"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-guardar" id="modalConfirmacionMovilBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            Aceptar
          </button>
        </div>
      </div>`;
    (contenedorMovil || document.body).appendChild(modal);
  }

  document.getElementById('modalConfirmacionMovilMensaje').textContent = mensaje;

  // Reemplaza el botón para no acumular listeners de llamadas anteriores
  const btnViejo = document.getElementById('modalConfirmacionMovilBtn');
  const btnNuevo = btnViejo.cloneNode(true);
  btnViejo.replaceWith(btnNuevo);
  btnNuevo.addEventListener('click', () => {
    cerrarModal('modalConfirmacionMovil');
    if (typeof onCerrar === 'function') onCerrar();
  });

  abrirModal('modalConfirmacionMovil');
}

// =================================================
// CONFIRMACIÓN DE GUARDADO (crear/editar un registro principal)
// =================================================
function mostrarModalGuardado(modo, notaExtra, onCerrar) {
  let modal = document.getElementById('modalGuardadoExito');
  if (!modal) {
    // En la app móvil (marco .telefono presente) el modal se acopla al
    // tamaño del dispositivo en vez de cubrir toda la ventana del navegador
    // — ver movil.css .movil-modal-overlay.
    const contenedorMovil = document.querySelector('.telefono');
    modal = document.createElement('div');
    modal.className = contenedorMovil ? 'modal-overlay movil-modal-overlay' : 'modal-overlay';
    modal.id = 'modalGuardadoExito';
    modal.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2 class="modal-title" id="modalGuardadoExitoTitulo"></h2>
          <button class="modal-close" id="modalGuardadoExitoClose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="success-msg">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>
            <p id="modalGuardadoExitoMensaje"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-guardar" id="modalGuardadoExitoBtn">Aceptar</button>
        </div>
      </div>`;
    (contenedorMovil || document.body).appendChild(modal);
  }

  document.getElementById('modalGuardadoExitoTitulo').textContent =
    modo === 'editar' ? 'Registro actualizado' : 'Operación exitosa';
  const mensajeBase = modo === 'editar' ? 'Se modificó exitosamente.' : 'Se agregó exitosamente.';
  document.getElementById('modalGuardadoExitoMensaje').textContent =
    notaExtra ? `${mensajeBase} ${notaExtra}` : mensajeBase;

  // Clona ambos botones de cierre para no acumular listeners de llamadas anteriores
  const cerrarYNotificar = () => {
    cerrarModal('modalGuardadoExito');
    if (typeof onCerrar === 'function') onCerrar();
  };
  ['modalGuardadoExitoBtn', 'modalGuardadoExitoClose'].forEach(id => {
    const viejo = document.getElementById(id);
    const nuevo = viejo.cloneNode(true);
    viejo.replaceWith(nuevo);
    nuevo.addEventListener('click', cerrarYNotificar);
  });

  abrirModal('modalGuardadoExito');
}

// Resalta brevemente una fila recién creada/editada en una grilla general.
function resaltarFilaNueva(fila) {
  if (!fila || !fila.isConnected) return;
  fila.classList.remove('fila-resaltada');
  void fila.offsetWidth; // fuerza reflow para poder reiniciar la animación
  fila.classList.add('fila-resaltada');
  const limpiar = () => fila.classList.remove('fila-resaltada');
  fila.addEventListener('animationend', limpiar, { once: true });
  setTimeout(limpiar, 1000);
}

function mostrarToast(mensaje) {
  let cont = document.querySelector('.toast-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.className = 'toast-container';
    document.body.appendChild(cont);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>
    </svg>
    <span>${mensaje}</span>`;

  cont.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// Logo oficial de Intertek (Intertek-Logo.wine.png) embebido en base64 para
// los documentos de descarga/impresión (Gastos, Registro de Control de
// Precintos, etc.): así no depende de fetch() ni de rutas relativas, que
// fallan tanto en una ventana de impresión (about:blank) como si el
// prototipo se abre como archivo local sin servidor. Vive en main.js (se
// carga en todas las páginas) para no duplicar el string en cada módulo.
const LOGO_INTERTEK_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAC7gAAAfQCAMAAABlzOIIAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAFNUExURUdwTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUDAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/EBv/ICf/ICf/ICf/ICv/ICf/ICv/JB//ICf/ICf/ICf/ICf/ICf/ICf/ICf/HDf/ICf/HCf/ICQAAAP/ICjNJU2kAAABtdFJOUwAa7YYRVdhDHf4QTEr5nfFdAjNxBSIJ8/sBKPbmw8npLGZ34xe04RQLsLgg23yi3pAlUMxqNzCNBLualNXPbr+A0n2JX6xbQKqXeYNYRlNjpT1hDg2oOg+mPAndoXsosfkea9Lm712PNBLDP08A6B9oAAAgAElEQVR42uzBAQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNmDAwEAAAAAIP/XRlBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVYQ8OBAAAAACA/F8bQVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWFPTgQAAAAAADyf20EVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRX27vYrivOMA/BxVQziAiogiLKgiQbjUbQaXoxWTqRtkmPbWG1OWRaWd0Rn/v+PPT391IaFmZ17PTNwXX/CL/f9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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvrEHBwIAAAAAQP6vjaCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqwh4cCAAAAAAA+b82gqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqoKe3AgAAAAAADk/9oIqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqirtwSEBAAAAgKD/r/1gBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgCsNo00a0dpZzAAAAAElFTkSuQmCC";
