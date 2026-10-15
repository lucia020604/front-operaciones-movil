// =================================================
// OPERACIONES-MOVIL.JS
// Módulo Operaciones de la App Móvil. Un operador puede tener más de una
// operación asignada el mismo día, así que se renderiza una tarjeta por
// operación (OPERACIONES_ASIGNADAS_MOVIL_DEMO, en data-movil.js).
//
// Los estados de una operación (ver ESTADOS_OPERACION_MOVIL en data-movil.js)
// son consecutivos, igual que en el sistema — no se puede registrar uno
// fuera de orden. Por eso cada tarjeta no tiene un selector libre de
// "estado a registrar": muestra directamente el SIGUIENTE estado pendiente
// (obtenerSiguienteEstadoPendiente) con un campo rápido del tipo que
// corresponda (fecha/hora, número o texto — no todos los estados son un
// timestamp) y un botón para confirmarlo al instante. Al lado, un segundo
// botón abre "Añadir Hora", el mismo registro pero con comentario (y
// dictado por voz simulado) para un detalle mayor. "Horario" sigue
// disponible para ver la línea de tiempo completa y editar el comentario de
// un estado ya registrado; "Asignar Precinto" es la otra acción propia de
// la operación — todas abren su modal pasando su propio índice, y los
// modales (compartidos, uno solo en el DOM) recuerdan cuál operación está
// activa en indiceOperacionActiva mientras están abiertos.
// "Cerrar sesión" no vive aquí: es una acción de la sesión, no de una
// operación puntual — está en Mi Perfil.
// =================================================

function actualizarHoraStatusBar() {
  const el = document.getElementById('horaStatusBar');
  if (!el) return;
  const ahora = new Date();
  const pad = n => String(n).padStart(2, '0');
  el.textContent = horaA12(`${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`);
}
actualizarHoraStatusBar();
setInterval(actualizarHoraStatusBar, 15000);

function inicializarOperacionesMovil() {
  const sesion = obtenerUsuarioActual();
  if (!sesion) { window.location.href = 'login-movil.html'; return; }

  renderJornada();
  renderOperacionesAsignadas();
  sugerirComenzarPorGeocerca();
  iniciarRecordatorioJornadaAbierta();
  renderNotificacionesOlvidos();
}

// =================================================
// JORNADA (Comenzar día / Finalizar) — PROMPT_GASTOS_JORNADA_SPRINT4 §1/§2.
// Ubicación real del dispositivo (navigator.geolocation, con fallback
// simulado — ver obtenerUbicacionDispositivo en data-movil.js); persistida
// (JORNADAS_MOVIL_DEMO) para que Gastos y Días a Bordo la lean sin
// depender de que esta pestaña siga abierta.
// =================================================
const JORNADA_ICONOS = {
  pendiente: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  enCurso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v18l15-9Z"/></svg>',
  finalizada: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>'
};

function renderJornada() {
  const sesion = obtenerUsuarioActual();
  const jornada = obtenerJornadaActiva(sesion.usuario);
  const box = document.querySelector('.jornada-box');
  const icono = document.getElementById('jornadaIcono');
  const btn = document.getElementById('btnJornada');
  const estadoTexto = document.getElementById('jornadaEstadoTexto');
  const horaTexto = document.getElementById('jornadaHoraTexto');
  const horaCaption = document.getElementById('jornadaHoraCaption');
  const badge = document.getElementById('jornadaMetaTexto');

  const nOperaciones = OPERACIONES_ASIGNADAS_MOVIL_DEMO.length;
  badge.textContent = nOperaciones
    ? `${nOperaciones} operación${nOperaciones === 1 ? '' : 'es'} hoy`
    : 'Sin operaciones hoy';

  box.classList.remove('en-curso', 'finalizada');

  if (jornada.estado === 'cerrada') {
    box.classList.add('finalizada');
    icono.innerHTML = JORNADA_ICONOS.finalizada;
    estadoTexto.textContent = 'Jornada finalizada';
    horaTexto.textContent = horaA12(jornada.fin.hora);
    horaCaption.textContent = `Inicio ${horaA12(jornada.inicio.hora)} · Fin ${horaA12(jornada.fin.hora)}`;
    btn.textContent = 'Jornada finalizada';
    btn.classList.remove('finalizar');
    btn.disabled = true;
  } else if (jornada.estado === 'abierta') {
    box.classList.add('en-curso');
    icono.innerHTML = JORNADA_ICONOS.enCurso;
    estadoTexto.textContent = 'Jornada en curso';
    horaTexto.textContent = horaA12(jornada.inicio.hora);
    horaCaption.textContent = jornada.inicio.fuente === 'declarada' ? 'Hora de inicio (declarada)' : 'Hora de inicio';
    btn.textContent = 'Finalizar';
    btn.classList.add('finalizar');
    btn.disabled = false;
  } else {
    icono.innerHTML = JORNADA_ICONOS.pendiente;
    estadoTexto.textContent = 'Jornada no iniciada';
    horaTexto.textContent = '—';
    horaCaption.textContent = 'Aún no registrada';
    btn.textContent = 'Comenzar día';
    btn.classList.remove('finalizar');
    btn.disabled = false;
  }
}

// Recordatorio local a las 23:30 si la jornada sigue abierta (§1) — se
// revisa cada minuto mientras la pestaña está abierta; "avisado" evita
// repetir el aviso dentro de la misma carga de página.
let recordatorioJornadaAvisado = false;
function iniciarRecordatorioJornadaAbierta() {
  setInterval(() => {
    const sesion = obtenerUsuarioActual();
    if (!sesion) return;
    const jornada = obtenerJornadaActiva(sesion.usuario);
    const ahora = new Date();
    if (jornada.estado === 'abierta' && ahora.getHours() === 23 && ahora.getMinutes() >= 30) {
      if (!recordatorioJornadaAvisado) {
        recordatorioJornadaAvisado = true;
        mostrarToast('Tu jornada sigue abierta. Recuerda finalizar el día.');
      }
    } else {
      recordatorioJornadaAvisado = false;
    }
  }, 60000);
}

// =================================================
// NOTIFICACIONES DE OLVIDO DE COMIDAS — se revisan al abrir la app/Comenzar
// el día y al Finalizar (sin hora programada: el único ajuste es activar o
// desactivar el aviso, para todos). Se intenta la Notification API real del
// navegador (si el APK la permite) y SIEMPRE se arma el banner/lista local
// con contador — es la única vía garantizada sin depender de un permiso que
// puede estar denegado. Tocar un día abre "Agregar gasto olvidado" en Gastos.
// =================================================
let recordatorioOlvidosAvisadoHoy = false;

// "momentoAccion" ('inicio'/'fin', opcional): cuando esta llamada viene de
// Comenzar/Finalizar el día, el aviso push solo se intenta si coincide con
// lo elegido en Configuración > Jornada > Recordatorio de gastos olvidados
// (antes avisaba en los dos sin poder elegir). Sin ese dato (al abrir la
// app, o al descartar un chip) siempre se intenta, como antes — el banner
// de abajo es el aviso real y SIEMPRE queda visible pase lo que pase.
function renderNotificacionesOlvidos(momentoAccion) {
  const banner = document.getElementById('olvidosBanner');
  if (!banner) return;
  const sesion = obtenerUsuarioActual();
  if (!sesion || !CONFIG_JORNADA_DEMO.recordatorioOlvidosActivo) { banner.style.display = 'none'; return; }

  const dias = obtenerComidasOlvidadasOperador(sesion.usuario);
  if (!dias.length) { banner.style.display = 'none'; return; }

  // El push solo se intenta a partir de la hora elegida en Configuración
  // (HH:MM 24h compara bien como texto); el banner se muestra siempre.
  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const respetaMomento = horaActual >= (CONFIG_JORNADA_DEMO.horaRecordatorioOlvidos || '00:00');
  if (!recordatorioOlvidosAvisadoHoy && respetaMomento) {
    recordatorioOlvidosAvisadoHoy = true;
    notificarOlvidosNavegador(dias);
  }

  const totalComidas = dias.reduce((acc, d) => acc + d.comidas.length, 0);
  banner.style.display = '';
  document.getElementById('olvidosBannerContador').textContent = totalComidas;

  document.getElementById('olvidosBannerLista').innerHTML = dias.map(d => `
    <div class="olvidos-dia">
      <button type="button" class="olvidos-dia-fecha" onclick="irAGastoOlvidadoDesdeNotificacion('${d.fechaISO}')">
        No se agregó ${d.comidas.join(', ')} en el reporte del día ${d.fecha}
      </button>
      <div class="olvidos-dia-chips">
        ${d.comidas.map(c => `
          <span class="gastos-faltante-chip olvidos-chip">
            ${c}
            <button type="button" title="No corresponde / no consumí" onclick="event.stopPropagation(); descartarOlvidoNotificacion('${d.fechaISO}', '${c}')">✕</button>
          </span>`).join('')}
      </div>
    </div>`).join('');
}

function descartarOlvidoNotificacion(fechaISO, comida) {
  const sesion = obtenerUsuarioActual();
  if (!sesion) return;
  descartarComidaOlvidada(sesion.usuario, fechaISO, comida);
  renderNotificacionesOlvidos();
}

function irAGastoOlvidadoDesdeNotificacion(fechaISO) {
  window.location.href = `gastos-movil.html?olvido=${fechaISO}`;
}

// Notification API real (mejor esfuerzo, sin pedir permiso de entrada — si
// el APK/navegador no lo permite o no está otorgado, el banner de arriba
// sigue siendo el aviso real) — una por día agrupando sus comidas.
// Simulación visual de push (ítem 2, Sprint 4): la Notification API real
// (notificarOlvidosNavegador) casi nunca se ve porque depende de un permiso
// que el navegador/APK no otorga en la demo — este botón SIEMPRE muestra,
// dentro de la propia pantalla, cómo se vería ese aviso llegando al
// celular del operador en tiempo real. Usa el primer aviso real pendiente
// (olvido de comida o reporte no generado) si hay uno; si no hay ninguno
// pendiente ahora mismo, muestra un ejemplo para que el botón nunca quede
// sin mostrar nada.
let pushSimTimeoutId = null;

function mostrarSimulacionPush() {
  const banner = document.getElementById('pushSimBanner');
  const sesion = obtenerUsuarioActual();
  if (!banner || !sesion) return;

  const olvidos = (typeof obtenerComidasOlvidadasOperador === 'function') ? obtenerComidasOlvidadasOperador(sesion.usuario) : [];
  const noGenerados = (typeof obtenerReportesNoGeneradosOperador === 'function') ? obtenerReportesNoGeneradosOperador(sesion.usuario) : [];

  let titulo, cuerpo;
  if (olvidos.length) {
    titulo = 'Gasto olvidado';
    cuerpo = `No se agregó ${olvidos[0].comidas.join(', ')} en el reporte del día ${olvidos[0].fecha}`;
  } else if (noGenerados.length) {
    titulo = 'Reporte pendiente';
    cuerpo = noGenerados[0].mensaje;
  } else {
    titulo = 'Reporte pendiente';
    cuerpo = 'No se generó reporte de Movilidad del día de hoy';
  }

  document.getElementById('pushSimTitulo').textContent = titulo;
  document.getElementById('pushSimCuerpo').textContent = cuerpo;
  document.getElementById('pushSimHora').textContent = 'ahora';

  banner.classList.remove('push-sim-banner--visible');
  void banner.offsetWidth; // reinicia la animación si ya estaba visible
  banner.classList.add('push-sim-banner--visible');

  clearTimeout(pushSimTimeoutId);
  pushSimTimeoutId = setTimeout(() => banner.classList.remove('push-sim-banner--visible'), 4500);
}

function notificarOlvidosNavegador(dias) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  dias.forEach(d => {
    try {
      new Notification('Gasto olvidado', {
        body: `No se agregó ${d.comidas.join(', ')} en el reporte del día ${d.fecha}`,
        tag: `olvido-${d.fechaISO}`
      });
    } catch (e) { /* APK sin soporte real de Notification: el banner ya cubre el aviso */ }
  });
}

// Geocerca (§1): si el colaborador está dentro del radio de un muelle y no
// tiene jornada abierta, sugiere "¿Estás en {muelle}? Comenzar el día" — la
// comparación es local (Haversine, ver distanciaMetros en data-movil.js),
// sin pedir nada a un servidor.
function sugerirComenzarPorGeocerca() {
  const sesion = obtenerUsuarioActual();
  const jornada = obtenerJornadaActiva(sesion.usuario);
  if (jornada.estado !== 'pendiente') return;
  if (typeof cargarMuelles !== 'function' || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(pos => {
    const muelles = cargarMuelles().filter(m => m.latitud && m.longitud && m.radioMetros);
    const cercano = muelles.find(m => distanciaMetros(pos.coords.latitude, pos.coords.longitude, Number(m.latitud), Number(m.longitud)) <= Number(m.radioMetros));
    if (!cercano) return;
    // Se vuelve a chequear por si el usuario ya inició mientras se resolvía el GPS.
    if (obtenerJornadaActiva(sesion.usuario).estado !== 'pendiente') return;
    confirmarAccion(`¿Estás en ${cercano.nombre}? Puedes comenzar el día desde acá.`, () => abrirModalRegistroJornada());
  }, () => {}, { timeout: 5000 });
}

// =================================================
// REGISTRO DE JORNADA (Comenzar día / Finalizar) — no se puede confirmar
// sin ubicación (btnConfirmarRegistroJornada queda disabled hasta
// capturarla, real o por el fallback simulado).
// =================================================
let registroJornadaModo = null; // 'inicio' | 'fin'
let registroJornadaCaptura = null;

function formatearFechaLarga(fecha) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

function formatearHora12(fecha) {
  let horas = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const sufijo = horas >= 12 ? 'pm' : 'am';
  horas = horas % 12;
  if (horas === 0) horas = 12;
  return `${String(horas).padStart(2, '0')}:${minutos} ${sufijo}`;
}

function abrirModalRegistroJornada() {
  const sesion = obtenerUsuarioActual();
  const jornada = obtenerJornadaActiva(sesion.usuario);
  registroJornadaModo = jornada.estado === 'abierta' ? 'fin' : 'inicio';
  registroJornadaCaptura = null;
  const esFin = registroJornadaModo === 'fin';

  document.getElementById('registroJornadaSubtitulo').textContent = esFin
    ? 'Registro de Inicio y Finalización de Operación'
    : 'Registro de Inicio de Operación';

  document.getElementById('registroSeccionInicio').style.display = '';
  document.getElementById('registroSeccionFin').style.display = esFin ? '' : 'none';
  document.getElementById('btnConfirmarRegistroJornadaTexto').textContent = esFin ? 'Finalizar' : 'Iniciar Operación';

  if (esFin) {
    // El inicio ya quedó registrado antes: se muestra de solo lectura y solo
    // se captura ahora la ubicación/hora de finalización.
    document.getElementById('registroBoxInicio').classList.remove('activa');
    document.getElementById('registroRefrescarInicio').style.display = 'none';
    document.getElementById('registroUbicacionTextoInicio').textContent = jornada.inicio.ubicacionTexto;
    document.getElementById('registroHoraInicio').textContent = jornada.inicio.horaLarga;
    document.getElementById('registroFechaInicio').textContent = jornada.inicio.fecha;
    document.getElementById('registroRefrescarFin').style.display = '';
    iniciarCapturaUbicacionRegistro('Fin');
  } else {
    document.getElementById('registroRefrescarInicio').style.display = '';
    iniciarCapturaUbicacionRegistro('Inicio');
  }

  abrirModal('modalRegistroJornada');
}

function iniciarCapturaUbicacionRegistro(sufijo) {
  document.getElementById(`registroBox${sufijo}`).classList.add('activa');
  document.getElementById(`registroUbicacionTexto${sufijo}`).textContent = 'Obteniendo ubicación…';
  document.getElementById(`registroHora${sufijo}`).textContent = '—';
  document.getElementById(`registroFecha${sufijo}`).textContent = '—';

  registroJornadaCaptura = null;
  document.getElementById('btnConfirmarRegistroJornada').disabled = true;

  obtenerUbicacionDispositivo(ubicacion => {
    const ahora = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ubicacionTexto = ubicacion.textoSimulado || `${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}`;

    registroJornadaCaptura = {
      lat: ubicacion.lat, lng: ubicacion.lng, precision: ubicacion.precision,
      ubicacionTexto,
      horaCorta: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
      horaLarga: formatearHora12(ahora),
      fecha: formatearFechaLarga(ahora),
      fechaHoraISO: ahora.toISOString()
    };

    document.getElementById(`registroUbicacionTexto${sufijo}`).textContent = ubicacionTexto;
    document.getElementById(`registroHora${sufijo}`).textContent = registroJornadaCaptura.horaLarga;
    document.getElementById(`registroFecha${sufijo}`).textContent = registroJornadaCaptura.fecha;
    document.getElementById('btnConfirmarRegistroJornada').disabled = false;
  });
}

function confirmarRegistroJornada() {
  if (!registroJornadaCaptura) return;
  const sesion = obtenerUsuarioActual();
  const jornada = obtenerJornadaActiva(sesion.usuario);
  const c = registroJornadaCaptura;

  const bloqueHoraUbicacion = {
    hora: c.horaCorta, horaLarga: c.horaLarga, fecha: c.fecha, fechaHoraISO: c.fechaHoraISO,
    ubicacionTexto: c.ubicacionTexto,
    gps: { lat: c.lat, lng: c.lng, precision: c.precision },
    fuente: 'marcada',
    // "Sin internet": navigator.onLine es la señal real del dispositivo —
    // si no hay conexión, queda sin sincronizar y se reintenta solo al
    // volver la conexión (ver registrarSincronizacionJornada).
    sincronizado: navigator.onLine !== false,
    sincronizadoEn: navigator.onLine !== false ? c.fechaHoraISO : null
  };

  if (registroJornadaModo === 'inicio') {
    jornada.inicio = bloqueHoraUbicacion;
    jornada.estado = 'abierta';
  } else {
    jornada.fin = bloqueHoraUbicacion;
    jornada.estado = 'cerrada';
    jornada.horas = calcularHorasJornada(jornada.inicio, jornada.fin);
  }
  guardarJornadasMovil();
  if (!bloqueHoraUbicacion.sincronizado) registrarSincronizacionJornada(jornada, registroJornadaModo);

  cerrarModal('modalRegistroJornada');
  renderJornada();
  // El botón "Precinto" de cada operación se bloquea/desbloquea según el
  // estado de la jornada (ver renderOperacionesAsignadas) — sin este
  // refresco quedaba bloqueado aunque el día ya estuviera iniciado, hasta
  // recargar la página a mano.
  renderOperacionesAsignadas();
  // Al Finalizar, la jornada que se acaba de cerrar recién entra a la
  // ventana de "olvidos" — refresca el banner para que se vea al instante.
  // El push (no el banner) respeta el momento elegido en Configuración.
  renderNotificacionesOlvidos(registroJornadaModo);

  if (registroJornadaModo === 'inicio') {
    mostrarModalConfirmacionMovil('Jornada iniciada correctamente.');
  } else {
    // Al finalizar: ofrece el reporte de precintos de la jornada y de ahí
    // redirige a Gastos (§2) — no un simple toast.
    abrirModalFinalizarJornada(jornada);
  }
}

// Mientras no hay conexión, el registro queda con sincronizado:false — al
// volver la conexión (evento 'online', disponible sin backend propio) se
// marca sincronizado y, si la demora superó el umbral configurado, "desvio".
function registrarSincronizacionJornada(jornada, modo) {
  const listener = () => {
    const ahora = new Date();
    const bloque = modo === 'inicio' ? jornada.inicio : jornada.fin;
    bloque.sincronizadoEn = ahora.toISOString();
    bloque.sincronizado = true;
    const minutos = (ahora - new Date(bloque.fechaHoraISO)) / 60000;
    bloque.desvio = minutos > CONFIG_JORNADA_DEMO.umbralDesvioMin;
    guardarJornadasMovil();
    mostrarToast('Jornada sincronizada.');
    window.removeEventListener('online', listener);
  };
  window.addEventListener('online', listener);
}

// =================================================
// AL FINALIZAR EL DÍA (§2, PROMPT_GASTOS_PENDIENTES_SPRINT4 §1) — si se
// asignaron/reportaron precintos (usados o scrap) del operador EN LA FECHA
// de la jornada, genera y muestra su reporte (agrupado por PER + rango
// consecutivo, mismo criterio que el resto del sistema,
// dividirPorMaterialYCorrelatividad); si no se generó ninguno, el mismo
// modal avisa "No hay precintos usados en esta jornada" con un botón OK
// que lleva a Gastos — nunca salta directo sin avisar.
// =================================================
let jornadaReportePrecintos = null;   // jornada cuyo reporte se está mostrando
let gruposReportePrecintos = [];      // filas visibles (para el botón de tacho)

function abrirModalFinalizarJornada(jornada) {
  jornadaReportePrecintos = jornada;
  refrescarReportePrecintosJornada();
  abrirModal('modalFinalizarJornada');
}

function refrescarReportePrecintosJornada() {
  const sesion = obtenerUsuarioActual();
  const delDia = obtenerPrecintosDeJornada(sesion.usuario, jornadaReportePrecintos.fecha);
  const hayPrecintos = !!delDia.length;

  document.getElementById('finalizarJornadaSinPrecintos').style.display = hayPrecintos ? 'none' : '';
  document.getElementById('finalizarJornadaConPrecintos').style.display = hayPrecintos ? '' : 'none';
  if (hayPrecintos) renderReportePrecintosJornada(delDia);
}

// Uso y scrap muestran los mismos datos (PER, terminal, viaje). El uso los
// saca del viaje registrado; el scrap los trae guardados desde que se marcó
// (los scrap antiguos sin esos datos muestran "—").
function renderReportePrecintosJornada(filas) {
  const lista = document.getElementById('listaReportePrecintosJornada');
  const grupos = new Map();
  filas.forEach(f => {
    const esScrap = f.estado === 'scrap';
    const origen = esScrap ? f.scrapDetalle : f.uso;
    const viaje = origen.viaje || '—';
    const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO.find(o => o.nroViaje === viaje);
    const per = (esScrap && f.scrapDetalle.per) || (op ? op.per : '—');
    const terminal = origen.terminal || (op ? op.terminal : '—');
    const clave = `${per}|${f.estado}|${terminal}|${viaje}`;
    if (!grupos.has(clave)) grupos.set(clave, { per, estado: f.estado, terminal, viaje, precintos: [] });
    grupos.get(clave).precintos.push(f.precinto);
  });

  gruposReportePrecintos = [];
  grupos.forEach(g => {
    dividirPorMaterialYCorrelatividad(g.precintos).forEach(sub => {
      gruposReportePrecintos.push({ ...g, precintos: sub.precintos, texto: sub.texto });
    });
  });

  // Sin botón de "Quitar" acá (Sprint 4, ajuste visual): corregir un
  // usado/scrap marcado por error ahora se hace desde Gastos > Precintos
  // de la Jornada (ver abrirModalPrecintosJornadaGastos en gastos-movil.js)
  // — "Jornada finalizada" queda como confirmación de solo lectura.
  lista.innerHTML = gruposReportePrecintos.map((g) => {
    const esScrap = g.estado === 'scrap';
    return `<div class="jp-card">
      <div class="jp-card-top">
        <span class="badge ${esScrap ? 'badge-inactivo' : 'badge-vigente'}"><span class="badge-dot"></span>${esScrap ? 'Scrap' : 'Usado'}</span>
      </div>
      <div class="jp-rango">${g.texto}</div>
      <div class="jp-datos">
        <div><span>PER</span><strong>${g.per}</strong></div>
        <div><span>Terminal</span><strong>${g.terminal}</strong></div>
        <div><span>Viaje</span><strong>${g.viaje}</strong></div>
      </div>
    </div>`;
  }).join('');
}

function irAGastosDesdeJornada() {
  cerrarModal('modalFinalizarJornada');
  window.location.href = 'gastos-movil.html';
}

// =================================================
// OPERACIONES ASIGNADAS (lista) — cada tarjeta trae sus propios datos,
// productos y acciones (Añadir Hora / Horario / Asignar Precinto), todas
// dirigidas a esa operación puntual mediante su índice en el arreglo.
// =================================================

// Recordada mientras un modal de acción está abierto, para saber sobre qué
// operación de la lista está operando (se fija al abrir cada modal).
let indiceOperacionActiva = null;

function renderOperacionesAsignadas() {
  const cont = document.getElementById('operacionesLista');
  const lista = OPERACIONES_ASIGNADAS_MOVIL_DEMO;

  // El reporte de precintos al Finalizar el día (§2) solo es alcanzable si
  // la jornada llegó a 'abierta' — marcar un precinto como usado sin haber
  // tocado antes "Comenzar el día" dejaba ese reporte obligatorio
  // inalcanzable (nunca aparecía el botón "Finalizar"). Se bloquea acá,
  // en el origen, en vez de solo avisar después.
  const sesionOp = obtenerUsuarioActual();
  const estadoJornadaOp = sesionOp ? obtenerJornadaActiva(sesionOp.usuario).estado : null;
  const jornadaPendienteParaPrecinto = estadoJornadaOp === 'pendiente';
  const jornadaCerradaParaPrecinto = estadoJornadaOp === 'cerrada';
  const precintoBloqueado = jornadaPendienteParaPrecinto || jornadaCerradaParaPrecinto;
  const precintoBloqueadoMsg = jornadaPendienteParaPrecinto
    ? 'Comienza tu día primero para poder asignar precintos: el reporte de precintos al Finalizar el día depende de eso.'
    : 'Ya finalizaste tu jornada: no se pueden asignar más precintos.';

  document.getElementById('opListaTitulo').style.display = lista.length ? '' : 'none';

  if (!lista.length) {
    cont.innerHTML = `<div class="movil-card"><p style="font-size:11px;color:var(--gray-500);">No tienes operaciones asignadas por el momento.</p></div>`;
    return;
  }

  const indiceEnProceso = indiceOperacionEnProceso();

  cont.innerHTML = lista.map((op, i) => `
    <div class="movil-card op-card">
      <div class="op-card-header">
        <span class="op-codigo-badge">${op.codigo}</span>
        <span class="op-card-terminal">${op.terminal}</span>
      </div>
      <div class="op-datos-grid">
        <div class="op-dato"><span class="lbl">Cliente</span><span class="val">${op.cliente}</span></div>
        <div class="op-dato"><span class="lbl">N° Per</span><span class="val">${op.per}</span></div>
        <div class="op-dato"><span class="lbl">N° Viaje</span><span class="val">${op.nroViaje}</span></div>
        <div class="op-dato"><span class="lbl">Operación</span><span class="val">${op.operacion}</span></div>
        <div class="op-dato" style="grid-column:1 / -1;"><span class="lbl">Personal Asignado</span><span class="val">${op.personalAsignado}</span></div>
      </div>

      <div style="margin-top:10px;">
        <span class="lbl" style="font-size:10px;color:var(--gray-400);">Productos</span>
        <div class="op-productos-chips" id="opProductosChips-${i}"></div>
      </div>

      <div class="op-acciones-grid">
        <button type="button" class="btn-op-accion" onclick="abrirModalActualizarProducto(${i})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>
          Productos
        </button>
        <button type="button" class="btn-op-accion" onclick="abrirModalHorario(${i})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Horario
        </button>
        <button type="button" class="btn-op-accion${precintoBloqueado ? ' btn-op-accion--bloqueado' : ''}" title="${precintoBloqueado ? (jornadaPendienteParaPrecinto ? 'Comienza tu día primero' : 'Jornada ya finalizada') : ''}" onclick="${precintoBloqueado ? `mostrarToast(${JSON.stringify(precintoBloqueadoMsg)})` : `abrirModalAsignarPrecinto(${i})`}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
          Precinto
        </button>
      </div>

      ${renderBloqueSiguienteEstado(op, i, indiceEnProceso)}
    </div>`).join('');

  lista.forEach((op, i) => renderProductosChips(i));
}

// =================================================
// SIGUIENTE ESTADO PENDIENTE — los estados de una operación son
// consecutivos (igual que en el sistema), así que en vez de un selector
// libre se muestra directo el próximo que falta. No todos son fecha y hora:
// también hay tipo "numero" y "texto" (ver ESTADOS_OPERACION_MOVIL) — la
// tarjeta ofrece un campo rápido del tipo que corresponda, y un botón
// aparte abre "Añadir Hora" con comentario (y dictado) para un registro
// más detallado.
// =================================================
function estadoEstaCompletado(estado, dato) {
  return estado.tipo === 'fechaHora' ? !!dato.fecha : !!(dato.valor && String(dato.valor).trim());
}

function obtenerSiguienteEstadoPendiente(op) {
  return ESTADOS_OPERACION_MOVIL.find(e => !estadoEstaCompletado(e, op.estados[e.clave])) || null;
}

// El operador no puede trabajar en dos operaciones a la vez: la "operación en
// proceso" es la primera operación asignada que ya tiene al menos un estado
// registrado (ya se empezó) pero todavía no todos (aún no termina). Mientras
// esa exista, el campo rápido de registro queda disponible solo para ella;
// las demás quedan bloqueadas hasta que se complete, sin necesidad de
// exponerle al usuario ninguna etiqueta de "estado" — solo se le pide
// terminar la que ya tiene entre manos.
function indiceOperacionEnProceso() {
  const primerEstado = ESTADOS_OPERACION_MOVIL[0];
  return OPERACIONES_ASIGNADAS_MOVIL_DEMO.findIndex(op => {
    if (op.revisadoPorSistema) return false;
    const yaEmpezo = estadoEstaCompletado(primerEstado, op.estados[primerEstado.clave]);
    return yaEmpezo && obtenerSiguienteEstadoPendiente(op) !== null;
  });
}

function valorDatetimeLocalActual() {
  const ahora = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
}

function renderBloqueSiguienteEstado(op, indice, indiceEnProceso) {
  if (op.revisadoPorSistema) {
    return `
      <div class="op-siguiente-bloqueado">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Esta operación ya fue revisada desde el sistema y no puede modificarse desde la app.</span>
      </div>`;
  }

  const siguiente = obtenerSiguienteEstadoPendiente(op);
  if (!siguiente) {
    return `
      <div class="op-siguiente-completo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
        Todos los estados de la operación fueron registrados.
      </div>`;
  }

  if (indiceEnProceso !== -1 && indiceEnProceso !== indice) {
    return `
      <div class="op-siguiente-bloqueado">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Termina la operación que ya tienes en curso para continuar con esta.</span>
      </div>`;
  }

  const inputHtml = siguiente.tipo === 'fechaHora'
    ? `<input type="datetime-local" class="movil-input" id="opSiguienteInput-${indice}" value="${valorDatetimeLocalActual()}">`
    : `<input type="${siguiente.tipo === 'numero' ? 'number' : 'text'}" class="movil-input" id="opSiguienteInput-${indice}" placeholder="${siguiente.campoPlaceholder || ''}">`;

  const iconoTipo = {
    fechaHora: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    numero: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>',
    texto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
  }[siguiente.tipo];

  const pistaFormato = siguiente.tipo === 'fechaHora'
    ? '<div class="op-siguiente-hint">Formato: dd/mm/aaaa</div>'
    : '';

  return `
    <div class="op-siguiente">
      <div class="op-siguiente-titulo">
        ${iconoTipo}
        <span>${siguiente.tipo === 'fechaHora' ? siguiente.etiqueta : `${siguiente.etiqueta} · ${siguiente.campoLabel}`}</span>
      </div>
      <div class="op-siguiente-campo">
        ${inputHtml}
        ${pistaFormato}
      </div>
      <div class="op-siguiente-acciones">
        <button type="button" class="op-siguiente-btn" onclick="registrarActividadSiguiente(${indice})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Registrar
        </button>
        <button type="button" class="op-siguiente-btn op-siguiente-btn--secundario" onclick="abrirModalAnadirHora(${indice})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Con comentario
        </button>
      </div>
    </div>`;
}

function registrarActividadSiguiente(indice) {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indice];
  const siguiente = obtenerSiguienteEstadoPendiente(op);
  if (!siguiente) return;

  const input = document.getElementById(`opSiguienteInput-${indice}`);

  if (siguiente.tipo === 'fechaHora') {
    if (!input.value) { mostrarErrorCampo(input, 'Selecciona fecha y hora'); return; }
    const [fechaParte, horaParte] = input.value.split('T');
    const [anio, mes, dia] = fechaParte.split('-');
    op.estados[siguiente.clave] = { fecha: `${dia}/${mes}/${anio}`, hora: horaParte, comentario: '' };
  } else {
    if (!input.value.trim()) { mostrarErrorCampo(input, `Ingresa ${siguiente.campoLabel.toLowerCase()}`); return; }
    op.estados[siguiente.clave] = { valor: input.value.trim(), comentario: '' };
  }

  renderOperacionesAsignadas();
  mostrarModalConfirmacionMovil(`${siguiente.etiqueta} registrado correctamente.`);
}

function renderProductosChips(indice) {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indice];
  const cont = document.getElementById(`opProductosChips-${indice}`);
  if (!cont) return;
  cont.innerHTML = op.productos.length
    ? op.productos.map(p => `<span class="op-producto-chip">${p}</span>`).join('')
    : `<span style="font-size:10px;color:var(--gray-400);">Sin productos registrados.</span>`;
}

// =================================================
// AÑADIR HORA — registro detallado (con comentario y dictado) del mismo
// siguiente estado pendiente que ya se puede registrar rápido desde la
// tarjeta; el campo principal se adapta al tipo del estado (fecha/hora,
// número o texto).
// =================================================
// El mismo modal sirve para dos casos: registrar el SIGUIENTE estado
// pendiente (claveEstadoEditando en null) o editar un estado que ya fue
// registrado antes, abierto desde "Horario" (claveEstadoEditando con la
// clave de ese estado) — en ambos casos el campo principal se adapta al
// tipo del estado (fecha/hora, número o texto) y hay un campo de comentario.
let claveEstadoEditando = null;

// El textarea de comentario crece con el contenido (en vez de quedar fijo a
// 3 filas y cortar el texto) hasta un máximo; de ahí en adelante se vuelve
// desplazable para no empujar el resto del modal fuera de la pantalla.
const ANADIR_HORA_COMENTARIO_MAX_ALTO = 120;

function autoAjustarTextareaMovil(el) {
  el.style.height = 'auto';
  const alto = Math.min(el.scrollHeight, ANADIR_HORA_COMENTARIO_MAX_ALTO);
  el.style.height = `${alto}px`;
  el.style.overflowY = el.scrollHeight > ANADIR_HORA_COMENTARIO_MAX_ALTO ? 'auto' : 'hidden';
}

function abrirModalAnadirHora(indice) {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indice];
  const siguiente = obtenerSiguienteEstadoPendiente(op);
  if (!siguiente) return;

  indiceOperacionActiva = indice;
  claveEstadoEditando = null;
  document.getElementById('tituloModalAnadirHora').textContent = `Añadir Hora — ${op.codigo}`;
  document.getElementById('anadirHoraEtiqueta').textContent = siguiente.tipo === 'fechaHora' ? siguiente.etiqueta : `${siguiente.etiqueta} · ${siguiente.campoLabel}`;

  const campoValor = document.getElementById('anadirHoraValor');
  campoValor.type = siguiente.tipo === 'fechaHora' ? 'datetime-local' : (siguiente.tipo === 'numero' ? 'number' : 'text');
  campoValor.placeholder = siguiente.tipo === 'fechaHora' ? '' : (siguiente.campoPlaceholder || '');
  // Por defecto sale la fecha/hora exacta en que se abre el modal; en
  // número/texto el campo obligatorio queda vacío para que el colaborador lo
  // complete.
  campoValor.value = siguiente.tipo === 'fechaHora' ? valorDatetimeLocalActual() : '';
  limpiarErrorCampo(campoValor);

  const campoComentario = document.getElementById('anadirHoraComentario');
  campoComentario.value = '';
  autoAjustarTextareaMovil(campoComentario);
  document.getElementById('dictadoTexto').textContent = 'Toca el micrófono para dictar el comentario.';
  document.getElementById('btnMicrofono').classList.remove('grabando');

  abrirModal('modalAnadirHora');
}

// Editar un estado ya registrado (desde el ícono de lápiz en "Horario"):
// precarga su valor actual (respetando el tipo — fecha/hora, número o
// texto) y su comentario. Cierra "Horario" mientras se edita para que los
// dos modales no queden superpuestos, y lo vuelve a abrir al guardar o
// cancelar.
function abrirModalEditarEstado(clave) {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  const estado = ESTADOS_OPERACION_MOVIL.find(e => e.clave === clave);
  const dato = op && op.estados[clave];
  if (!estado || !dato) return;

  claveEstadoEditando = clave;
  cerrarModal('modalHorario');

  document.getElementById('tituloModalAnadirHora').textContent = `Editar ${estado.etiqueta} — ${op.codigo}`;
  document.getElementById('anadirHoraEtiqueta').textContent = estado.tipo === 'fechaHora' ? estado.etiqueta : `${estado.etiqueta} · ${estado.campoLabel}`;

  const campoValor = document.getElementById('anadirHoraValor');
  campoValor.type = estado.tipo === 'fechaHora' ? 'datetime-local' : (estado.tipo === 'numero' ? 'number' : 'text');
  campoValor.placeholder = estado.tipo === 'fechaHora' ? '' : (estado.campoPlaceholder || '');
  if (estado.tipo === 'fechaHora') {
    const [dia, mes, anio] = dato.fecha.split('/');
    campoValor.value = `${anio}-${mes}-${dia}T${dato.hora}`;
  } else {
    campoValor.value = dato.valor || '';
  }
  limpiarErrorCampo(campoValor);

  const campoComentario = document.getElementById('anadirHoraComentario');
  campoComentario.value = dato.comentario || '';
  autoAjustarTextareaMovil(campoComentario);
  document.getElementById('dictadoTexto').textContent = 'Toca el micrófono para dictar el comentario.';
  document.getElementById('btnMicrofono').classList.remove('grabando');

  abrirModal('modalAnadirHora');
}

// Cerrar/Cancelar el modal: si se estaba editando un estado desde
// "Horario", regresa a esa línea de tiempo en vez de dejar todo cerrado.
function cancelarAnadirHora() {
  const editando = !!claveEstadoEditando;
  const idx = indiceOperacionActiva;
  claveEstadoEditando = null;
  cerrarModal('modalAnadirHora');
  if (editando) abrirModalHorario(idx);
}

// Dictado por voz simulado: no usa la Web Speech API real (decisión del
// usuario), solo anima el botón y, tras un instante, inserta una frase demo.
function iniciarDictadoSimulado() {
  const btn = document.getElementById('btnMicrofono');
  const texto = document.getElementById('dictadoTexto');
  const campo = document.getElementById('anadirHoraComentario');

  btn.classList.add('grabando');
  texto.textContent = 'Escuchando…';

  setTimeout(() => {
    const frase = FRASES_DICTADO_DEMO[Math.floor(Math.random() * FRASES_DICTADO_DEMO.length)];
    campo.value = campo.value ? `${campo.value} ${frase}` : frase;
    autoAjustarTextareaMovil(campo);
    btn.classList.remove('grabando');
    texto.textContent = 'Comentario dictado. Puedes editarlo si lo necesitas.';
  }, 1400);
}

function guardarAnadirHora() {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  const estado = claveEstadoEditando
    ? ESTADOS_OPERACION_MOVIL.find(e => e.clave === claveEstadoEditando)
    : obtenerSiguienteEstadoPendiente(op);
  if (!estado) { cerrarModal('modalAnadirHora'); return; }

  const campoValor = document.getElementById('anadirHoraValor');
  const comentario = document.getElementById('anadirHoraComentario').value.trim();

  if (!campoValor.value) {
    mostrarErrorCampo(campoValor, estado.tipo === 'fechaHora' ? 'Selecciona fecha y hora' : `Ingresa ${estado.campoLabel.toLowerCase()}`);
    return;
  }

  if (estado.tipo === 'fechaHora') {
    const [fechaParte, horaParte] = campoValor.value.split('T');
    const [anio, mes, dia] = fechaParte.split('-');
    op.estados[estado.clave] = { fecha: `${dia}/${mes}/${anio}`, hora: horaParte, comentario };
  } else {
    op.estados[estado.clave] = { valor: campoValor.value.trim(), comentario };
  }

  const editando = !!claveEstadoEditando;
  claveEstadoEditando = null;
  cerrarModal('modalAnadirHora');
  renderOperacionesAsignadas();

  if (editando) {
    abrirModalHorario(indiceOperacionActiva);
    mostrarModalConfirmacionMovil(`${estado.etiqueta} actualizado correctamente.`);
  } else {
    mostrarModalGuardado('crear', null, () => {});
  }
}

// =================================================
// HORARIO — línea de tiempo de estados
// =================================================
function abrirModalHorario(indice) {
  indiceOperacionActiva = indice;
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indice];
  document.getElementById('tituloModalHorario').textContent = `Horario — ${op.codigo}`;
  document.getElementById('horarioLockNota').style.display = op.revisadoPorSistema ? 'flex' : 'none';
  renderTimelineEstados();
  abrirModal('modalHorario');
}

function renderTimelineEstados() {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  const bloqueado = op.revisadoPorSistema;
  const cont = document.getElementById('timelineEstados');

  const iconoTipo = {
    fechaHora: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    numero: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>',
    texto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
  };

  cont.innerHTML = ESTADOS_OPERACION_MOVIL.map((e, i) => {
    const dato = op.estados[e.clave];
    const completado = estadoEstaCompletado(e, dato);
    const detalle = !completado
      ? 'Pendiente de registrar'
      : (e.tipo === 'fechaHora' ? `${dato.fecha} · ${horaA12(dato.hora)}` : dato.valor);
    return `
      <div class="timeline-item ${completado ? 'completado' : ''}">
        <div class="timeline-punto">
          ${completado
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>'
            : `<span class="timeline-punto-numero">${i + 1}</span>`}
        </div>
        <div class="timeline-cuerpo">
          <div class="timeline-cabecera">
            <div class="timeline-etiqueta">${iconoTipo[e.tipo]}<span>${i + 1}. ${e.etiqueta}</span></div>
            ${completado && !bloqueado ? `<button type="button" class="timeline-editar" onclick="abrirModalEditarEstado('${e.clave}')" title="Editar ${e.etiqueta}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>` : ''}
          </div>
          <div class="timeline-detalle">${detalle}</div>
          ${dato.comentario ? `<div class="timeline-comentario">"${dato.comentario}"</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// =================================================
// ASIGNAR PRECINTO — usa los precintos que la Asignación de Precintos hecha
// desde el sistema (ASIGNACIONES_PRECINTOS_DEMO) le entregó al Inspector
// que reporta, y escribe el uso directamente en GENERAR_REGISTROS_PRECINTOS_DEMO,
// la misma fuente que muestra Precintos > Reporte de Precintos > Detalle.
// =================================================

// data-movil.js guarda la operación en inglés (Loading/Discharging, viene
// así desde Seguimiento de Operaciones); el resto del sistema (seed de
// data-precintos.js, cartola, descarga) ya usa español. Se traduce acá, en
// el único lugar donde op.operacion se copia a tipoOperacion al guardar un
// uso — op.operacion en sí no se toca, así que ningún otro módulo que ya
// lo lee se ve afectado (Sprint 4, cierre §B.1).
const TIPO_OPERACION_MOVIL_A_ESPANOL = { Loading: 'Carga', Discharging: 'Descarga' };
function tipoOperacionEnEspanol(operacion) {
  return TIPO_OPERACION_MOVIL_A_ESPANOL[operacion] || operacion;
}

// Precintos disponibles de la operación activa y los que el operador ya
// marcó — se guardan aparte del DOM porque el buscador filtra qué se ve en
// el checklist, y una marca no debe perderse solo porque el precinto quedó
// oculto por el filtro de búsqueda. "Uso" y "Scrap" son dos pestañas sobre
// el mismo pool de precintos disponibles, cada una con su propia marca —
// así no se mezclan ambos sentidos del mismo botón "Guardar".
let precintosDisponiblesModal = [];
let precintosSeleccionadosModal = new Set();      // pestaña "Uso"
let precintosSeleccionadosScrapModal = new Set(); // pestaña "Scrap"
let vistaAsignarPrecinto = 'uso'; // 'uso' o 'scrap'

function seleccionActivaAsignarPrecinto() {
  return vistaAsignarPrecinto === 'scrap' ? precintosSeleccionadosScrapModal : precintosSeleccionadosModal;
}

function abrirModalAsignarPrecinto(indice) {
  // Defensa en profundidad: el botón ya queda bloqueado en
  // renderOperacionesAsignadas si la jornada sigue 'pendiente' o ya quedó
  // 'cerrada', pero se revalida acá por si se llega a esta función de otra
  // forma.
  const sesionGate = obtenerUsuarioActual();
  const estadoGate = sesionGate ? obtenerJornadaActiva(sesionGate.usuario).estado : null;
  if (estadoGate === 'pendiente') {
    mostrarToast('Comienza tu día primero para poder asignar precintos: el reporte de precintos al Finalizar el día depende de eso.');
    return;
  }
  if (estadoGate === 'cerrada') {
    mostrarToast('Ya finalizaste tu jornada: no se pueden asignar más precintos.');
    return;
  }

  indiceOperacionActiva = indice;
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indice];
  document.getElementById('tituloModalAsignarPrecinto').textContent = `Asignar Precinto — ${op.codigo}`;

  // La Asignación de Precintos ya no lleva PER: se juntan todas las
  // Asignaciones que el Supervisor le entregó a este operador (recibidoPor =
  // usuario en sesión), y se descuenta de cada una lo que ya quedó
  // registrado en su propio Detalle (Generar Registro) o reportado como
  // scrap — ninguno de los dos vuelve a aparecer en el checklist.
  const sesion = obtenerUsuarioActual();
  const asignaciones = ASIGNACIONES_PRECINTOS_DEMO.filter(a => a.recibidoPor === sesion.usuario);

  const sinDatos = document.getElementById('asignarPrecintoSinDatos');
  const form = document.getElementById('asignarPrecintoForm');
  const btnGuardar = document.getElementById('btnGuardarAsignarPrecinto');

  if (!asignaciones.length) {
    sinDatos.style.display = 'block';
    form.style.display = 'none';
    btnGuardar.style.display = 'none';
    abrirModal('modalAsignarPrecinto');
    return;
  }
  sinDatos.style.display = 'none';
  form.style.display = 'block';
  btnGuardar.style.display = '';

  // El pool sale directo de las Asignaciones, sin depender de que ya exista
  // su Detalle/GRP: una Asignación recién entregada (nadie reportó nada
  // todavía) antes mostraba "sin datos" solo porque faltaba ese registro
  // vacío — se crea en el momento si hace falta (Sprint 4, prompt §4.1).
  const registros = asignaciones.map(a => {
    asegurarReportePrecinto(a.id, a.registroCodigos);
    return obtenerGenerarRegistroPorAsignacion(a.id);
  });
  guardarEstadoPrecintos();

  const pool = asignaciones.flatMap(a => a.precintos);
  const usados = registros.flatMap(r => r.detalle.map(d => d.precinto));
  const scrapYaReportado = asignaciones.flatMap(a => (a.scrap || []).map(s => s.precinto));
  precintosDisponiblesModal = pool.filter(p => !usados.includes(p) && !scrapYaReportado.includes(p));
  precintosSeleccionadosModal = new Set();
  precintosSeleccionadosScrapModal = new Set();

  document.getElementById('asignarPrecintoPer').value = op.per;
  document.getElementById('asignarPrecintoBuscar').value = '';

  const hoyISO = obtenerFechaHoyISO();
  const fechaInput = document.getElementById('asignarPrecintoFecha');
  fechaInput.value = hoyISO;
  fechaInput.max = hoyISO; // B.5: no se puede elegir una fecha futura
  limpiarErrorCampo(fechaInput);
  document.getElementById('asignarPrecintoObservacion').value = '';
  document.getElementById('asignarPrecintoUsados').textContent =
    `${usados.length + scrapYaReportado.length} de ${pool.length} precintos asignados a este operador ya fueron registrados (uso o scrap).`;

  cambiarVistaAsignarPrecinto('uso');
  abrirModal('modalAsignarPrecinto');
}

// Cambia entre "Uso" (reportar un precinto instalado) y "Scrap" (reportar un
// precinto dañado) dentro del mismo modal — mismo pool de precintos
// disponibles, pero cada pestaña tiene su propia marca y su propio campo de
// texto (Observación vs. Motivo del daño) para no perder lo tipeado al
// alternar.
function cambiarVistaAsignarPrecinto(vista) {
  vistaAsignarPrecinto = vista;
  document.getElementById('btnTabAsignarUso').classList.toggle('activo', vista === 'uso');
  document.getElementById('btnTabAsignarScrap').classList.toggle('activo', vista === 'scrap');

  const label = document.getElementById('asignarPrecintoObservacionLabel');
  const input = document.getElementById('asignarPrecintoObservacion');
  // Chips de motivos frecuentes y contador de caracteres (B.5 cierre, §5
  // móvil): solo tienen sentido en Scrap, donde el motivo es obligatorio y
  // tiene tope de 200 caracteres — Observación (Uso) sigue libre y opcional.
  document.getElementById('asignarPrecintoMotivoChips').style.display = vista === 'scrap' ? 'flex' : 'none';
  document.getElementById('asignarPrecintoObservacionContador').style.display = vista === 'scrap' ? '' : 'none';
  if (vista === 'scrap') {
    label.textContent = 'Motivo del daño';
    input.placeholder = 'Ej. Cuerpo plástico roto';
  } else {
    label.textContent = 'Observación (opcional)';
    input.placeholder = '';
  }
  actualizarContadorObservacion();

  filtrarChecklistPrecintos(document.getElementById('asignarPrecintoBuscar').value);
}

// Contador de caracteres del campo Motivo/Observación (máx. 200, ver
// maxlength en el HTML) y relleno rápido desde un motivo frecuente — el
// texto queda editable después de elegir un chip (Sprint 4, cierre §5).
function actualizarContadorObservacion() {
  const input = document.getElementById('asignarPrecintoObservacion');
  const contador = document.getElementById('asignarPrecintoObservacionContador');
  if (contador) contador.textContent = `${input.value.length}/200`;
}

function elegirMotivoFrecuente(texto) {
  const input = document.getElementById('asignarPrecintoObservacion');
  input.value = texto;
  actualizarContadorObservacion();
  limpiarErrorCampo(input);
}

// El checklist permite marcar más de un precinto disponible (los que ya
// están registrados en el sistema como asignados a este operador, vía
// ASIGNACIONES_PRECINTOS_DEMO) y registrarlos todos juntos al Guardar. Las
// marcas se guardan en precintosSeleccionadosModal/precintosSeleccionadosScrapModal
// (no solo en el DOM) para que sobrevivan al filtrado del buscador y al
// cambio de pestaña.
// B.4: se agrupa por material (el material de cada precinto sale de su
// lote de origen, ver obtenerLoteDePrecinto) con un encabezado "N
// disponibles" por grupo — más fácil de escanear visualmente que una sola
// lista plana cuando el operador tiene varios materiales a la vez.
function renderChecklistPrecintos(lista) {
  const cont = document.getElementById('asignarPrecintoChecklist');
  const seleccionados = seleccionActivaAsignarPrecinto();
  if (!lista.length) {
    cont.innerHTML = `<span class="precinto-check-vacio">${precintosDisponiblesModal.length ? 'Ningún precinto coincide con la búsqueda.' : 'No quedan precintos disponibles en este rango.'}</span>`;
    return;
  }

  // Lista plana, sin agrupar ni mostrar el material (§ simplificación).
  const ordenados = [...lista].sort((a, b) => numeroDePrecinto(a) - numeroDePrecinto(b));
  cont.innerHTML = ordenados.map(p => `
    <label class="precinto-check-item">
      <input type="checkbox" value="${p}" ${seleccionados.has(p) ? 'checked' : ''} onchange="alternarSeleccionPrecinto('${p}', this.checked)">
      <span>${p}</span>
    </label>`).join('');
}

function alternarSeleccionPrecinto(codigo, marcado) {
  const seleccionados = seleccionActivaAsignarPrecinto();
  if (marcado) seleccionados.add(codigo);
  else seleccionados.delete(codigo);
}

function filtrarChecklistPrecintos(texto) {
  const q = texto.trim().toUpperCase();
  const filtrados = q ? precintosDisponiblesModal.filter(p => p.toUpperCase().includes(q)) : precintosDisponiblesModal;
  renderChecklistPrecintos(filtrados);
}

function guardarAsignarPrecinto() {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  const precintosMarcados = Array.from(seleccionActivaAsignarPrecinto());
  const fechaInput = document.getElementById('asignarPrecintoFecha');
  const observacionInput = document.getElementById('asignarPrecintoObservacion');
  // Motivo/Observación recortado (trim) y con tope de 200 caracteres (el
  // maxlength del input ya lo limita al tipear, esto cubre un pegado que lo
  // exceda) — Sprint 4, cierre §5.
  const observacion = observacionInput.value.trim().slice(0, 200);

  if (!precintosMarcados.length) { mostrarToast('Selecciona al menos un precinto para registrar.'); return; }
  if (!fechaInput.value) { mostrarErrorCampo(fechaInput, 'Selecciona una fecha'); return; }

  // B.5: el atributo "max" ya bloquea la fecha futura en el selector nativo,
  // pero se valida también acá por si el navegador no lo respeta.
  if (fechaInput.value > obtenerFechaHoyISO()) { mostrarErrorCampo(fechaInput, 'La fecha no puede ser futura'); return; }

  if (vistaAsignarPrecinto === 'scrap' && !observacion) { mostrarErrorCampo(observacionInput, 'Indica el motivo del daño'); return; }

  if (vistaAsignarPrecinto === 'scrap') {
    // B.8: el scrap no se puede deshacer, así que se confirma antes de
    // escribir nada — el motivo ya quedó validado como obligatorio arriba.
    confirmarAccion(
      `¿Marcar ${precintosMarcados.length} precinto${precintosMarcados.length > 1 ? 's' : ''} como scrap? No se puede deshacer.`,
      () => guardarAsignarPrecintoConfirmado(op, precintosMarcados, fechaInput.value, observacion)
    );
    return;
  }

  guardarAsignarPrecintoConfirmado(op, precintosMarcados, fechaInput.value, observacion);
}

// Escritura real del Uso o Scrap, ya validada — separada de
// guardarAsignarPrecinto para que el scrap pueda pasar primero por la
// confirmación de B.8 sin duplicar la validación ni el guardado.
function guardarAsignarPrecintoConfirmado(op, precintosMarcados, fechaValor, observacion) {
  const sesion = obtenerUsuarioActual();
  const [anio, mes, dia] = fechaValor.split('-');
  const fecha = `${dia}/${mes}/${anio}`;

  if (vistaAsignarPrecinto === 'scrap') {
    // El detalle (quién lo reportó, cuándo y por qué) queda en el propio
    // campo "scrap" de la Asignación — misma fuente que ya lee Reporte de
    // Precintos (Detalle del Precinto, cartola "Por rango") y Asignación de
    // Precintos (Ver detalle/Editar) para mostrar un precinto como scrap.
    precintosMarcados.forEach(precinto => {
      const asignacion = obtenerAsignacionDePrecinto(precinto);
      if (!asignacion) return;
      if (!asignacion.scrap) asignacion.scrap = [];
      asignacion.scrap.push({ precinto, fecha, colaborador: sesion.usuario, motivo: observacion, per: op.per, terminal: op.terminal, viaje: op.nroViaje });
    });

    guardarEstadoPrecintos();
    cerrarModal('modalAsignarPrecinto');
    mostrarModalGuardado('crear', `${precintosMarcados.length > 1 ? 'Los precintos quedarán marcados' : 'El precinto quedará marcado'} como scrap en Reporte de Precintos.`, () => {});
    return;
  }

  // Cada precinto marcado puede venir de una Asignación distinta (el
  // operador puede tener más de una vigente), así que el uso se registra en
  // el Detalle/GRP propio de la Asignación a la que ese precinto pertenece.
  precintosMarcados.forEach(precinto => {
    const asignacion = obtenerAsignacionDePrecinto(precinto);
    const registro = asignacion ? obtenerGenerarRegistroPorAsignacion(asignacion.id) : null;
    if (!registro) return;
    // tipoOperacion en español (Sprint 4, cierre §B.1 — ver
    // tipoOperacionEnEspanol): op.operacion sigue en inglés tal cual lo usa
    // Seguimiento de Operaciones, solo se traduce al copiarlo acá.
    registro.detalle.push({
      colaborador: sesion.usuario,
      precinto,
      viaje: op.nroViaje,
      tipoOperacion: tipoOperacionEnEspanol(op.operacion),
      terminal: op.terminal,
      fecha,
      observacion
    });
  });

  guardarEstadoPrecintos();
  cerrarModal('modalAsignarPrecinto');
  mostrarModalGuardado('crear', `${precintosMarcados.length > 1 ? 'Los precintos quedarán' : 'El precinto quedará'} visible en Reporte de Precintos.`, () => {});
}

// =================================================
// ESCANEAR PRECINTO — pide la cámara real del dispositivo (con linterna
// para poca iluminación) en vez de tener que escribir el código a mano. El
// botón-cámara lee el cuadro actual del video con la BarcodeDetector API
// nativa del navegador (code_128/qr_code/ean_13/code_39 — los formatos que
// de verdad se imprimen en un precinto); si el navegador no la soporta, se
// mantiene la cámara pero se avisa que hay que escribir el código a mano.
// Modo "Único": cada captura cierra el modal al toque (como antes). Modo
// "Varios": la cámara se queda abierta para ir tomando una por una — cada
// toma se agrega a la selección y a la lista de abajo; "Listo" cierra
// cuando el operador termina.
// =================================================
let escanerPrecintoStream = null;
let escanerPrecintoLinternaOn = false;
let escanerPrecintoDetector = null;
let escanerPrecintoModo = 'varios';
let escanerPrecintoCapturados = [];

function abrirModalEscanearPrecinto() {
  document.getElementById('escanerSinCamara').style.display = 'none';
  escanerPrecintoLinternaOn = false;
  document.getElementById('escanerBtnLinterna').classList.remove('activa');
  cambiarModoEscaner('varios');
  escanerPrecintoCapturados = [];
  renderEscanerCapturados();
  abrirModal('modalEscanearPrecinto');
  iniciarCamaraEscanerPrecinto();
}

async function iniciarCamaraEscanerPrecinto() {
  const video = document.getElementById('escanerVideo');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById('escanerSinCamara').style.display = 'flex';
    return;
  }
  try {
    escanerPrecintoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = escanerPrecintoStream;
  } catch (err) {
    document.getElementById('escanerSinCamara').style.display = 'flex';
    return;
  }

  escanerPrecintoDetector = null;
  if ('BarcodeDetector' in window) {
    try {
      escanerPrecintoDetector = new BarcodeDetector({ formats: ['code_128', 'qr_code', 'ean_13', 'code_39'] });
    } catch (err) {
      escanerPrecintoDetector = null;
    }
  }
}

function detenerCamaraEscanerPrecinto() {
  if (escanerPrecintoStream) {
    escanerPrecintoStream.getTracks().forEach(t => t.stop());
    escanerPrecintoStream = null;
  }
  const video = document.getElementById('escanerVideo');
  if (video) video.srcObject = null;
}

async function alternarLinternaEscaner() {
  const track = escanerPrecintoStream && escanerPrecintoStream.getVideoTracks()[0];
  if (!track) { mostrarToast('Activa la cámara para poder usar la linterna.'); return; }

  const capacidades = track.getCapabilities ? track.getCapabilities() : {};
  if (!capacidades.torch) { mostrarToast('Este dispositivo no permite controlar la linterna.'); return; }

  const nuevoEstado = !escanerPrecintoLinternaOn;
  try {
    await track.applyConstraints({ advanced: [{ torch: nuevoEstado }] });
    escanerPrecintoLinternaOn = nuevoEstado;
    document.getElementById('escanerBtnLinterna').classList.toggle('activa', escanerPrecintoLinternaOn);
  } catch (err) {
    mostrarToast('No se pudo activar la linterna.');
  }
}

function cerrarModalEscanearPrecinto() {
  detenerCamaraEscanerPrecinto();
  cerrarModal('modalEscanearPrecinto');
}

// Único = cada captura cierra el modal al toque; Varios = se queda abierto
// para seguir tomando (la cámara no se corta entre una captura y otra).
function cambiarModoEscaner(modo) {
  escanerPrecintoModo = modo;
  document.getElementById('btnEscanerModoUnico').classList.toggle('activo', modo === 'unico');
  document.getElementById('btnEscanerModoVarios').classList.toggle('activo', modo === 'varios');
}

function renderEscanerCapturados() {
  const cont = document.getElementById('escanerCapturados');
  if (!cont) return;
  if (!escanerPrecintoCapturados.length) { cont.style.display = 'none'; cont.innerHTML = ''; return; }
  cont.style.display = '';
  cont.innerHTML = `<span class="escaner-capturados-titulo">${escanerPrecintoCapturados.length} capturado${escanerPrecintoCapturados.length === 1 ? '' : 's'}:</span>
    ${escanerPrecintoCapturados.map(c => `<span class="gastos-faltante-chip olvidos-chip" style="color:#065F46;background:#D1FAE5;">${c}</span>`).join('')}`;
}

// Lee el código del cuadro actual del video con BarcodeDetector; se valida
// contra precintosDisponiblesModal (no contra el DOM del checklist) para
// que el escaneo funcione aunque el buscador tenga un filtro activo
// ocultando ese precinto de la vista.
async function capturarEscaneoPrecinto() {
  if (!escanerPrecintoDetector) {
    mostrarToast('Tu navegador no lee códigos; escribe el número en el buscador.');
    document.getElementById('asignarPrecintoBuscar')?.focus();
    return;
  }

  const video = document.getElementById('escanerVideo');
  let codigos;
  try {
    codigos = await escanerPrecintoDetector.detect(video);
  } catch (err) {
    codigos = [];
  }

  if (!codigos.length) { mostrarToast('No se detectó ningún código, intenta de nuevo.'); return; }

  const codigoLeido = codigos[0].rawValue.trim();
  if (!precintosDisponiblesModal.includes(codigoLeido)) {
    mostrarToast('Este precinto no está asignado a ti o ya fue reportado.');
    return;
  }
  if (escanerPrecintoCapturados.includes(codigoLeido)) {
    mostrarToast(`${codigoLeido} ya estaba capturado.`);
    return;
  }

  seleccionActivaAsignarPrecinto().add(codigoLeido);
  document.getElementById('asignarPrecintoBuscar').value = '';
  renderChecklistPrecintos(precintosDisponiblesModal);

  if (escanerPrecintoModo === 'unico') {
    detenerCamaraEscanerPrecinto();
    cerrarModal('modalEscanearPrecinto');
    mostrarToast(`Precinto ${codigoLeido} leído correctamente.`);
  } else {
    escanerPrecintoCapturados.push(codigoLeido);
    renderEscanerCapturados();
    mostrarToast(`Precinto ${codigoLeido} agregado (${escanerPrecintoCapturados.length}). Sigue capturando o toca Listo.`);
  }
}

// =================================================
// ACTUALIZAR PRODUCTO — el catálogo de sugerencias viene de Tablas
// Generales (cargarProductos, en data-tablas-generales.js), la misma
// fuente que usa el sistema web; si el producto que se necesita no está
// registrado ahí, el operador puede igual escribirlo y agregarlo como
// texto libre (agregarProductoOperacion no valida contra el catálogo).
// =================================================
// Mientras el modal está abierto, agregar/quitar un producto ya se refleja
// al instante en op.productos (para que los chips se vean actualizados);
// se guarda una copia al abrir para poder descartar los cambios con
// "Cancelar" y dejar la operación como estaba.
let productosSnapshotModal = null;

function abrirModalActualizarProducto(indice) {
  indiceOperacionActiva = indice;
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indice];
  productosSnapshotModal = [...op.productos];
  document.getElementById('tituloModalActualizarProducto').textContent = `Productos — ${op.codigo}`;
  document.getElementById('nuevoProductoInput').value = '';
  document.getElementById('productoSugerenciasMovil').classList.remove('open');
  renderChipsActualizarProducto();
  abrirModal('modalActualizarProducto');
}

function guardarActualizarProducto() {
  cerrarModal('modalActualizarProducto');
  renderProductosChips(indiceOperacionActiva);
  mostrarModalConfirmacionMovil('Productos actualizados correctamente.');
}

function cancelarActualizarProducto() {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  if (productosSnapshotModal) op.productos = [...productosSnapshotModal];
  cerrarModal('modalActualizarProducto');
  renderProductosChips(indiceOperacionActiva);
}

function buscarProductosSugeridosMovil(texto) {
  const cont = document.getElementById('productoSugerenciasMovil');
  if (!cont) return;
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  const q = texto.trim().toLowerCase();

  const catalogo = typeof cargarProductos === 'function' ? cargarProductos() : [];
  const disponibles = catalogo.filter(p => !op.productos.includes(p.nombre));
  const coincidencias = q ? disponibles.filter(p => p.nombre.toLowerCase().includes(q)) : disponibles;

  if (!coincidencias.length) {
    cont.innerHTML = `<div class="movil-sugerencia-vacia">${q ? 'Sin coincidencias en el catálogo — toca Agregar para usar este texto' : 'Todos los productos del catálogo ya fueron agregados'}</div>`;
  } else {
    cont.innerHTML = coincidencias.map(p => `
      <div class="movil-sugerencia" onclick="seleccionarProductoSugeridoMovil('${p.nombre.replace(/'/g, "\\'")}')">${p.nombre}</div>
    `).join('');
  }
  cont.classList.add('open');
}

function seleccionarProductoSugeridoMovil(nombre) {
  const input = document.getElementById('nuevoProductoInput');
  if (input) input.value = nombre;
  document.getElementById('productoSugerenciasMovil')?.classList.remove('open');
}

document.addEventListener('click', e => {
  const cont = document.getElementById('productoSugerenciasMovil');
  if (!cont || !cont.classList.contains('open')) return;
  if (!cont.closest('.movil-form-group').contains(e.target)) cont.classList.remove('open');
});

function renderChipsActualizarProducto() {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  const cont = document.getElementById('actualizarProductoChips');
  cont.innerHTML = op.productos.length
    ? op.productos.map((p, i) => `
        <span class="op-producto-chip">${p}
          <button type="button" onclick="quitarProductoOperacion(${i})" title="Quitar">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </span>`).join('')
    : `<span style="font-size:10px;color:var(--gray-400);">Sin productos registrados.</span>`;
}

function agregarProductoOperacion() {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  const input = document.getElementById('nuevoProductoInput');
  const valor = input.value.trim();
  if (!valor) { mostrarErrorCampo(input, 'Ingresa un producto'); return; }
  if (op.productos.includes(valor)) { mostrarToast('Ese producto ya está registrado.'); return; }

  op.productos.push(valor);
  input.value = '';
  renderChipsActualizarProducto();
  renderProductosChips(indiceOperacionActiva);
}

function quitarProductoOperacion(indice) {
  const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO[indiceOperacionActiva];
  op.productos.splice(indice, 1);
  renderChipsActualizarProducto();
  renderProductosChips(indiceOperacionActiva);
}

document.addEventListener('DOMContentLoaded', inicializarOperacionesMovil);
