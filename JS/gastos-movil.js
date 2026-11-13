// =================================================
// GASTOS-MOVIL.JS
// App Móvil > Generar Reporte + Reportes (Sprint 4 Fase 2/3) — solo
// operadores/inspectores, misma sesión que Precintos
// (sessionStorage.sesionUsuario). Alimentos y Movilidad se registran acá;
// Días a Bordo es de solo lectura (se genera solo, ver data-gastos.js →
// generarDiasABordoOperador). Todo lo que se guarda va a las mismas
// estructuras que lee Registro de Gastos Operativos (DETALLE_*_DEMO vía
// asegurarReporteGasto/guardarEstadoGastos), para que el supervisor lo vea
// de inmediato.
//
// Un solo archivo sirve DOS páginas (gastos-movil.html "Generar Reporte" y
// reportes-movil.html "Reportes"): cada función de render consulta primero
// si el elemento de SU página existe antes de tocarlo, así cualquiera de
// las dos puede cargar este script sin que la otra reviente por un id que
// no tiene.
//
// Reportes > Descargar: el operador valida su huella (simulado, igual que
// la geolocalización simulada de Operaciones) y el sistema firma y genera
// el mismo archivo que vería el supervisor (ver descarga-gastos.js) — con
// la misma marca de agua de "descargado desde este sistema". El operador
// lo sube él mismo a su otro aplicativo.
// =================================================

function actualizarHoraStatusBarGastos() {
  const el = document.getElementById('horaStatusBar');
  if (!el) return;
  const ahora = new Date();
  const pad = n => String(n).padStart(2, '0');
  el.textContent = horaA12(`${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`);
}
actualizarHoraStatusBarGastos();
setInterval(actualizarHoraStatusBarGastos, 15000);

// Período + ids de ESTE operador resueltos una vez al cargar la página (ver
// asegurarReporteGasto, data-gastos.js) — todo el módulo guarda/lee contra
// estos 3 ids mientras la página está abierta.
let gastosMovilPeriodo = null;
let gastosMovilUsuario = null;

// Rango y nombre del período mostrado + estado de las flechas.
// Selector de período de Reportes: el período actual y los anteriores con jornadas.
function poblarSelectorPeriodoReportes() {
  const sel = document.getElementById('reportesPeriodo');
  if (!sel || !gastosMovilPeriodo) return;
  const opciones = [];
  let ref = hoyISO();
  for (let i = 0; i < 36; i++) {
    const pe = primerYUltimoDiaDelMes(ref);
    if (i > 0 && !periodoTieneActividad(ref)) break;
    const nombre = (typeof asegurarPeriodoGastoNombrado === 'function') ? asegurarPeriodoGastoNombrado(pe.primero, pe.ultimo) : `${pe.primero} al ${pe.ultimo}`;
    opciones.push({ valor: fechaDDMMYYYYaISO(pe.primero), texto: String(nombre).replace(/^Período\s+/i, '') });
    ref = desplazarFechaISO(fechaDDMMYYYYaISO(pe.primero), -1);
  }
  sel.innerHTML = opciones.map(o => `<option value="${o.valor}">${o.texto}</option>`).join('');
  sel.value = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaDesde);
}

// Elegir un período desde el selector (valor = primer día del período, ISO).
function elegirPeriodoReportes(fechaISO) {
  if (!fechaISO || fechaISO > hoyISO()) return;
  gastosMovilPeriodo = asegurarReporteGasto(gastosMovilUsuario, fechaISO);
  guardarEstadoGastos();
  // El rango de fechas del filtro pertenecía al período anterior: se limpia.
  reportesFechaFiltro = '';
  const f = document.getElementById('reportesFecha');
  if (f) f.value = '';
  actualizarEtiquetaPeriodo();
  renderTarjetasGastos();
  renderReportesAccordion();
}

function actualizarEtiquetaPeriodo() {
  const elPeriodo = document.getElementById('gastosPeriodoRango');
  if (elPeriodo) elPeriodo.textContent = `${gastosMovilPeriodo.fechaDesde} al ${gastosMovilPeriodo.fechaHasta}`;
  // Mismo nombre que ya maneja la web en Control de Precintos > Configuración
  // > Configuración de Períodos — lo crea si hace falta (ver
  // asegurarPeriodoGastoNombrado en data-gastos.js).
  const nombrePeriodo = (typeof asegurarPeriodoGastoNombrado === 'function')
    ? asegurarPeriodoGastoNombrado(gastosMovilPeriodo.fechaDesde, gastosMovilPeriodo.fechaHasta)
    : `${gastosMovilPeriodo.fechaDesde} al ${gastosMovilPeriodo.fechaHasta}`;
  setTexto('gastosPeriodoNombre', nombrePeriodo);

  poblarSelectorPeriodoReportes();
  const campoFecha = document.getElementById('reportesFecha');
  if (campoFecha) {
    campoFecha.min = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaDesde);
    campoFecha.max = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaHasta); // fin del período (10→09), no solo hasta hoy
  }
  const actual = esPeriodoActualGastos();
  const sig = document.getElementById('btnPeriodoSiguiente');
  if (sig) sig.disabled = actual;
  const ant = document.getElementById('btnPeriodoAnterior');
  if (ant) ant.disabled = !periodoTieneActividad(desplazarFechaISO(fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaDesde), -1));

}

function desplazarFechaISO(fechaISO, dias) {
  const d = new Date(`${fechaISO}T00:00:00`);
  d.setDate(d.getDate() + dias);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function esPeriodoActualGastos() {
  return primerYUltimoDiaDelMes(hoyISO()).primero === gastosMovilPeriodo.fechaDesde;
}

// Solo se navega a períodos donde el operador tiene jornadas (no se crean
// reportes vacíos de períodos sin actividad).
function periodoTieneActividad(fechaReferenciaISO) {
  const { primero, ultimo } = primerYUltimoDiaDelMes(fechaReferenciaISO);
  const desde = fechaDDMMYYYYaISO(primero), hasta = fechaDDMMYYYYaISO(ultimo);
  return Object.values(JORNADAS_MOVIL_DEMO).some(j => j.usuario === gastosMovilUsuario && j.fecha >= desde && j.fecha <= hasta);
}

// Flechas ‹ › de la tarjeta de período: cambia el período mostrado (todo el
// módulo trabaja contra gastosMovilPeriodo).
function cambiarPeriodoGastos(delta) {
  const referencia = delta < 0
    ? desplazarFechaISO(fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaDesde), -1)
    : desplazarFechaISO(fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaHasta), 1);
  if (referencia > hoyISO()) return;
  if (delta < 0 && !periodoTieneActividad(referencia)) return;
  gastosMovilPeriodo = asegurarReporteGasto(gastosMovilUsuario, referencia);
  reportesFechaFiltro = ''; // la fecha elegida era del período anterior
  const campoFecha = document.getElementById('reportesFecha');
  if (campoFecha) campoFecha.value = '';
  guardarEstadoGastos();
  actualizarEtiquetaPeriodo();
  renderTarjetasGastos();
  renderReportesAccordion();
}

// Última fecha registrable del período mostrado: hoy, o el fin del período
// si es uno anterior.
function fechaMaxPeriodo() {
  const hasta = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaHasta);
  return hasta < hoyISO() ? hasta : hoyISO();
}

function inicializarGastosMovil() {
  const sesion = obtenerUsuarioActual();
  if (!sesion) { window.location.href = 'login-movil.html'; return; }
  gastosMovilUsuario = sesion.usuario;

  const hoyISO = new Date().toISOString().slice(0, 10);
  gastosMovilPeriodo = asegurarReporteGasto(gastosMovilUsuario, hoyISO);
  guardarEstadoGastos();

  actualizarEtiquetaPeriodo();

  renderTarjetasGastos();
  renderReportesAccordion();

  // "Si faltan, pedirlos una vez" (§2 Fase 2): Cargo/Doc. Identidad del
  // colaborador — asegurarEncabezadoColaboradorGastos ya intentó resolver
  // el DNI desde el perfil de Precintos; si de verdad no hay nada, se pide
  // (solo en la página que tiene este modal, "Generar Reporte").
  const colaborador = COLABORADOR_GASTOS_DEMO[gastosMovilPeriodo.ids['Alimentos']] || {};
  if ((!colaborador.cargo || !colaborador.docIdentidad) && document.getElementById('encabezadoCargoInput')) {
    document.getElementById('encabezadoCargoInput').value = colaborador.cargo || '';
    document.getElementById('encabezadoDocIdentidadInput').value = colaborador.docIdentidad || '';
    abrirModal('modalEncabezadoGastos');
  }

  // Viene de una notificación de olvido en Operaciones (§2) — abre directo
  // "Agregar gasto olvidado" en esa fecha, misma mecánica que "Jornadas
  // recientes".
  const parametros = new URLSearchParams(window.location.search);
  const fechaOlvido = parametros.get('olvido');
  if (fechaOlvido && typeof irAJornadaDesdeGastos === 'function') irAJornadaDesdeGastos(fechaOlvido, parametros.get('tipo'));
}

function guardarEncabezadoGastos() {
  const cargoInput = document.getElementById('encabezadoCargoInput');
  const docInput = document.getElementById('encabezadoDocIdentidadInput');
  const cargo = cargoInput.value.trim();
  const docIdentidad = docInput.value.trim();

  if (!cargo) { mostrarErrorCampo(cargoInput, 'Ingresa tu cargo'); return; }
  if (!docIdentidad) { mostrarErrorCampo(docInput, 'Ingresa tu documento de identidad'); return; }

  // Se guarda en los 3 ids del período (Alimentos/Movilidad/Días a Bordo
  // comparten el mismo colaborador) para que calce en cualquiera de los 3
  // detalles que el supervisor abra en la web.
  Object.values(gastosMovilPeriodo.ids).forEach(id => {
    COLABORADOR_GASTOS_DEMO[id] = { cargo, docIdentidad };
  });
  guardarEstadoGastos();
  cerrarModal('modalEncabezadoGastos');
  mostrarToast('Datos guardados.');
}

/* =================================================
   "GASTOS" (home) — PROMPT_GASTOS_PANTALLAS_JORNADA_SPRINT4 §4: vista
   centrada en la jornada de HOY (tarjeta Jornada + 3 tarjetas de reporte de
   ESA jornada), más el resumen del período completo y las jornadas
   recientes (para corregir olvidos dentro del plazo).
================================================= */
function renderTarjetasGastos() {
  // Días a Bordo se regenera cada vez que se abre esta página (§1.2: "se
  // regenera al abrir/descargar") — así el operador ve el total real al
  // instante, sin tener que entrar a la web primero.
  regenerarDiasABordo(gastosMovilPeriodo.ids['Días a Bordo']);

  renderTarjetaJornadaHoy();
  renderTarjetasReporteDelDia();
  renderResumenPeriodoGastos();
  renderJornadasRecientesGastos();
}

function renderTarjetaJornadaHoy() {
  const cont = document.getElementById('gastosJornadaCard');
  if (!cont) return;
  const jornada = (typeof obtenerJornadaActiva === 'function') ? obtenerJornadaActiva(gastosMovilUsuario) : null;
  // La tarjeta de la jornada (y los reportes de la jornada) solo se muestran
  // si la jornada del día ya inició y se está viendo el período actual.
  const iniciada = !!(jornada && jornada.inicio);
  cont.style.display = (iniciada && esPeriodoActualGastos()) ? '' : 'none';
  if (!iniciada) return;
  // Operaciones asignadas: siempre las del operador (no varían si hubo o no
  // precintos ese día). Precintos usados sí es específico de la fecha de
  // esta jornada — se informan por separado (corrección pedida).
  const operaciones = obtenerOperacionesParaReporteJornada(gastosMovilUsuario, jornada);
  const precintos = jornada ? obtenerPrecintosDeJornada(gastosMovilUsuario, jornada.fecha) : [];

  const elFecha = document.getElementById('gastosJornadaFecha');
  const elEstado = document.getElementById('gastosJornadaEstado');
  const elInicio = document.getElementById('gastosJornadaInicio');
  const elFin = document.getElementById('gastosJornadaFin');
  const elOps = document.getElementById('gastosJornadaOperaciones');
  const elPrecintos = document.getElementById('gastosJornadaPrecintos');
  const elPlazo = document.getElementById('gastosJornadaPlazoOlvido');
  const btnVerPrecintos = document.getElementById('btnVerPrecintosJornada');
  if (btnVerPrecintos) {
    btnVerPrecintos.style.display = '';
    const txt = document.getElementById('btnVerPrecintosTexto');
    if (txt) txt.textContent = precintos.length ? `Precintos usados (${precintos.length})` : 'Precintos usados';
  }

  elOps.textContent = textoOperacionesInvolucradas(operaciones);

  if (!jornada || jornada.estado === 'pendiente') {
    elFecha.textContent = fechaISOaDDMMYYYY(hoyISO());
    elEstado.textContent = 'Sin iniciar'; elEstado.className = 'badge badge-gris';
    elInicio.textContent = '—'; elFin.textContent = '—';
    // Bug: acá se mostraba siempre "Sin precintos usados" a secas, sin
    // revisar el dato real — un operador puede marcar un precinto como
    // usado en una operación sin haber tocado antes "Comenzar el día" (no
    // hay ninguna validación que lo bloquee), así que "pendiente" no
    // significa "sin precintos". "precintos" ya se calculó arriba contra
    // la fecha real de hoy, úsese esté o no la jornada iniciada.
    elPrecintos.textContent = precintos.length ? `Sí (${precintos.length})` : 'Sin precintos usados';
    elPlazo.textContent = '';
    return;
  }

  const dia = DIAS_SEMANA[(new Date(jornada.fecha + 'T00:00:00').getDay() + 6) % 7];
  elFecha.textContent = `${dia} ${fechaISOaDDMMYYYY(jornada.fecha)}`;
  if (jornada.estado === 'abierta') { elEstado.textContent = 'Abierta'; elEstado.className = 'badge badge-por-vencer'; }
  else { elEstado.textContent = 'Cerrada'; elEstado.className = 'badge badge-gris'; }
  elInicio.textContent = `${jornada.inicio.fecha} ${horaA12(jornada.inicio.hora)}`;
  elFin.textContent = jornada.fin ? `${jornada.fin.fecha} ${horaA12(jornada.fin.hora)}` : 'Jornada abierta';
  elPrecintos.textContent = precintos.length ? `Sí (${precintos.length})` : 'Sin precintos usados';

  if (jornada.estado === 'cerrada' && jornada.fin) {
    const limite = new Date(new Date(jornada.fin.fechaHoraISO).getTime() + CONFIG_JORNADA_DEMO.plazoOlvidoHoras * 3600000);
    const vencido = Date.now() > limite.getTime();
    const pad = n => String(n).padStart(2, '0');
    const limiteTexto = `${pad(limite.getDate())}/${pad(limite.getMonth() + 1)} ${horaA12(`${pad(limite.getHours())}:${pad(limite.getMinutes())}`)}`;
    elPlazo.textContent = vencido ? 'Plazo para agregar olvidos vencido.' : `Puedes corregir hasta ${limiteTexto}.`;
  } else {
    elPlazo.textContent = '';
  }
}

// =================================================
// PRECINTOS DE LA JORNADA (botón "Precintos" de la tarjeta Jornada) —
// corrige lo que se marcó mal en Operaciones (usado/scrap por error): cada
// tarjeta se puede quitar y el precinto vuelve a quedar disponible. 2
// pestañas (Usado/Scrap), mismo diseño que el modal "Asignar Precinto" de
// Operaciones — antes era una sola lista mezclada, corrección pedida.
// =================================================
let gruposPrecintosJornadaGastos = [];
let precintosJornadaGastosTodasLasFilas = [];
let precintosJornadaGastosTab = 'usado';

let precintosJornadaGastosFecha = null;

// Los precintos de una jornada se pueden consultar siempre, pero solo se
// pueden quitar/corregir mientras la jornada NO esté cerrada.
function precintosJornadaEditables() {
  const j = jornadaDelGasto(precintosJornadaGastosFecha);
  return !(j && j.estado === 'cerrada');
}

// fechaISO opcional: sin ella, la jornada activa (la de hoy).
function abrirModalPrecintosJornadaGastos(fechaISO) {
  const jornada = (typeof obtenerJornadaActiva === 'function') ? obtenerJornadaActiva(gastosMovilUsuario) : null;
  precintosJornadaGastosFecha = fechaISO || (jornada ? jornada.fecha : hoyISO());
  precintosJornadaGastosTodasLasFilas = (typeof obtenerPrecintosDeJornada === 'function') ? obtenerPrecintosDeJornada(gastosMovilUsuario, precintosJornadaGastosFecha) : [];
  const nota = document.getElementById('precintosJornadaGastosNota');
  if (nota) {
    nota.textContent = precintosJornadaEditables()
      ? 'Si marcaste un precinto como usado o scrap por error, quítalo acá — vuelve a quedar disponible.'
      : 'La jornada ya está cerrada: los precintos solo se pueden consultar, no editar.';
  }
  const titulo = document.getElementById('tituloPrecintosJornadaGastos');
  if (titulo) titulo.textContent = `Precintos de la Jornada ${fechaISOaDDMMYYYY(precintosJornadaGastosFecha)}`;
  cambiarTabPrecintosJornadaGastos('usado');
  abrirModal('modalPrecintosJornadaGastos');
}

function cambiarTabPrecintosJornadaGastos(tab) {
  precintosJornadaGastosTab = tab;
  document.getElementById('btnTabPrecintosJornadaUsado')?.classList.toggle('activo', tab === 'usado');
  document.getElementById('btnTabPrecintosJornadaScrap')?.classList.toggle('activo', tab === 'scrap');
  renderPrecintosJornadaGastos(precintosJornadaGastosTodasLasFilas.filter(f => f.estado === tab));
}

function renderPrecintosJornadaGastos(filas) {
  const lista = document.getElementById('listaPrecintosJornadaGastos');
  const vacio = document.getElementById('precintosJornadaGastosVacio');
  if (!lista) return;

  const esScrapTab = precintosJornadaGastosTab === 'scrap';
  const grupos = new Map();
  filas.forEach(f => {
    const origen = esScrapTab ? f.scrapDetalle : f.uso;
    const viaje = origen.viaje || '—';
    const op = OPERACIONES_ASIGNADAS_MOVIL_DEMO.find(o => o.nroViaje === viaje);
    const per = (esScrapTab && f.scrapDetalle.per) || (op ? op.per : '—');
    const terminal = origen.terminal || (op ? op.terminal : '—');
    const clave = `${per}|${terminal}|${viaje}`;
    if (!grupos.has(clave)) grupos.set(clave, { per, estado: f.estado, terminal, viaje, precintos: [] });
    grupos.get(clave).precintos.push(f.precinto);
  });

  gruposPrecintosJornadaGastos = [];
  grupos.forEach(g => {
    dividirPorMaterialYCorrelatividad(g.precintos).forEach(sub => {
      gruposPrecintosJornadaGastos.push({ ...g, precintos: sub.precintos, texto: sub.texto });
    });
  });

  vacio.textContent = `No hay precintos ${esScrapTab ? 'como scrap' : 'usados'} en esta jornada.`;
  vacio.style.display = gruposPrecintosJornadaGastos.length ? 'none' : '';
  lista.style.display = gruposPrecintosJornadaGastos.length ? '' : 'none';
  const editable = precintosJornadaEditables();
  lista.innerHTML = gruposPrecintosJornadaGastos.map((g, i) => `<div class="jp-card">
      <div class="jp-card-top">
        <span class="badge ${esScrapTab ? 'badge-inactivo' : 'badge-vigente'}"><span class="badge-dot"></span>${esScrapTab ? 'Scrap' : 'Usado'}</span>
        ${editable ? `<button type="button" class="btn-accion btn-eliminar jp-btn-tacho" title="Quitar del reporte" onclick="eliminarPrecintoDelReporteGastos(${i})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>` : ''}
      </div>
      <div class="jp-rango">${g.texto}</div>
      <div class="jp-datos">
        <div><span>PER</span><strong>${g.per}</strong></div>
        <div><span>Terminal</span><strong>${g.terminal}</strong></div>
        <div><span>Viaje</span><strong>${g.viaje}</strong></div>
      </div>
    </div>`).join('');
}

function eliminarPrecintoDelReporteGastos(indice) {
  const g = gruposPrecintosJornadaGastos[indice];
  if (!g) return;
  if (!precintosJornadaEditables()) { mostrarToast('La jornada ya está cerrada: no se pueden editar los precintos.'); return; }
  const esScrap = g.estado === 'scrap';
  confirmarAccion(
    `¿Quitar ${g.precintos.length > 1 ? 'estos precintos' : 'este precinto'} del reporte? Dejará${g.precintos.length > 1 ? 'n' : ''} de aparecer en Reporte de Precintos.`,
    () => {
      g.precintos.forEach(precinto => {
        const asignacion = obtenerAsignacionDePrecinto(precinto);
        if (!asignacion) return;
        if (esScrap) {
          asignacion.scrap = (asignacion.scrap || []).filter(s => s.precinto !== precinto);
        } else {
          const registro = obtenerGenerarRegistroPorAsignacion(asignacion.id);
          if (registro) registro.detalle = registro.detalle.filter(d => d.precinto !== precinto);
        }
      });
      guardarEstadoPrecintos();
      precintosJornadaGastosTodasLasFilas = obtenerPrecintosDeJornada(gastosMovilUsuario, precintosJornadaGastosFecha);
      renderPrecintosJornadaGastos(precintosJornadaGastosTodasLasFilas.filter(f => f.estado === precintosJornadaGastosTab));
      renderTarjetaJornadaHoy();
      renderJornadasRecientesGastos();
    }
  );
}

// Estado de un gasto YA registrado ese día: "Agregado posterior" si alguna
// fila es un olvido justificado, "Registrado" si hay filas, "Pendiente" si
// no hay nada aún — mismo criterio que usa notaAgregadoPosterior.
function estadoReporteDelDia(filasDelDia) {
  if (!filasDelDia.length) return 'Pendiente';
  return 'Registrado';
}
function claseBadgeEstadoReporte(estado) {
  if (estado === 'Registrado') return 'badge badge-vigente';
  return 'badge badge-gris';
}

function renderTarjetasReporteDelDia() {
  const jornada = (typeof obtenerJornadaActiva === 'function') ? obtenerJornadaActiva(gastosMovilUsuario) : null;
  const fechaDD = jornada ? fechaISOaDDMMYYYY(jornada.fecha) : fechaISOaDDMMYYYY(hoyISO());

  // Sin jornada iniciada no se puede registrar ningún consumo.
  const iniciada = !!(jornada && jornada.inicio);
  ['btnRegistrarAlimentos', 'btnRegistrarMovilidad'].forEach(id => {
    const b = document.getElementById(id);
    if (!b) return;
    b.disabled = !iniciada;
    b.title = iniciada ? '' : 'Inicia tu jornada en Operaciones para registrar';
  });

  // Alimentos
  const elAlim = document.getElementById('gastosTotalAlimentos');
  if (elAlim) {
    const detalleAlim = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
    const filasDia = detalleAlim.grilla.filter(f => f.fecha === fechaDD);
    const total = filasDia.reduce((acc, f) => acc + (Number(f.costo) || 0), 0);
    elAlim.textContent = `S/ ${total.toFixed(2)}`;
    const estado = estadoReporteDelDia(filasDia);
    setTextoYClase('gastosAlimentosEstado', estado, claseBadgeEstadoReporte(estado));
    const codigoInfoAlim = jornada && obtenerCodigoReporteJornada('Alimentos', jornada.id);
    setTexto('gastosAlimentosCodigo', !iniciada ? 'Jornada sin iniciar' : codigoInfoAlim ? codigoInfoAlim.codigo : 'Sin registrar');
    const chips = document.getElementById('gastosAlimentosComidasChips');
    if (chips) {
      chips.innerHTML = ['Desayuno', 'Almuerzo', 'Cena'].map(c => {
        const ok = filasDia.some(f => f.comida === c);
        return `<span class="gastos-comida-chip${ok ? ' ok' : ''}">${ok ? '✓' : '–'} ${c}</span>`;
      }).join('');
    }
  }

  // Movilidad
  const elMov = document.getElementById('gastosTotalMovilidad');
  if (elMov) {
    const detalleMov = obtenerDetalleGastoPorTipo('Movilidad', gastosMovilPeriodo.ids['Movilidad']);
    const filasDia = detalleMov.grilla.filter(f => f.fecha === fechaDD);
    const total = filasDia.reduce((acc, f) => acc + (Number(f.totalDia) || 0), 0);
    elMov.textContent = `S/ ${total.toFixed(2)}`;
    const estado = estadoReporteDelDia(filasDia);
    setTextoYClase('gastosMovilidadEstado', estado, claseBadgeEstadoReporte(estado));
    const codigoInfoMov = jornada && obtenerCodigoReporteJornada('Movilidad', jornada.id);
    setTexto('gastosMovilidadCodigo', !iniciada ? 'Jornada sin iniciar' : codigoInfoMov ? codigoInfoMov.codigo : 'Sin registrar');
  }

  // Días a Bordo (solo lectura)
  const elDias = document.getElementById('gastosTotalDiasBordo');
  if (elDias) {
    const detalleDias = obtenerDetalleGastoPorTipo('Días a Bordo', gastosMovilPeriodo.ids['Días a Bordo']);
    const filaHoy = detalleDias.grilla.find(f => f.fecha === fechaDD);
    const totalDias = detalleDias.grilla.reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
    elDias.textContent = `S/ ${totalDias.toFixed(2)}`;
    document.getElementById('gastosDiasBordoNota').textContent = `${detalleDias.grilla.length} día${detalleDias.grilla.length === 1 ? '' : 's'} este período`;
    const horas = jornada ? calcularHorasJornada(jornada.inicio, jornada.fin) : 0;
    let motivoHoy;
    if (filaHoy) motivoHoy = `${filaHoy.codigo || 'Sin código'} · ${filaHoy.detalle} · S/ ${Number(filaHoy.monto).toFixed(2)}`;
    else if (!jornada || jornada.estado !== 'cerrada') motivoHoy = 'Jornada aún no cerrada.';
    else if (horas < CONFIG_JORNADA_DEMO.horasMinimasDiaABordo) motivoHoy = `Jornada de ${horas.toFixed(1)} h: mínimo ${CONFIG_JORNADA_DEMO.horasMinimasDiaABordo} h.`;
    else motivoHoy = 'Sin precintos en buque hoy.';
    setTexto('gastosDiasBordoHoy', motivoHoy);
  }
}

function setTexto(id, texto) { const el = document.getElementById(id); if (el) el.textContent = texto; }
function setTextoYClase(id, texto, clase) { const el = document.getElementById(id); if (el) { el.textContent = texto; el.className = clase; } }

function renderResumenPeriodoGastos() {
  if (!gastosMovilPeriodo || !document.getElementById('gastosResumenTotal')) return;
  const detalleAlim = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
  const detalleMov = obtenerDetalleGastoPorTipo('Movilidad', gastosMovilPeriodo.ids['Movilidad']);
  const detalleDias = obtenerDetalleGastoPorTipo('Días a Bordo', gastosMovilPeriodo.ids['Días a Bordo']);
  const totalAlim = detalleAlim.grilla.reduce((a, f) => a + (Number(f.costo) || 0), 0);
  const totalMov = detalleMov.grilla.reduce((a, f) => a + (Number(f.totalDia) || 0), 0);
  const totalDias = detalleDias.grilla.reduce((a, f) => a + (Number(f.monto) || 0), 0);

  setTexto('gastosResumenTotal', `S/ ${(totalAlim + totalMov + totalDias).toFixed(2)}`);
  setTexto('gastosResumenAlimentos', `S/ ${totalAlim.toFixed(2)}`);
  setTexto('gastosResumenMovilidad', `S/ ${totalMov.toFixed(2)}`);
  setTexto('gastosResumenDiasBordo', `S/ ${totalDias.toFixed(2)}`);

  // "Jornadas registradas" (tarjeta de período): jornadas del operador
  // dentro del rango del período (no 'pendiente' — igual criterio que
  // renderJornadasRecientesGastos, que lista esas mismas jornadas).
  const desdeISO = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaDesde);
  const hastaISO = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaHasta);
  const jornadasPeriodo = Object.values(JORNADAS_MOVIL_DEMO).filter(j =>
    j.usuario === gastosMovilUsuario && j.estado !== 'pendiente' && j.fecha >= desdeISO && j.fecha <= hastaISO
  );
  setTexto('gastosResumenJornadas', String(jornadasPeriodo.length));
}

// Jornadas del operador DENTRO del período activo (antes eran las últimas 7
// sin relación con el período — rediseño por período: ahora "Jornadas de
// este período" solo debe mostrar días que de verdad caen en ese rango,
// para que coincida con "Jornadas registradas" de la tarjeta de arriba).
// Tocar una abre "Generar Reporte" posicionado en esa fecha para corregir
// un olvido dentro del plazo (§4.4).
// Pie de la tarjeta: precintos usados y scrap de ESA jornada, como chips.
function htmlPrecintosJornada(precintos, j) {
  if (!precintos.length) return '<span class="gastos-jr-precintos">Sin precintos usados</span>';
  const usados = precintos.filter(f => f.estado === 'usado');
  const scrap = precintos.filter(f => f.estado === 'scrap');
  const chips = (lista, clase) => lista.map(f => `<span class="gastos-jr-chip ${clase}">${f.precinto}</span>`).join('');
  return `<div class="gastos-jr-precintos">
    <div class="gastos-jr-precintos-cab">
      <span class="gastos-jr-precintos-titulo">Precintos usados (${usados.length})${scrap.length ? ' · Scrap (' + scrap.length + ')' : ''}</span>
      <button type="button" class="gastos-jr-precintos-ver" onclick="abrirModalPrecintosJornadaGastos('${j.fecha}')">${j.estado === 'cerrada' ? 'Ver' : 'Ver / editar'} ›</button>
    </div>
    <div class="gastos-jr-chips">${chips(usados, '')}${chips(scrap, 'scrap')}</div>
  </div>`;
}

function renderJornadasRecientesGastos() {
  const cont = document.getElementById('gastosJornadasRecientes');
  if (!cont || !gastosMovilPeriodo) return;
  const desdeISO = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaDesde);
  const hastaISO = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaHasta);
  const jornadas = Object.values(JORNADAS_MOVIL_DEMO)
    .filter(j => j.usuario === gastosMovilUsuario && j.estado !== 'pendiente' && j.fecha >= desdeISO && j.fecha <= hastaISO)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (!jornadas.length) { cont.innerHTML = `<p class="submodulo-tabla-vacio">Sin jornadas registradas en este período.</p>`; return; }

  cont.innerHTML = jornadas.map(j => {
    // Precintos usados ESE día puntual (distinto de las operaciones
    // asignadas al operador, que no varían día a día — corrección pedida).
    const precintos = obtenerPrecintosDeJornada(gastosMovilUsuario, j.fecha);
    const fechaDD = fechaISOaDDMMYYYY(j.fecha);
    const operaciones = obtenerOperacionesParaReporteJornada(gastosMovilUsuario, j);
    const detalleAlim = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
    const detalleMov = obtenerDetalleGastoPorTipo('Movilidad', gastosMovilPeriodo.ids['Movilidad']);
    const filasAlimentos = detalleAlim.grilla.filter(f => f.fecha === fechaDD);
    const filasMovilidad = detalleMov.grilla.filter(f => f.fecha === fechaDD);
    const totalAlimentos = filasAlimentos.reduce((a, f) => a + (Number(f.costo) || 0), 0);
    const totalMovilidad = filasMovilidad.reduce((a, f) => a + (Number(f.totalDia) || 0), 0);
    const estadoAlimentos = estadoReporteDelDia(filasAlimentos);
    const estadoMovilidad = estadoReporteDelDia(filasMovilidad);
    const claseAlimentos = claseBadgeEstadoReporte(estadoAlimentos);
    const claseMovilidad = claseBadgeEstadoReporte(estadoMovilidad);
    // Botón "Añadir" por reporte con información pendiente (solo dentro del
    // plazo máximo de Configuración de gastos).
    const puedeAnadir = dentroDePlazoOlvido(j.fecha);
    const registradas = new Set(filasAlimentos.map(f => f.comida));
    let faltanAlim = COMIDAS_ALIMENTOS.filter(c => !registradas.has(c) && comidaDisponible(c, j.fecha));
    if (j.fecha === hoyISO() && filasAlimentos.length) faltanAlim = [];
    const btnAnadir = (fn, texto) => `<button type="button" class="gastos-jornada-reporte-add" onclick="${fn}('${j.fecha}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>${texto}</button>`;
    // Con información pendiente: botón "Añadir" mientras esté dentro del
    // plazo (con la hora límite); vencido, solo se avisa que ya no se puede.
    const nota = txt => `<small class="gastos-jornada-reporte-falta">${txt}</small>`;
    const pendienteAlim = faltanAlim.length > 0;
    const pendienteMov = !filasMovilidad.length;
    const limiteTxt = puedeAnadir ? textoLimitePlazo(j.fecha) : '';
    const vencidoTxt = `Plazo vencido (${CONFIG_JORNADA_DEMO.plazoOlvidoHoras} h)`;
    const addAlim = !pendienteAlim ? ''
      : puedeAnadir
        ? `${nota((filasAlimentos.length ? 'Faltan: ' + faltanAlim.join(', ') : 'Sin registrar') + ' · hasta ' + limiteTxt)}${btnAnadir('anadirPendienteAlimentos', 'Añadir')}`
        : (filasAlimentos.length ? '' : nota(vencidoTxt)); // si ya hay algo registrado, no se avisa el vencimiento
    const addMov = !pendienteMov ? ''
      : puedeAnadir
        ? `${nota('Sin registrar · hasta ' + limiteTxt)}${btnAnadir('anadirPendienteMovilidad', 'Añadir')}`
        : nota(vencidoTxt);
    const inicio = j.inicio ? `${j.inicio.fecha} ${horaA12(j.inicio.hora)}` : '—';
    const fin = j.fin ? `${j.fin.fecha} ${horaA12(j.fin.hora)}` : 'Jornada abierta';
    const reporte = (nombre, total, estado, clase, extra) => `
          <div class="gastos-jr-fila">
            <div class="gastos-jr-info"><div class="gastos-jr-nombre-fila"><span class="gastos-jr-nombre">${nombre}</span><span class="badge ${clase.replace('badge ', '')}">${estado}</span></div><strong class="gastos-jr-monto">S/ ${total.toFixed(2)}</strong></div>
            ${extra}
          </div>`;
    return `
      <section class="gastos-jornada-resumen">
        <div class="gastos-jr-head">
          <span class="gastos-jr-fecha">${fechaDD}</span>
          <span class="badge ${j.estado === 'abierta' ? 'badge-por-vencer' : 'badge-gris'}">${j.estado === 'abierta' ? 'Abierta' : 'Cerrada'}</span>
        </div>
        <div class="gastos-jr-horario">
          <div><span>Inicio</span><strong>${inicio}</strong></div>
          <div><span>Fin</span><strong>${fin}</strong></div>
        </div>
        <div class="gastos-jr-ops"><span>Operaciones</span><strong>${textoOperacionesInvolucradas(operaciones)}</strong></div>
        <div class="gastos-jr-reportes">
          ${reporte('Alimentos', totalAlimentos, estadoAlimentos, claseAlimentos, addAlim)}
          ${reporte('Movilidad', totalMovilidad, estadoMovilidad, claseMovilidad, addMov)}
        </div>
        ${htmlPrecintosJornada(precintos, j)}
      </section>`;
  }).join('');
}

// Abre "Registrar Alimentos" con la fecha de una jornada reciente ya
// seleccionada (§4.4: "tocar abre esa jornada para olvidos dentro del
// plazo") — Alimentos primero, igual que la secuencia de reportes (§2).
function irAJornadaDesdeGastos(fechaISO, tipo) {
  if (tipo === 'Movilidad') { anadirPendienteMovilidad(fechaISO); return; }
  abrirModalRegistrarAlimentos(fechaISO);
  document.getElementById('alimentosFecha').value = fechaISO;
  actualizarComidasDisponibles();
  renderPanelInformativoGasto('alimentos', fechaISO, 'Alimentos');
}

/* =================================================
   ALIMENTOS — valida tope por comida (desayuno/almuerzo/cena) y por día,
   de LIMITES_GASTOS_DEMO.alimentos.
================================================= */
let alimentosIndiceEditando = null; // índice en la grilla si se está editando, null si es nuevo

// Misma corrección que obtenerFechaHoyISO (data-movil.js): fecha de HOY en
// huso LOCAL, no UTC — si no, de noche en Perú (UTC-5) esta fecha quedaba
// un día adelantada respecto a la Jornada (que ya usa local), bloqueando
// gastos con "No hay una jornada marcada o declarada en esa fecha".
function hoyISO() {
  const ahora = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
}

// Panel informativo (solo lectura) de Jornada/Operaciones involucradas/
// Hora de registro/Costo total/Código — PROMPT_GASTOS_PANTALLAS_JORNADA_
// SPRINT4 §1/§2/§3: ya no se elige Operación/PER ni Cliente a mano, se
// muestran acá derivados de la jornada de la fecha elegida. "prefijo" es
// 'alimentos' o 'movilidad' (comparten el mismo patrón de ids de panel).
function renderPanelInformativoGasto(prefijo, fechaISODia, tipo) {
  const panel = document.getElementById(`${prefijo}PanelInfo`);
  if (!panel || !fechaISODia) return;
  const info = infoJornadaGasto(gastosMovilUsuario, fechaISODia, tipo);

  // Fecha/hora de inicio y fin por separado (una jornada que cruza
  // medianoche puede tener fechas distintas, no solo horas distintas).
  const elInicio = document.getElementById(`${prefijo}PanelInicio`);
  if (elInicio) elInicio.textContent = info.jornada && info.fechaInicio ? `${info.fechaInicio} ${horaA12(info.horaInicio)}` : 'Sin jornada marcada';
  const elFin = document.getElementById(`${prefijo}PanelFin`);
  if (elFin) elFin.textContent = info.jornada && info.fechaFin ? `${info.fechaFin} ${horaA12(info.horaFin)}` : (info.jornada && info.jornada.estado === 'abierta' ? 'Jornada abierta' : '—');

  document.getElementById(`${prefijo}PanelOperaciones`).textContent = textoOperacionesInvolucradas(info.operaciones);
  // Precintos usados en ESTA fecha puntual (distinto de las operaciones
  // asignadas, que no varían día a día) — corrección pedida: ya no se
  // conflaten los dos conceptos.
  const elPrecintos = document.getElementById(`${prefijo}PanelPrecintos`);
  if (elPrecintos) elPrecintos.textContent = info.huboPrecintos ? `Sí (${info.precintosUsados})` : 'Sin precintos usados';
  document.getElementById(`${prefijo}PanelCodigo`).textContent = info.codigo || 'Se asigna al guardar';

  const horaReg = document.getElementById(`${prefijo}PanelHoraRegistro`);
  if (horaReg) {
    const ahora = new Date();
    horaReg.textContent = horaA12(`${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`);
  }

  const totalEl = document.getElementById(`${prefijo}PanelTotal`);
  if (totalEl) {
    const detalle = obtenerDetalleGastoPorTipo(tipo, gastosMovilPeriodo.ids[tipo]);
    const campoMonto = tipo === 'Alimentos' ? 'costo' : 'totalDia';
    const fechaDD = fechaISOaDDMMYYYY(fechaISODia);
    const indiceEditando = tipo === 'Alimentos' ? alimentosIndiceEditando : movilidadIndiceEditando;
    const total = detalle.grilla.reduce((acc, f, i) => {
      if (i === indiceEditando) return acc;
      return f.fecha === fechaDD ? acc + (Number(f[campoMonto]) || 0) : acc;
    }, 0);
    totalEl.textContent = `S/ ${total.toFixed(2)}`;
  }
}

// Ayudas compartidas de los formularios múltiples (Alimentos / Movilidad).
function escAttrGasto(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const ICONO_LUGAR_GASTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const ICONO_RELOJ_GASTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
const ICONO_SOLES_GASTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 6v2m0 8v2"/></svg>';
const ICONO_CAMION_GASTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2v-4l-3-5H6L3 13v4h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h8"/></svg>';
const ICONO_MOTIVO_GASTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

// Campo de texto con icono (mismo markup que los formularios estáticos).
function htmlCampoGasto(etiqueta, id, icono, atributos, valor) {
  return `<div class="movil-form-group">
    <label class="movil-form-label">${etiqueta}</label>
    <div class="movil-input-wrap">
      <span class="input-icon">${icono}</span>
      <input class="movil-input" id="${id}" value="${escAttrGasto(valor)}" ${atributos || 'type="text"'}>
    </div>
  </div>`;
}

// Selector de hora propio (12h am/pm) generado por JS — mismo contrato que
// el estático (ver abrirSelectorHora): hidden "{baseId}" en 24h + texto.
function htmlSelectorHoraGasto(baseId, etiqueta, valor24) {
  const flecha = (u, d, svg) => `<button type="button" class="movil-hspin-btn" onclick="hspinAjustar('${baseId}','${u}',${d})">${svg}</button>`;
  const arriba = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>';
  const abajo = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>';
  const spin = (u, sufijo, txt, extra) => `<div class="movil-hspin${extra || ''}" onwheel="hspinRueda(event,'${baseId}','${u}')">
        ${flecha(u, 1, arriba)}<div class="movil-hspin-valor" id="${baseId}Spin${sufijo}">${txt}</div>${flecha(u, -1, abajo)}
      </div>`;
  return `<div class="movil-form-group movil-hora-campo">
    <label class="movil-form-label">${etiqueta}</label>
    <div class="movil-input-wrap">
      <span class="input-icon">${ICONO_RELOJ_GASTO}</span>
      <input type="text" class="movil-input" id="${baseId}Texto" readonly placeholder="--:-- am/pm" value="${valor24 ? horaA12(valor24) : ''}" onclick="abrirSelectorHora('${baseId}')">
      <input type="hidden" id="${baseId}" value="${escAttrGasto(valor24)}">
    </div>
    <div class="movil-hora-dropdown" id="${baseId}Dropdown" style="display:none;">
      <div class="movil-hora-dropdown-fila">
        ${spin('h', 'H', '12')}<span class="movil-hora-dospuntos">:</span>
        ${spin('m', 'M', '00')}<span class="movil-hora-dospuntos">:</span>
        ${spin('ampm', 'Ampm', 'AM', ' movil-hspin-ampm')}
      </div>
      <button type="button" class="btn-accion btn-guardar movil-hora-listo" onclick="confirmarSelectorHora('${baseId}')">Listo</button>
    </div>
  </div>`;
}

// Tarjetas contraíbles: el estado (contraída) sobrevive a los re-dibujados.
const tarjetasGastoContraidas = new Set();
const ICONO_CONTRAER_GASTO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m6 9 6 6 6-6"/></svg>';

function abrirTarjetaGasto(clave, titulo, estado, extraCab) {
  const contraida = tarjetasGastoContraidas.has(clave);
  return `<div class="gastos-multi-card${contraida ? ' contraida' : ''}" data-clave="${clave}">
    <div class="gastos-multi-card-cab">
      <button type="button" class="gastos-multi-card-toggle" onclick="toggleTarjetaGasto('${clave}')" title="Contraer / expandir">
        ${ICONO_CONTRAER_GASTO}<span class="gastos-multi-card-titulo">${titulo}</span>
      </button>
      <span class="gastos-multi-card-resumen"></span>
      <span class="gastos-multi-card-estado">${estado || ''}</span>${extraCab || ''}
    </div>
    <div class="gastos-multi-card-cuerpo">`;
}
const CERRAR_TARJETA_GASTO = '</div></div>';

// Texto corto que se ve cuando la tarjeta está contraída: primer campo de
// texto (lugar / empresa) y el monto.
function actualizarResumenTarjetaGasto(card) {
  const resumen = card.querySelector('.gastos-multi-card-resumen');
  if (!resumen) return;
  const texto = card.querySelector('input[type="text"]:not([readonly])');
  const monto = card.querySelector('input[type="number"]');
  const partes = [];
  if (texto && texto.value.trim()) partes.push(texto.value.trim());
  if (monto && monto.value) partes.push(`S/ ${Number(monto.value).toFixed(2)}`);
  resumen.textContent = card.classList.contains('contraida') ? partes.join(' · ') : '';
}

function toggleTarjetaGasto(clave) {
  const card = document.querySelector(`.gastos-multi-card[data-clave="${clave}"]`);
  if (!card) return;
  const contraida = card.classList.toggle('contraida');
  if (contraida) tarjetasGastoContraidas.add(clave); else tarjetasGastoContraidas.delete(clave);
  actualizarResumenTarjetaGasto(card);
}

// Si el campo con error está en una tarjeta contraída, la expande para que
// se vea el mensaje.
function errorCampoGasto(el, mensaje) {
  const card = el && el.closest ? el.closest('.gastos-multi-card') : null;
  if (card && card.classList.contains('contraida')) toggleTarjetaGasto(card.dataset.clave);
  mostrarErrorCampo(el, mensaje);
}

const COMIDAS_ALIMENTOS = ['Desayuno', 'Almuerzo', 'Cena'];
let alimentosComidaEditando = null; // comida de la fila que se edita (una sola tarjeta)

// Solo se puede registrar si la jornada de esa fecha ya inició (o si se
// puede declarar por ser un día pasado dentro del plazo).
function jornadaPermiteRegistrar(fechaISO) {
  if ((jornadaDelGasto(fechaISO) || {}).inicio) return true;
  if (jornadaDeclarable(fechaISO)) return true;
  mostrarToast('La jornada de esa fecha aún no inicia: toca "Comenzar día" en Operaciones para poder registrar consumos.');
  return false;
}

function abrirModalRegistrarAlimentos(fechaISO) {
  const fechaInicial = fechaISO || fechaMaxPeriodo();
  if (!jornadaPermiteRegistrar(fechaInicial)) return;
  alimentosIndiceEditando = null;
  alimentosComidaEditando = null;
  evidenciaTarjetas = {};
  tarjetasGastoContraidas.clear();
  document.getElementById('tituloRegistrarAlimentos').textContent = 'Registrar Alimentos';
  document.getElementById('alimentosFecha').value = fechaInicial;
  document.getElementById('alimentosFecha').max = fechaMaxPeriodo();
  document.getElementById('alimentosFecha').min = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaDesde);
  document.getElementById('alimentosJustificacion').value = '';
  limpiarDeclaracionJornada('alimentos');
  actualizarComidasDisponibles();
  renderPanelInformativoGasto('alimentos', fechaInicial, 'Alimentos');
  abrirModal('modalRegistrarAlimentos');
}

/* =================================================
   EVIDENCIA (fotos de los gastos). En los registros sigue siendo una lista
   de textos (compatible con la web); la imagen real se guarda aparte, por
   texto, en EVIDENCIAS_IMG_GASTOS (reducida para no llenar el
   almacenamiento). Si un texto no tiene imagen guardada (datos de ejemplo),
   se dibuja una foto de muestra con su nombre.
================================================= */
const EVIDENCIAS_IMG_GASTOS = tgCargarCatalogo('evidenciasImgGastosData', {});

function etiquetaEvidencia(clave) {
  return String(clave).replace(/\s#[a-z0-9]{5}$/, '');
}

// Foto de muestra (boleta/ticket) para evidencias sin imagen guardada.
function svgEvidenciaDemo(clave) {
  const m = etiquetaEvidencia(clave).match(/\(([^)]+)\)/);
  const nombre = (m ? m[1] : 'foto').replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
    <rect width="320" height="240" fill="#E5E7EB"/>
    <rect x="92" y="18" width="136" height="204" rx="6" fill="#FFFFFF" stroke="#D1D5DB"/>
    <rect x="108" y="34" width="104" height="14" rx="3" fill="#FFC000"/>
    <g fill="#9CA3AF"><rect x="108" y="64" width="104" height="5" rx="2"/><rect x="108" y="78" width="82" height="5" rx="2"/>
    <rect x="108" y="92" width="96" height="5" rx="2"/><rect x="108" y="106" width="70" height="5" rx="2"/>
    <rect x="108" y="120" width="100" height="5" rx="2"/><rect x="108" y="134" width="60" height="5" rx="2"/></g>
    <rect x="108" y="158" width="104" height="1.5" fill="#D1D5DB"/>
    <rect x="150" y="170" width="62" height="12" rx="3" fill="#111111"/>
    <text x="160" y="232" text-anchor="middle" font-family="Arial" font-size="12" fill="#6B7280">${nombre}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function srcEvidencia(clave) {
  return EVIDENCIAS_IMG_GASTOS[clave] || svgEvidenciaDemo(clave);
}

// Miniaturas en cuadrícula (sin cortes de texto); tocar una la abre grande.
// Con "claveTarjeta" (formularios de registro) cada foto lleva una X para
// quitarla; sin ella (detalle de reportes) es solo de consulta.
function htmlEvidenciaGrid(lista, vacio, claveTarjeta) {
  if (!lista || !lista.length) return `<span class="gastos-evidencia-vacia">${vacio}</span>`;
  return `<div class="evidencia-grid">${lista.map((c, i) => `
    <div class="evidencia-item">
      <button type="button" class="evidencia-thumb" data-ev="${escAttrGasto(c)}" onclick="verImagenEvidencia(this)">
        <img src="${srcEvidencia(c)}" alt="${escAttrGasto(etiquetaEvidencia(c))}">
        <span>${escAttrGasto(etiquetaEvidencia(c))}</span>
      </button>
      ${claveTarjeta ? `<button type="button" class="evidencia-quitar" title="Quitar evidencia" aria-label="Quitar evidencia" onclick="quitarEvidenciaTarjeta('${claveTarjeta}', ${i})">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>` : ''}
    </div>`).join('')}</div>`;
}

// La imagen se amplía DENTRO del mismo modal (con botón "Volver"), no en un
// segundo modal encima.
function verImagenEvidencia(btn) {
  const modal = btn.closest('.modal');
  if (!modal) return;
  const clave = btn.dataset.ev;
  let visor = modal.querySelector('.evidencia-visor');
  if (!visor) {
    visor = document.createElement('div');
    visor.className = 'evidencia-visor';
    modal.appendChild(visor);
  }
  visor.innerHTML = `
    <div class="evidencia-visor-cab">
      <button type="button" class="evidencia-visor-volver" onclick="cerrarVisorEvidencia(this)" aria-label="Volver">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <span class="evidencia-visor-titulo">${escAttrGasto(etiquetaEvidencia(clave))}</span>
    </div>
    <div class="evidencia-visor-cuerpo"><img src="${srcEvidencia(clave)}" alt="${escAttrGasto(etiquetaEvidencia(clave))}"></div>
    <div class="evidencia-visor-pie">
      <button type="button" class="btn-accion btn-cancelar" onclick="cancelarVisorEvidencia(this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        Cancelar
      </button>
    </div>`;
  modal.classList.add('con-visor');
}

// "Cancelar": cierra la foto y también el modal completo.
function cancelarVisorEvidencia(btn) {
  const modal = btn.closest('.modal');
  const overlay = btn.closest('.modal-overlay');
  if (modal) modal.classList.remove('con-visor');
  if (overlay && overlay.id) cerrarModal(overlay.id);
}

function cerrarVisorEvidencia(btn) {
  const modal = btn.closest('.modal');
  if (modal) modal.classList.remove('con-visor');
}

// Lee la foto elegida, la reduce (máx. 640 px, JPEG) y la guarda; devuelve
// por callback el texto que queda en el registro.
function guardarEvidenciaImagen(file, numero, callback) {
  const id = Math.random().toString(36).slice(2, 7);
  const clave = `Evidencia ${numero} (${file.name}) #${id}`;
  const listo = () => callback(clave);
  const reader = new FileReader();
  reader.onerror = listo;
  reader.onload = () => {
    const img = new Image();
    img.onerror = listo;
    img.onload = () => {
      try {
        const escala = Math.min(1, 640 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        EVIDENCIAS_IMG_GASTOS[clave] = canvas.toDataURL('image/jpeg', 0.7);
        tgGuardarCatalogo('evidenciasImgGastosData', EVIDENCIAS_IMG_GASTOS);
      } catch (e) {
        delete EVIDENCIAS_IMG_GASTOS[clave]; // sin espacio: queda solo el nombre
      }
      listo();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// Evidencia POR TARJETA: cada comida (Desayuno/Almuerzo/Cena) y cada viaje
// de Movilidad lleva sus propias fotos. Clave: "alim_<Comida>" / "mov_<id>".
let evidenciaTarjetas = {};

function htmlEvidenciaTarjeta(clave) {
  const idInput = `evInput_${clave}`;
  return `<div class="gastos-ev-tarjeta">
    <span class="gastos-ev-titulo">Evidencia</span>
    <input type="file" accept="image/*" capture="environment" id="${idInput}" hidden onchange="agregarEvidenciaTarjeta('${clave}', this)">
    <button type="button" class="btn-accion btn-cancelar gastos-btn-evidencia" onclick="document.getElementById('${idInput}').click()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      Añadir evidencia
    </button>
    <div class="gastos-evidencia-chips" id="evChips_${clave}">${htmlEvidenciaGrid(evidenciaTarjetas[clave] || [], 'Sin fotos adjuntadas.', clave)}</div>
  </div>`;
}

function agregarEvidenciaTarjeta(clave, input) {
  if (!input.files || !input.files.length) return;
  const archivo = input.files[0];
  input.value = '';
  const lista = evidenciaTarjetas[clave] || (evidenciaTarjetas[clave] = []);
  guardarEvidenciaImagen(archivo, lista.length + 1, c => {
    lista.push(c);
    const cont = document.getElementById(`evChips_${clave}`);
    if (cont) cont.innerHTML = htmlEvidenciaGrid(lista, 'Sin fotos adjuntadas.', clave);
  });
}

// Quita una foto de la tarjeta (y su imagen guardada, si no la usa otro registro).
function quitarEvidenciaTarjeta(clave, indice) {
  const lista = evidenciaTarjetas[clave];
  if (!lista) return;
  lista.splice(indice, 1);
  const cont = document.getElementById(`evChips_${clave}`);
  if (cont) cont.innerHTML = htmlEvidenciaGrid(lista, 'Sin fotos adjuntadas.', clave);
}

// §3 PROMPT_GASTOS_JORNADA_SPRINT4: sin Jornada marcada/declarada en la
// fecha del gasto, no se puede registrar nada ese día — y, para Alimentos,
// Desayuno/Almuerzo quedan deshabilitados si la Jornada de esa fecha
// INICIÓ a la hora de corte configurada o después. La validación usa la
// hora GUARDADA en la jornada (jornada.inicio.hora), no la hora actual del
// reloj, para que no se pueda evadir el corte registrando más tarde (ni
// siquiera registrándolo al día siguiente).
function jornadaDelGasto(fechaISODia) {
  return typeof obtenerJornadaPorFecha === 'function' ? obtenerJornadaPorFecha(gastosMovilUsuario, fechaISODia) : null;
}

// Por rango de horas (incluye Cena, antes sin corte) — mismo criterio que
// comidaHabilitadaPorCorte (data-gastos.js): la Jornada debe haber
// INICIADO dentro del rango [desde, hasta) de esa comida.
function comidaDisponible(comida, fechaISODia) {
  const jornada = jornadaDelGasto(fechaISODia);
  if (!jornada || !jornada.inicio) {
    // Sin jornada: si ya se está declarando una (jornada olvidada), los
    // cortes se evalúan con las horas declaradas aún no guardadas.
    const ini = valorDeclarado('alimentos', 'Inicio');
    if (ini) return comidaHabilitadaPorCorte(comida, ini, valorDeclarado('alimentos', 'Fin') || null);
    return true; // sin jornada ni declaración no hay corte que aplicar (el gating de guardado ya bloquea el registro)
  }
  return comidaHabilitadaPorCorte(comida, jornada.inicio.hora, jornada.fin && jornada.fin.hora);
}

/* =================================================
   GASTO OLVIDADO (§3) — un gasto es "olvidado" cuando su fecha ya quedó en
   el PASADO respecto a hoy (estamos en un día calendario posterior), no
   simplemente porque la Jornada de esa fecha ya esté cerrada: cerrar el día
   (p.ej. para que arranque el corte de comidas) no debe impedir seguir
   registrando algo del MISMO día calendario — la Cena, por ejemplo, se
   suele registrar después de "Finalizar el día" y no debe pedir
   justificación. Recién al cruzar la medianoche (hoy > esa fecha) se pide
   justificación obligatoria, y solo se permite dentro de un plazo en horas
   desde el FIN de esa jornada (configurable,
   CONFIG_JORNADA_DEMO.plazoOlvidoHoras, 48h por defecto) — pasado el
   plazo, ni agregar ni editar, solo ver y descargar (ver
   renderReportesAccordion, que oculta Editar/Eliminar en ese caso). Editar
   un reporte de un día anterior cae en el mismo caso: su fecha también
   quedó en el pasado.
================================================= */
/* =================================================
   JORNADA OLVIDADA — si en esa fecha no se marcó la jornada, se puede
   DECLARAR (hora de inicio y fin) mientras no pase el plazo máximo de
   horas de Configuración de gastos (CONFIG_JORNADA_DEMO.plazoOlvidoHoras,
   contado desde el fin de ese día). La jornada queda guardada como
   "declarada" y desde ahí Alimentos/Movilidad se registran igual que con
   una jornada marcada (con justificación, por ser un día pasado).
================================================= */
function finDelDiaMs(fechaISODia) {
  return new Date(`${fechaISODia}T00:00:00`).getTime() + 24 * 3600000;
}

function valorDeclarado(prefijo, cual) {
  const el = document.getElementById(`${prefijo}Decl${cual}`);
  return el ? el.value : '';
}

// ¿Esa fecha admite declarar jornada? Pasada, sin jornada y dentro del plazo.
function jornadaDeclarable(fechaISODia) {
  return !!fechaISODia && esGastoOlvidado(fechaISODia) && !jornadaDelGasto(fechaISODia) && dentroDePlazoOlvido(fechaISODia);
}

// Muestra/oculta el bloque "Declarar jornada" de un modal según la fecha.
function renderBloqueDeclaracion(prefijo, fechaISODia) {
  const grupo = document.getElementById(`${prefijo}DeclaracionGroup`);
  if (!grupo) return;
  const declarable = jornadaDeclarable(fechaISODia);
  grupo.style.display = declarable ? '' : 'none';
  const aviso = document.getElementById(`${prefijo}DeclaracionAviso`);
  if (aviso && declarable) {
    const limite = new Date(finDelDiaMs(fechaISODia) + CONFIG_JORNADA_DEMO.plazoOlvidoHoras * 3600000);
    const pad = n => String(n).padStart(2, '0');
    aviso.textContent = `No marcaste jornada este día. Puedes declararla hasta el ${pad(limite.getDate())}/${pad(limite.getMonth() + 1)} ${horaA12(`${pad(limite.getHours())}:${pad(limite.getMinutes())}`)} (máx. ${CONFIG_JORNADA_DEMO.plazoOlvidoHoras} h).`;
  }
}

function limpiarDeclaracionJornada(prefijo) {
  ['Inicio', 'Fin'].forEach(cual => {
    const base = `${prefijo}Decl${cual}`;
    const h = document.getElementById(base);
    if (h) { h.value = ''; actualizarDisplayHora(base); }
  });
}

// onchange de las horas declaradas: refresca comida disponible / bloque.
function actualizarDeclaracionJornada(prefijo) {
  if (prefijo === 'alimentos') actualizarComidasDisponibles();
  else actualizarJustificacionMovilidad();
}

// Valida las horas declaradas (si la fecha las requiere). Devuelve false y
// marca el campo si falta algo. No guarda nada todavía.
function validarDeclaracionJornada(prefijo, fechaISODia) {
  if (jornadaDelGasto(fechaISODia)) return true;
  if (!esGastoOlvidado(fechaISODia)) {
    mostrarToast('No hay una jornada marcada hoy: toca "Comenzar día" en Operaciones antes de registrar el gasto.');
    return false;
  }
  if (!dentroDePlazoOlvido(fechaISODia)) {
    mostrarToast(`Ya pasó el plazo (${CONFIG_JORNADA_DEMO.plazoOlvidoHoras} h) para declarar la jornada de esa fecha.`);
    return false;
  }
  const ini = valorDeclarado(prefijo, 'Inicio'), fin = valorDeclarado(prefijo, 'Fin');
  if (!ini) { mostrarErrorCampo(document.getElementById(`${prefijo}DeclInicioTexto`), 'Indica la hora de inicio'); return false; }
  if (!fin) { mostrarErrorCampo(document.getElementById(`${prefijo}DeclFinTexto`), 'Indica la hora de fin'); return false; }
  if (fin <= ini) { mostrarErrorCampo(document.getElementById(`${prefijo}DeclFinTexto`), 'La hora de fin debe ser mayor a la de inicio'); return false; }
  return true;
}

// Crea y guarda la jornada declarada (llamar solo tras validar todo lo demás).
function crearJornadaDeclarada(prefijo, fechaISODia, justificacion) {
  if (jornadaDelGasto(fechaISODia)) return;
  const ini = valorDeclarado(prefijo, 'Inicio'), fin = valorDeclarado(prefijo, 'Fin');
  const fechaTexto = fechaISOaDDMMYYYY(fechaISODia);
  const bloque = hora => ({
    hora, horaLarga: horaA12(hora), fecha: fechaTexto, fechaHoraISO: `${fechaISODia}T${hora}:00`,
    ubicacionTexto: 'Jornada declarada manualmente', fuente: 'declarada', sincronizado: true
  });
  const jornada = {
    id: `${gastosMovilUsuario}_${fechaISODia}`,
    usuario: gastosMovilUsuario, fecha: fechaISODia,
    inicio: bloque(ini), fin: bloque(fin),
    estado: 'cerrada', declarada: true,
    declaradaEn: new Date().toISOString(), justificacion: justificacion || '',
    operaciones: typeof obtenerOperacionesAsignadasOperador === 'function' ? obtenerOperacionesAsignadasOperador(gastosMovilUsuario).slice(0, 3) : []
  };
  jornada.horas = calcularHorasJornada(jornada.inicio, jornada.fin);
  JORNADAS_MOVIL_DEMO[jornada.id] = jornada;
  guardarJornadasMovil();
}

function esGastoOlvidado(fechaISODia) {
  return fechaISODia < hoyISO();
}

// Horas desde que cerró la Jornada de esa fecha — null si esa fecha no es
// un "olvido" (sigue siendo hoy) o si esa jornada nunca se cerró (no hay
// desde cuándo contar el plazo).
function horasDesdeCierreJornada(fechaISODia) {
  if (!esGastoOlvidado(fechaISODia)) return null;
  const jornada = jornadaDelGasto(fechaISODia);
  // Día sin jornada marcada (jornada olvidada): el plazo corre desde el fin
  // de ese día calendario. Una jornada declarada también cuenta desde ahí
  // (su hora de fin es solo declarativa, no debe acortar el plazo).
  if (!jornada || jornada.declarada) return (Date.now() - finDelDiaMs(fechaISODia)) / 3600000;
  if (!jornada.fin) return null;
  return (Date.now() - new Date(jornada.fin.fechaHoraISO).getTime()) / 3600000;
}

// Fecha/hora límite para añadir información de ese día: fin de la jornada
// + plazoOlvidoHoras (Configuración de gastos, web). Si la jornada no tiene
// fin marcado o fue declarada, se cuenta desde el fin del día calendario.
function limitePlazoOlvido(fechaISODia) {
  const jornada = jornadaDelGasto(fechaISODia);
  const base = (jornada && jornada.fin && !jornada.declarada)
    ? new Date(jornada.fin.fechaHoraISO).getTime()
    : finDelDiaMs(fechaISODia);
  return new Date(base + CONFIG_JORNADA_DEMO.plazoOlvidoHoras * 3600000);
}

function textoLimitePlazo(fechaISODia) {
  const l = limitePlazoOlvido(fechaISODia);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(l.getDate())}/${pad(l.getMonth() + 1)} ${horaA12(`${pad(l.getHours())}:${pad(l.getMinutes())}`)}`;
}

function dentroDePlazoOlvido(fechaISODia) {
  const horas = horasDesdeCierreJornada(fechaISODia);
  if (horas === null) return true; // no es un olvido: no aplica ningún plazo
  return horas <= CONFIG_JORNADA_DEMO.plazoOlvidoHoras;
}

// "Pasado el plazo solo se puede ver y descargar" (§3) — bloquea Editar/
// Eliminar una vez vencido el plazo de olvidos para la fecha de esa fila
// (recibe la fecha en dd/mm/yyyy, como viene guardada en la grilla).
function puedeEditarGastoEnFecha(fechaDD) {
  return dentroDePlazoOlvido(fechaDDMMYYYYaISO(fechaDD));
}

// Muestra/oculta el campo de Justificación según si la fecha elegida cae
// en una Jornada ya cerrada — "prefijo" es 'alimentos' o 'movilidad' (los
// 2 modales comparten el mismo patrón de ids).
function actualizarVisibilidadJustificacion(prefijo, fechaISODia) {
  const grupo = document.getElementById(`${prefijo}JustificacionGroup`);
  if (!grupo) return;
  grupo.style.display = esGastoOlvidado(fechaISODia) ? '' : 'none';
}

function actualizarJustificacionMovilidad() {
  const fechaInput = document.getElementById('movilidadFecha');
  if (!fechaInput || !fechaInput.value) return;
  renderBloqueDeclaracion('movilidad', fechaInput.value);
  actualizarVisibilidadJustificacion('movilidad', fechaInput.value);
  renderPanelInformativoGasto('movilidad', fechaInput.value, 'Movilidad');
}

// Lee lo escrito en las tarjetas de comida (para no perderlo al volver a
// dibujarlas, p.ej. al cambiar la fecha o declarar la jornada).
function leerValoresComidasAlimentos() {
  const v = {};
  COMIDAS_ALIMENTOS.forEach(c => {
    const lugar = document.getElementById(`alimLugar_${c}`);
    if (!lugar) return;
    v[c] = { lugar: lugar.value, hora: document.getElementById(`alimHora_${c}`).value, costo: document.getElementById(`alimCosto_${c}`).value };
  });
  return v;
}

// Una tarjeta por comida. Solo quedan habilitadas las que corresponden a la
// hora configurada (comidaDisponible) y que ese día todavía no se
// registraron; las demás muestran el motivo. Al editar, una sola tarjeta.
function renderComidasAlimentos(valores) {
  const cont = document.getElementById('alimentosComidasLista');
  if (!cont) return;
  valores = valores || {};
  const fechaISO = document.getElementById('alimentosFecha').value;
  const editando = alimentosIndiceEditando !== null;
  const detalle = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
  const fechaDD = fechaISO ? fechaISOaDDMMYYYY(fechaISO) : '';

  const comidas = editando ? [alimentosComidaEditando] : COMIDAS_ALIMENTOS;
  const motivoBloqueo = c => {
    if (!fechaISO) return 'Selecciona una fecha.';
    if (!editando && !comidaDisponible(c, fechaISO)) return 'No corresponde según la hora configurada para esta jornada.';
    if (!editando && detalle.grilla.some(f => f.fecha === fechaDD && f.comida === c)) return 'Ya registrada este día.';
    return '';
  };
  // Las comidas disponibles van primero; las ya registradas o no habilitadas quedan al final.
  const ordenadas = [...comidas].sort((x, y) => (motivoBloqueo(x) ? 1 : 0) - (motivoBloqueo(y) ? 1 : 0));
  cont.innerHTML = ordenadas.map(c => {
    const bloqueo = motivoBloqueo(c);

    if (bloqueo) {
      return `<div class="gastos-multi-card deshabilitada">
        <div class="gastos-multi-card-cab"><span class="gastos-multi-card-titulo">${c}</span><span class="gastos-multi-card-estado">${bloqueo}</span></div>
      </div>`;
    }
    const v = valores[c] || {};
    return `${abrirTarjetaGasto(`alim_${c}`, c, editando ? 'Editando' : 'Disponible')}
      ${htmlCampoGasto('Lugar', `alimLugar_${c}`, ICONO_LUGAR_GASTO, 'type="text"', v.lugar)}
      ${htmlSelectorHoraGasto(`alimHora_${c}`, 'Hora', v.hora)}
      ${htmlCampoGasto('Costo (S/)', `alimCosto_${c}`, ICONO_SOLES_GASTO, 'type="number" step="0.01" oninput="actualizarTopeAlimentos()"', v.costo)}
      <span class="movil-input-contador" id="alimTope_${c}"></span>
      ${htmlEvidenciaTarjeta(`alim_${c}`)}
    ${CERRAR_TARJETA_GASTO}`;
  }).join('');
  cont.querySelectorAll('.gastos-multi-card.contraida').forEach(actualizarResumenTarjetaGasto);
}

// Refresca las tarjetas de comida según la fecha elegida (se llama al abrir
// el modal, al editar, al cambiar la fecha y al declarar la jornada).
function actualizarComidasDisponibles() {
  const fechaInput = document.getElementById('alimentosFecha');
  const span = document.getElementById('alimentosComidaCorteTexto');
  if (!fechaInput || !fechaInput.value) return;

  renderComidasAlimentos(leerValoresComidasAlimentos());

  const jornada = jornadaDelGasto(fechaInput.value);
  if (span) {
    if (!jornada) span.textContent = jornadaDeclarable(fechaInput.value)
      ? 'No hay jornada marcada ese día: decláralo abajo para poder registrar.'
      : 'No hay jornada marcada en esta fecha: no se puede registrar.';
    else if (!jornada.inicio) span.textContent = '';
    else span.textContent = `Jornada inició ${jornada.inicio.hora}${jornada.inicio.fuente === 'declarada' ? ' (declarada)' : ''}.`;
  }
  renderBloqueDeclaracion('alimentos', fechaInput.value);
  actualizarVisibilidadJustificacion('alimentos', fechaInput.value);
  actualizarTopeAlimentos();
  renderPanelInformativoGasto('alimentos', fechaInput.value, 'Alimentos');
}

// Muestra, por comida y para todo el día, cuánto se llevaría gastado contra
// los topes de Configuración — antes de intentar guardar.
function actualizarTopeAlimentos() {
  const resumen = document.getElementById('alimentosTopeTexto');
  const fecha = document.getElementById('alimentosFecha').value;
  if (!resumen) return;
  if (!fecha) { resumen.textContent = ''; return; }
  let suma = 0;
  COMIDAS_ALIMENTOS.forEach(c => {
    const costoEl = document.getElementById(`alimCosto_${c}`);
    const topeEl = document.getElementById(`alimTope_${c}`);
    if (!costoEl || !topeEl) return;
    const costo = parseFloat(costoEl.value) || 0;
    suma += costo;
    const { totalComida } = totalesAlimentosDelDia(fecha, c);
    const tope = LIMITES_GASTOS_DEMO.alimentos[c.toLowerCase()];
    topeEl.textContent = `Tope ${c.toLowerCase()}: S/ ${(totalComida + costo).toFixed(2)} / S/ ${tope.toFixed(2)}`;
  });
  const { totalDia } = totalesAlimentosDelDia(fecha, 'Desayuno');
  resumen.textContent = `Tope del día: S/ ${(totalDia + suma).toFixed(2)} / S/ ${LIMITES_GASTOS_DEMO.alimentos.montoMaximoDia.toFixed(2)}`;
}

// Suma lo YA registrado ese día (excluyendo la fila que se está editando,
// si aplica) — para comparar contra los topes antes de agregar/editar.
function totalesAlimentosDelDia(fechaISODia, comida) {
  const detalle = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
  const fechaDD = fechaISOaDDMMYYYY(fechaISODia);
  let totalDia = 0, totalComida = 0;
  detalle.grilla.forEach((f, i) => {
    if (alimentosIndiceEditando === i) return;
    if (f.fecha !== fechaDD) return;
    totalDia += Number(f.costo) || 0;
    if (f.comida === comida) totalComida += Number(f.costo) || 0;
  });
  return { totalDia, totalComida };
}

// Guarda de una sola vez todas las comidas llenadas (Desayuno, Almuerzo y/o
// Cena) — o la única comida en edición.
function guardarGastoAlimentos() {
  const fechaInput = document.getElementById('alimentosFecha');
  const editando = alimentosIndiceEditando !== null;

  if (!fechaInput.value) { mostrarErrorCampo(fechaInput, 'Selecciona una fecha'); return; }
  if (fechaInput.value > hoyISO()) { mostrarErrorCampo(fechaInput, 'La fecha no puede ser futura'); return; }

  // Comidas con datos (en edición, la única tarjeta siempre cuenta).
  const entradas = [];
  COMIDAS_ALIMENTOS.forEach(c => {
    const lugarEl = document.getElementById(`alimLugar_${c}`);
    if (!lugarEl) return; // tarjeta bloqueada o no mostrada
    const horaEl = document.getElementById(`alimHora_${c}`);
    const costoEl = document.getElementById(`alimCosto_${c}`);
    if (!editando && !lugarEl.value.trim() && !costoEl.value && !horaEl.value) return;
    entradas.push({ comida: c, lugarEl, horaEl, costoEl });
  });
  if (!entradas.length) { mostrarToast('Completa al menos una comida (lugar y costo).'); return; }

  for (const e of entradas) {
    if (!e.lugarEl.value.trim()) { errorCampoGasto(e.lugarEl, `Ingresa el lugar del ${e.comida.toLowerCase()}`); return; }
    const costo = parseFloat(e.costoEl.value);
    if (isNaN(costo) || costo <= 0) { errorCampoGasto(e.costoEl, `Ingresa un costo válido para ${e.comida.toLowerCase()}`); return; }
    e.costo = costo;
  }

  // §3: sin jornada marcada/declarada en esa fecha no se puede registrar
  // nada; con jornada, cada comida respeta su rango horario (defensa en
  // profundidad: ya salen bloqueadas en su tarjeta).
  if (!validarDeclaracionJornada('alimentos', fechaInput.value)) return;
  for (const e of entradas) {
    if (!comidaDisponible(e.comida, fechaInput.value)) { mostrarToast(`${e.comida} no está disponible: la jornada de ese día no cae dentro de su rango de horas.`); return; }
  }

  // Topes: por comida y por día (sumando todo lo que se guarda a la vez).
  const topeDia = LIMITES_GASTOS_DEMO.alimentos.montoMaximoDia;
  let sumaNuevos = 0;
  for (const e of entradas) {
    const { totalComida } = totalesAlimentosDelDia(fechaInput.value, e.comida);
    const topeComida = LIMITES_GASTOS_DEMO.alimentos[e.comida.toLowerCase()];
    if (totalComida + e.costo > topeComida) { mostrarToast(`Supera el tope de ${e.comida.toLowerCase()} (S/ ${topeComida.toFixed(2)}).`); return; }
    sumaNuevos += e.costo;
  }
  const { totalDia } = totalesAlimentosDelDia(fechaInput.value, 'Desayuno');
  if (totalDia + sumaNuevos > topeDia) { mostrarToast(`Supera el tope del día (S/ ${topeDia.toFixed(2)}).`); return; }

  // Gasto olvidado (§3): la fecha ya quedó en el pasado — pide justificación
  // y respeta el plazo (configurable) — ver guardado anterior.
  const justificacionInput = document.getElementById('alimentosJustificacion');
  const esOlvido = esGastoOlvidado(fechaInput.value);
  if (esOlvido) {
    if (!dentroDePlazoOlvido(fechaInput.value)) { mostrarToast(`Ya pasó el plazo (${CONFIG_JORNADA_DEMO.plazoOlvidoHoras} h) para agregar un gasto olvidado en esta fecha.`); return; }
    if (!justificacionInput.value.trim()) { mostrarErrorCampo(justificacionInput, 'La justificación es obligatoria para un gasto olvidado'); return; }
  }

  // Operación/PER y Cliente se derivan de las operaciones ASIGNADAS al
  // operador (con varias, se unen por " / ").
  crearJornadaDeclarada('alimentos', fechaInput.value, justificacionInput.value.trim());
  const jornada = jornadaDelGasto(fechaInput.value);
  const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(gastosMovilUsuario) : [];
  const codigoInfo = jornada ? obtenerOCrearCodigoReporteJornada('Alimentos', jornada.id) : null;

  const detalle = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
  const filaPrevia = editando ? detalle.grilla[alimentosIndiceEditando] : null;
  const filas = entradas.map(e => ({
    fecha: fechaISOaDDMMYYYY(fechaInput.value), comida: e.comida,
    lugar: e.lugarEl.value.trim(),
    cliente: operaciones.length ? operaciones.map(o => o.cliente).join(' / ') : '—',
    operacionPer: operaciones.length ? operaciones.map(o => o.per).join(' / ') : '—',
    jornadaId: jornada ? jornada.id : null,
    codigoJornada: codigoInfo ? codigoInfo.codigo : null,
    hora: e.horaEl.value || '—', costo: e.costo,
    evidencia: [...(evidenciaTarjetas[`alim_${e.comida}`] || [])],
    sinSustento: false,
    agregadoPosterior: esOlvido,
    justificacion: esOlvido ? justificacionInput.value.trim() : '',
    agregadoEn: esOlvido ? ((filaPrevia && filaPrevia.agregadoEn) || new Date().toISOString()) : null
  }));

  if (editando) detalle.grilla[alimentosIndiceEditando] = filas[0];
  else filas.forEach(fila => detalle.grilla.push(fila));

  guardarEstadoGastos();
  cerrarModal('modalRegistrarAlimentos');
  renderTarjetasGastos();
  renderReportesAccordion();
  mostrarModalConfirmacionMovil(filas.length > 1
    ? `${filas.length} comidas de Alimentos guardadas. Ya las puede ver tu supervisor.`
    : 'Gasto de Alimentos guardado. Ya lo puede ver tu supervisor.');
}

function editarGastoAlimentos(indice) {
  const detalle = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
  const fila = detalle.grilla[indice];
  if (!fila) return;
  if (!puedeEditarGastoEnFecha(fila.fecha)) { mostrarToast('Ya pasó el plazo para editar este gasto: solo se puede ver y descargar.'); return; }

  alimentosIndiceEditando = indice;
  alimentosComidaEditando = fila.comida;
  evidenciaTarjetas = { [`alim_${fila.comida}`]: [...(fila.evidencia || [])] };
  document.getElementById('tituloRegistrarAlimentos').textContent = 'Editar Alimentos';
  document.getElementById('alimentosFecha').value = fechaDDMMYYYYaISO(fila.fecha);
  document.getElementById('alimentosFecha').max = fechaMaxPeriodo();
  document.getElementById('alimentosJustificacion').value = fila.justificacion || '';
  limpiarDeclaracionJornada('alimentos');
  actualizarComidasDisponibles();
  // fila.hora puede venir en 24h limpio o como texto "hh:mm am/pm" (datos de
  // ejemplo anteriores) — horaA24DesdeTexto entiende ambos formatos.
  renderComidasAlimentos({ [fila.comida]: { lugar: fila.lugar, hora: fila.hora === '—' ? '' : horaA24DesdeTexto(fila.hora), costo: fila.costo } });
  actualizarTopeAlimentos();
  renderPanelInformativoGasto('alimentos', fechaDDMMYYYYaISO(fila.fecha), 'Alimentos');
  abrirModal('modalRegistrarAlimentos');
}

// Atajos de los botones "Añadir" de cada jornada (ver
// renderJornadasRecientesGastos): abren el modal de Alimentos o Movilidad
// con la fecha de esa jornada ya elegida.
function anadirPendienteAlimentos(fechaISO) {
  abrirModalRegistrarAlimentos(fechaISO);
  document.getElementById('alimentosFecha').value = fechaISO;
  actualizarComidasDisponibles();
}

function anadirPendienteMovilidad(fechaISO) {
  abrirModalRegistrarMovilidad(fechaISO);
  document.getElementById('movilidadFecha').value = fechaISO;
  actualizarJustificacionMovilidad();
  actualizarTopeMovilidad();
}

function eliminarGastoAlimentos(indice) {
  const detalle0 = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
  const fila0 = detalle0.grilla[indice];
  if (!fila0) return;
  if (!puedeEditarGastoEnFecha(fila0.fecha)) { mostrarToast('Ya pasó el plazo para eliminar este gasto: solo se puede ver y descargar.'); return; }

  confirmarAccion('¿Eliminar este gasto de Alimentos?', () => {
    const detalle = obtenerDetalleGastoPorTipo('Alimentos', gastosMovilPeriodo.ids['Alimentos']);
    detalle.grilla.splice(indice, 1);
    guardarEstadoGastos();
    renderTarjetasGastos();
    renderReportesAccordion();
  });
}

/* =================================================
   MOVILIDAD — valida tope por viaje y por día.
================================================= */
let movilidadIndiceEditando = null;

let movilidadViajeSeq = 0;
let movilidadViajesIds = [];

function abrirModalRegistrarMovilidad(fechaISO) {
  const fechaInicial = fechaISO || fechaMaxPeriodo();
  if (!jornadaPermiteRegistrar(fechaInicial)) return;
  movilidadIndiceEditando = null;
  evidenciaTarjetas = {};
  tarjetasGastoContraidas.clear();
  document.getElementById('tituloRegistrarMovilidad').textContent = 'Registrar Movilidad';
  document.getElementById('movilidadFecha').value = fechaInicial;
  document.getElementById('movilidadFecha').max = fechaMaxPeriodo();
  document.getElementById('movilidadFecha').min = fechaDDMMYYYYaISO(gastosMovilPeriodo.fechaDesde);
  renderViajesMovilidad([{}]);
  document.getElementById('movilidadJustificacion').value = '';
  limpiarDeclaracionJornada('movilidad');
  actualizarJustificacionMovilidad();
  actualizarTopeMovilidad();
  renderPanelInformativoGasto('movilidad', fechaInicial, 'Movilidad');
  abrirModal('modalRegistrarMovilidad');
}

// Un registro de Movilidad admite varios viajes: cada uno es una tarjeta con
// su empresa, ruta e importe, y cada uno se guarda como su propia fila.
function renderViajesMovilidad(valores) {
  const cont = document.getElementById('movilidadViajesLista');
  if (!cont) return;
  const editando = movilidadIndiceEditando !== null;
  movilidadViajesIds = valores.map(v => v.k || ++movilidadViajeSeq);
  valores.forEach((v, i) => { if (v.evidencia) evidenciaTarjetas[`mov_${movilidadViajesIds[i]}`] = [...v.evidencia]; });
  cont.innerHTML = valores.map((v, i) => {
    const k = movilidadViajesIds[i];
    const quitar = !editando && valores.length > 1
      ? `<button type="button" class="gastos-multi-card-quitar" onclick="quitarViajeMovilidad(${k})">Quitar</button>` : '';
    return `${abrirTarjetaGasto(`mov_${k}`, `Viaje ${i + 1}`, '', quitar)}
      ${htmlCampoGasto('Empresa', `movV_${k}_empresa`, ICONO_CAMION_GASTO, 'type="text"', v.empresa)}
      ${htmlCampoGasto('Distrito de partida', `movV_${k}_partida`, ICONO_LUGAR_GASTO, 'type="text"', v.partida)}
      ${htmlCampoGasto('Distrito de destino', `movV_${k}_destino`, ICONO_LUGAR_GASTO, 'type="text"', v.destino)}
      ${htmlCampoGasto('Motivo', `movV_${k}_motivo`, ICONO_MOTIVO_GASTO, 'type="text"', v.motivo)}
      ${htmlCampoGasto('Importe (S/)', `movV_${k}_importe`, ICONO_SOLES_GASTO, 'type="number" step="0.01" oninput="actualizarTopeMovilidad()"', v.importe)}
      ${htmlEvidenciaTarjeta(`mov_${k}`)}
    ${CERRAR_TARJETA_GASTO}`;
  }).join('');
  cont.querySelectorAll('.gastos-multi-card.contraida').forEach(actualizarResumenTarjetaGasto);
  const btn = document.getElementById('btnAgregarViaje');
  if (btn) btn.style.display = editando ? 'none' : '';
}

function leerViajesMovilidad() {
  const val = (k, campo) => { const el = document.getElementById(`movV_${k}_${campo}`); return el ? el.value : ''; };
  return movilidadViajesIds.map(k => ({
    k, empresa: val(k, 'empresa'), partida: val(k, 'partida'), destino: val(k, 'destino'),
    motivo: val(k, 'motivo'), importe: val(k, 'importe')
  }));
}

function agregarViajeMovilidad() {
  const vals = leerViajesMovilidad();
  vals.push({});
  renderViajesMovilidad(vals);
  actualizarTopeMovilidad();
  const ultimo = document.getElementById(`movV_${movilidadViajesIds[movilidadViajesIds.length - 1]}_empresa`);
  if (ultimo) ultimo.focus();
}

function quitarViajeMovilidad(k) {
  renderViajesMovilidad(leerViajesMovilidad().filter(v => v.k !== k));
  actualizarTopeMovilidad();
}

function totalMovilidadDelDia(fechaISODia) {
  const detalle = obtenerDetalleGastoPorTipo('Movilidad', gastosMovilPeriodo.ids['Movilidad']);
  const fechaDD = fechaISOaDDMMYYYY(fechaISODia);
  let totalDia = 0;
  detalle.grilla.forEach((f, i) => {
    if (movilidadIndiceEditando === i) return;
    if (f.fecha === fechaDD) totalDia += Number(f.totalDia) || 0;
  });
  return totalDia;
}

function actualizarTopeMovilidad() {
  const span = document.getElementById('movilidadTopeTexto');
  const fecha = document.getElementById('movilidadFecha').value;
  if (!span) return;
  if (!fecha) { span.textContent = ''; return; }
  const suma = leerViajesMovilidad().reduce((acc, v) => acc + (parseFloat(v.importe) || 0), 0);
  const totalDia = totalMovilidadDelDia(fecha);
  const topeViaje = LIMITES_GASTOS_DEMO.movilidad.montoMaximoViaje;
  const topeDia = LIMITES_GASTOS_DEMO.movilidad.montoMaximoDia;
  span.textContent = `Tope por viaje: S/ ${topeViaje.toFixed(2)} · Total de estos viajes: S/ ${suma.toFixed(2)} · Tope del día: S/ ${(totalDia + suma).toFixed(2)} / S/ ${topeDia.toFixed(2)}`;
}

// Guarda de una sola vez todos los viajes del registro (cada uno como su
// propia fila) — o el único viaje en edición.
function guardarGastoMovilidad() {
  const fechaInput = document.getElementById('movilidadFecha');
  const editando = movilidadIndiceEditando !== null;

  if (!fechaInput.value) { mostrarErrorCampo(fechaInput, 'Selecciona una fecha'); return; }
  if (fechaInput.value > hoyISO()) { mostrarErrorCampo(fechaInput, 'La fecha no puede ser futura'); return; }

  const viajes = leerViajesMovilidad();
  const topeViaje = LIMITES_GASTOS_DEMO.movilidad.montoMaximoViaje;
  const topeDia = LIMITES_GASTOS_DEMO.movilidad.montoMaximoDia;
  let suma = 0;
  for (let i = 0; i < viajes.length; i++) {
    const v = viajes[i];
    const n = viajes.length > 1 ? ` del viaje ${i + 1}` : '';
    if (!v.empresa.trim()) { errorCampoGasto(document.getElementById(`movV_${v.k}_empresa`), `Ingresa la empresa${n}`); return; }
    const importe = parseFloat(v.importe);
    if (isNaN(importe) || importe <= 0) { errorCampoGasto(document.getElementById(`movV_${v.k}_importe`), `Ingresa un importe válido${n}`); return; }
    if (importe > topeViaje) { mostrarToast(`El viaje ${i + 1} supera el tope por viaje (S/ ${topeViaje.toFixed(2)}).`); return; }
    v.importeNum = importe;
    suma += importe;
  }

  // §3: Movilidad solo tiene tope de monto (sin corte horario), pero sigue
  // exigiendo una jornada marcada/declarada en esa fecha.
  if (!validarDeclaracionJornada('movilidad', fechaInput.value)) return;

  const totalDia = totalMovilidadDelDia(fechaInput.value);
  if (totalDia + suma > topeDia) { mostrarToast(`Supera el tope del día (S/ ${topeDia.toFixed(2)}).`); return; }

  // Gasto olvidado (§3): ver guardarGastoAlimentos.
  const justificacionInput = document.getElementById('movilidadJustificacion');
  const esOlvido = esGastoOlvidado(fechaInput.value);
  if (esOlvido) {
    if (!dentroDePlazoOlvido(fechaInput.value)) { mostrarToast(`Ya pasó el plazo (${CONFIG_JORNADA_DEMO.plazoOlvidoHoras} h) para agregar un gasto olvidado en esta fecha.`); return; }
    if (!justificacionInput.value.trim()) { mostrarErrorCampo(justificacionInput, 'La justificación es obligatoria para un gasto olvidado'); return; }
  }

  // Operaciones involucradas de la jornada de esa fecha (§1) — solo
  // informativo; Movilidad igual queda ligada a su jornada.
  crearJornadaDeclarada('movilidad', fechaInput.value, justificacionInput.value.trim());
  const jornadaMov = jornadaDelGasto(fechaInput.value);
  const codigoInfoMov = jornadaMov ? obtenerOCrearCodigoReporteJornada('Movilidad', jornadaMov.id) : null;

  const detalle = obtenerDetalleGastoPorTipo('Movilidad', gastosMovilPeriodo.ids['Movilidad']);
  const filaPrevia = editando ? detalle.grilla[movilidadIndiceEditando] : null;
  const filas = viajes.map(v => {
    const fila = {
      fecha: fechaISOaDDMMYYYY(fechaInput.value), empresa: v.empresa.trim(),
      distritoPartida: v.partida.trim() || '—', distritoDestino: v.destino.trim() || '—',
      motivo: v.motivo.trim() || '—', importeDia: v.importeNum, totalDia: v.importeNum,
      jornadaId: jornadaMov ? jornadaMov.id : null,
      codigoJornada: codigoInfoMov ? codigoInfoMov.codigo : null,
      evidencia: [...(evidenciaTarjetas[`mov_${v.k}`] || [])], sinSustento: false,
      agregadoPosterior: esOlvido,
      justificacion: esOlvido ? justificacionInput.value.trim() : '',
      agregadoEn: esOlvido ? ((filaPrevia && filaPrevia.agregadoEn) || new Date().toISOString()) : null
    };
    return fila;
  });

  if (editando) detalle.grilla[movilidadIndiceEditando] = filas[0];
  else filas.forEach(fila => detalle.grilla.push(fila));

  guardarEstadoGastos();
  cerrarModal('modalRegistrarMovilidad');
  renderTarjetasGastos();
  renderReportesAccordion();
  mostrarModalConfirmacionMovil(filas.length > 1
    ? `${filas.length} viajes de Movilidad guardados. Ya los puede ver tu supervisor.`
    : 'Gasto de Movilidad guardado. Ya lo puede ver tu supervisor.');
}

function editarGastoMovilidad(indice) {
  const detalle = obtenerDetalleGastoPorTipo('Movilidad', gastosMovilPeriodo.ids['Movilidad']);
  const fila = detalle.grilla[indice];
  if (!fila) return;
  if (!puedeEditarGastoEnFecha(fila.fecha)) { mostrarToast('Ya pasó el plazo para editar este gasto: solo se puede ver y descargar.'); return; }

  movilidadIndiceEditando = indice;
  evidenciaTarjetas = {};
  document.getElementById('tituloRegistrarMovilidad').textContent = 'Editar Movilidad';
  document.getElementById('movilidadFecha').value = fechaDDMMYYYYaISO(fila.fecha);
  document.getElementById('movilidadFecha').max = fechaMaxPeriodo();
  renderViajesMovilidad([{
    empresa: fila.empresa,
    partida: fila.distritoPartida === '—' ? '' : fila.distritoPartida,
    destino: fila.distritoDestino === '—' ? '' : fila.distritoDestino,
    motivo: fila.motivo === '—' ? '' : fila.motivo,
    importe: fila.importeDia, evidencia: fila.evidencia || []
  }]);
  document.getElementById('movilidadJustificacion').value = fila.justificacion || '';
  limpiarDeclaracionJornada('movilidad');
  actualizarJustificacionMovilidad();
  actualizarTopeMovilidad();
  renderPanelInformativoGasto('movilidad', fechaDDMMYYYYaISO(fila.fecha), 'Movilidad');
  abrirModal('modalRegistrarMovilidad');
}

function eliminarGastoMovilidad(indice) {
  const detalle0 = obtenerDetalleGastoPorTipo('Movilidad', gastosMovilPeriodo.ids['Movilidad']);
  const fila0 = detalle0.grilla[indice];
  if (!fila0) return;
  if (!puedeEditarGastoEnFecha(fila0.fecha)) { mostrarToast('Ya pasó el plazo para eliminar este gasto: solo se puede ver y descargar.'); return; }

  confirmarAccion('¿Eliminar este gasto de Movilidad?', () => {
    const detalle = obtenerDetalleGastoPorTipo('Movilidad', gastosMovilPeriodo.ids['Movilidad']);
    detalle.grilla.splice(indice, 1);
    guardarEstadoGastos();
    renderTarjetasGastos();
    renderReportesAccordion();
  });
}

/* =================================================
   REPORTES — vista acordeón por día (reportes-movil.html): agrupa cada tipo
   por fecha (mismo criterio que la planilla real, un bloque por día) con un
   encabezado de resumen del día y un acordeón numerado por registro, igual
   que los wireframes de Movilidad/Alimentos. Editar/Eliminar reutilizan los
   mismos modales y funciones de "Generar Reporte" (duplicados en el HTML
   de esta página) — Días a Bordo queda de solo lectura.
================================================= */
// "Todos" por defecto (antes quedaba en "Movilidad" sin motivo): al entrar
// a Reportes se debe ver todo lo generado, con lo más reciente arriba
// (reportesOrden ya es 'desc') — no un tipo puntual elegido al azar.
let reportesTabActiva = 'Todos';
let reportesAcordeonAbiertos = {};
// Filtros (§5): búsqueda libre (código/PER/cliente) + rango de fechas +
// orden — se aplican sobre el tipo seleccionado en los chips.
let reportesBusqueda = '';
let reportesFechaFiltro = ''; // una sola fecha (ISO) dentro del período elegido
let reportesOrden = 'desc'; // 'desc' = más recientes primero

function hayPantallaReportes() { return !!document.getElementById('reportesAccordion'); }

// =================================================
// SELECTOR DE HORA PROPIO (ítem 1, Sprint 4; estilo spinner con flechas —
// mismo look que el time-picker de PrimeNG, pedido explícitamente) —
// reemplaza el <input type="time"> nativo (24h/12h según SO/navegador,
// fuera de nuestro control) por un dropdown propio, siempre 12h am/pm. El
// <input type="hidden" id="{baseId}"> sigue siendo la única fuente de
// verdad en 24h "HH:MM" (mismo contrato que usaba el input nativo: todo el
// resto del código que lee/escribe `.value` de "alimentosHora" sigue
// funcionando igual) — el texto visible vive aparte, en "{baseId}Texto".
// Cada unidad (hora/minuto/am-pm) es un "spinner": el valor actual vive en
// el propio texto del div "{baseId}Spin{H|M|Ampm}" (no hay estado aparte en
// JS, a diferencia de pcalHoraValor en operaciones.js, porque acá puede
// haber más de un campo de hora en la misma pantalla a la vez).
// =================================================
function hspinIdValor(baseId, unidad) {
  return `${baseId}Spin${unidad === 'h' ? 'H' : unidad === 'm' ? 'M' : 'Ampm'}`;
}

function hspinObtener(baseId, unidad) {
  const el = document.getElementById(hspinIdValor(baseId, unidad));
  return el ? el.textContent.trim() : null;
}

function hspinFijar(baseId, unidad, valor) {
  const el = document.getElementById(hspinIdValor(baseId, unidad));
  if (!el) return;
  el.textContent = unidad === 'ampm' ? valor : String(valor).padStart(2, '0');
}

function hspinAjustar(baseId, unidad, delta) {
  if (unidad === 'h') {
    let h = Number(hspinObtener(baseId, 'h'));
    hspinFijar(baseId, 'h', ((h - 1 + delta + 12) % 12) + 1);
  } else if (unidad === 'm') {
    let m = Number(hspinObtener(baseId, 'm'));
    hspinFijar(baseId, 'm', (m + delta + 60) % 60);
  } else {
    hspinFijar(baseId, 'ampm', hspinObtener(baseId, 'ampm') === 'AM' ? 'PM' : 'AM');
  }
}

function hspinRueda(e, baseId, unidad) {
  e.preventDefault();
  hspinAjustar(baseId, unidad, e.deltaY < 0 ? 1 : -1);
}

function actualizarDisplayHora(baseId) {
  const hidden = document.getElementById(baseId);
  const texto = document.getElementById(`${baseId}Texto`);
  if (!hidden || !texto) return;
  texto.value = hidden.value ? horaA12(hidden.value) : '';
}

function abrirSelectorHora(baseId) {
  const drop = document.getElementById(`${baseId}Dropdown`);
  const hidden = document.getElementById(baseId);
  if (!drop || !hidden) return;

  let h24 = hidden.value;
  if (!h24) {
    const ahora = new Date();
    h24 = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  }
  const [hh, mm] = h24.split(':').map(Number);
  hspinFijar(baseId, 'h', hh % 12 === 0 ? 12 : hh % 12);
  hspinFijar(baseId, 'm', mm);
  hspinFijar(baseId, 'ampm', hh >= 12 ? 'PM' : 'AM');

  // Un solo selector de hora abierto a la vez.
  document.querySelectorAll('.movil-hora-dropdown').forEach(d => { if (d !== drop) d.style.display = 'none'; });
  drop.style.display = drop.style.display === 'none' ? '' : 'none';
}

function confirmarSelectorHora(baseId) {
  const hidden = document.getElementById(baseId);
  const h12 = Number(hspinObtener(baseId, 'h'));
  const mm = Number(hspinObtener(baseId, 'm'));
  const ampm = hspinObtener(baseId, 'ampm');
  const h24 = ampm === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);

  hidden.value = `${String(h24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  hidden.dispatchEvent(new Event('change', { bubbles: true }));
  actualizarDisplayHora(baseId);
  document.getElementById(`${baseId}Dropdown`).style.display = 'none';
}

document.addEventListener('click', (e) => {
  document.querySelectorAll('.movil-hora-dropdown').forEach(drop => {
    if (drop.style.display === 'none') return;
    const campo = drop.closest('.movil-hora-campo');
    if (campo && !campo.contains(e.target)) drop.style.display = 'none';
  });
});

function cambiarTabReportes(tipo) {
  reportesTabActiva = tipo;
  reportesAcordeonAbiertos = {};
  const idBoton = tipo === 'Alimentos' ? 'btnTabReportesAlimentos' : tipo === 'Movilidad' ? 'btnTabReportesMovilidad' : tipo === 'Días a Bordo' ? 'btnTabReportesDiasBordo' : 'btnTabReportesTodos';
  document.querySelectorAll('#reportesTabs .movil-tab-toggle-btn').forEach(btn => btn.classList.remove('activo'));
  const btn = document.getElementById(idBoton);
  if (btn) btn.classList.add('activo');
  renderReportesAccordion();
}

function actualizarFiltrosReportes() {
  const busq = document.getElementById('reportesBusqueda');
  const fecha = document.getElementById('reportesFecha');
  reportesBusqueda = busq ? busq.value.trim().toLowerCase() : '';
  reportesFechaFiltro = fecha ? fecha.value : '';
  // Solo fechas del período elegido: una fecha tipeada fuera de rango se descarta.
  if (fecha && reportesFechaFiltro && ((fecha.min && reportesFechaFiltro < fecha.min) || (fecha.max && reportesFechaFiltro > fecha.max))) {
    fecha.value = ''; reportesFechaFiltro = '';
    if (typeof mostrarToast === 'function') mostrarToast('Elige una fecha dentro del período seleccionado.');
  }
  renderReportesAccordion();
}

function limpiarFiltrosReportes() {
  reportesBusqueda = ''; reportesFechaFiltro = '';
  const busq = document.getElementById('reportesBusqueda');
  const fecha = document.getElementById('reportesFecha');
  if (busq) busq.value = '';
  if (fecha) fecha.value = '';
  renderReportesAccordion();
}

function cambiarOrdenReportes() {
  reportesOrden = reportesOrden === 'desc' ? 'asc' : 'desc';
  const txt = document.getElementById('reportesOrdenTexto');
  if (txt) txt.textContent = reportesOrden === 'desc' ? 'Más recientes' : 'Más antiguas';
  renderReportesAccordion();
}

// Texto de búsqueda de una fila: código de jornada, PER/viaje y cliente —
// mismos campos que trae cada fila ya derivados de las operaciones
// involucradas (ver guardarGastoAlimentos/Movilidad y generarDiasABordoOperador).
function filaCoincideBusqueda(f, codigo, texto) {
  if (!texto) return true;
  const campos = [codigo, f.operacionPer, f.cliente, f.per].filter(Boolean).join(' ').toLowerCase();
  return campos.includes(texto);
}

function filaDentroDeRango(f) {
  const fechaISO = fechaDDMMYYYYaISO(f.fecha);
  if (reportesFechaFiltro && fechaISO !== reportesFechaFiltro) return false;
  return true;
}

function toggleReportesAcordeon(clave) {
  reportesAcordeonAbiertos[clave] = !reportesAcordeonAbiertos[clave];
  renderReportesAccordion();
}

// "Agregado posterior" (§3): un gasto olvidado se marca con fecha/hora y
// justificación — se muestra así en el reporte en vez de verse igual que
// uno registrado el mismo día de la jornada.
function notaAgregadoPosterior(f) {
  return '';
}

function camposAcordeonReporte(tipo, f) {
  const chipsEvidencia = htmlEvidenciaGrid(f.evidencia || [], f.sinSustento ? 'Sin sustento' : 'Sin evidencia');
  const olvido = notaAgregadoPosterior(f);

  if (tipo === 'Alimentos') return `
    <div class="reportes-campo"><span>Lugar</span><strong>${f.lugar}</strong></div>
    <div class="reportes-campo"><span>Hora</span><strong>${horaA12Seguro(f.hora)}</strong></div>
    <div class="reportes-campo"><span>Costo</span><strong>S/ ${Number(f.costo || 0).toFixed(2)}</strong></div>
    <div class="reportes-evidencia">${chipsEvidencia}</div>${olvido}`;
  if (tipo === 'Movilidad') return `
    <div class="reportes-campo"><span>Empresa</span><strong>${f.empresa}</strong></div>
    <div class="reportes-campo"><span>Distrito de partida</span><strong>${f.distritoPartida}</strong></div>
    <div class="reportes-campo"><span>Distrito de destino</span><strong>${f.distritoDestino}</strong></div>
    <div class="reportes-campo"><span>Motivo</span><strong>${f.motivo}</strong></div>
    <div class="reportes-campo"><span>Importe Día</span><strong>S/ ${Number(f.importeDia || 0).toFixed(2)}</strong></div>
    <div class="reportes-evidencia">${chipsEvidencia}</div>${olvido}`;
  return `
    <div class="reportes-campo"><span>Lugar</span><strong>${f.lugar || '—'}</strong></div>
    <div class="reportes-campo"><span>Operación</span><strong>${f.operacion || '—'}</strong></div>
    <div class="reportes-campo"><span>Buque</span><strong>${f.buque || '—'}</strong></div>`;
}

// Reportes es solo de CONSULTA: una tarjeta por jornada, con lo registrado en
// cada tipo (Alimentos / Movilidad / Días a Bordo) como en la web. Operaciones
// y precintos se muestran una sola vez por jornada (no por tipo). Cada
// jornada se descarga en PDF y queda marcada como "Descargado".
// Búsqueda por código/PER/cliente, rango de fechas y tipo (incl. "Todos") se
// aplican antes de agrupar.
const DESCARGAS_JORNADA_GASTOS = tgCargarCatalogo('descargasJornadaGastosData', {});
function claveDescargaJornada(fechaISO) { return `${gastosMovilUsuario}|${fechaISO}`; }

function renderReportesAccordion() {
  if (!hayPantallaReportes()) return;
  const cont = document.getElementById('reportesAccordion');
  const totalEl = document.getElementById('reportesTotalGeneral');
  const contadorEl = document.getElementById('reportesContador');
  const tipoSel = reportesTabActiva;

  regenerarDiasABordo(gastosMovilPeriodo.ids['Días a Bordo']);

  const tipos = tipoSel === 'Todos' ? ['Alimentos', 'Movilidad', 'Días a Bordo'] : [tipoSel];
  const campoMontoPorTipo = { 'Alimentos': 'costo', 'Movilidad': 'totalDia', 'Días a Bordo': 'monto' };

  let huboAlgoSinFiltrar = false;
  let filas = [];
  tipos.forEach(tipo => {
    const detalle = obtenerDetalleGastoPorTipo(tipo, gastosMovilPeriodo.ids[tipo]);
    if (detalle.grilla.length) huboAlgoSinFiltrar = true;
    const codigoCampo = tipo === 'Días a Bordo' ? 'codigo' : 'codigoJornada';
    detalle.grilla.forEach((f, i) => {
      if (!filaDentroDeRango(f)) return;
      const codigo = f[codigoCampo] || '';
      if (!filaCoincideBusqueda(f, codigo, reportesBusqueda)) return;
      filas.push({ ...f, _tipo: tipo, _indice: i, _codigo: codigo });
    });
  });

  if (!filas.length) {
    const hayFiltrosActivos = reportesBusqueda || reportesFechaFiltro;
    cont.innerHTML = huboAlgoSinFiltrar && hayFiltrosActivos
      ? `<p class="submodulo-tabla-vacio">Sin reportes para los filtros elegidos.</p>
         <button type="button" class="btn-accion btn-cancelar" style="width:100%;margin-top:8px;" onclick="limpiarFiltrosReportes()">Limpiar filtros</button>`
      : `<p class="submodulo-tabla-vacio">Sin registros${tipoSel === 'Todos' ? '' : ` de ${tipoSel.toLowerCase()}`} en este período.</p>`;
    totalEl.textContent = '';
    if (contadorEl) contadorEl.textContent = '';
    return;
  }

  // Una tarjeta por jornada (fecha); dentro, una sección por tipo.
  const porFecha = {};
  filas.forEach(f => {
    const dia = porFecha[f.fecha] || (porFecha[f.fecha] = {});
    (dia[f._tipo] = dia[f._tipo] || []).push(f);
  });
  const fechas = Object.keys(porFecha).sort((a, b) => {
    const cmp = fechaDDMMYYYYaISO(a).localeCompare(fechaDDMMYYYYaISO(b));
    return reportesOrden === 'desc' ? -cmp : cmp;
  });

  if (contadorEl) contadorEl.textContent = `${fechas.length} jornada${fechas.length === 1 ? '' : 's'}`;

  const operaciones = (typeof obtenerOperacionesAsignadasOperador === 'function') ? obtenerOperacionesAsignadasOperador(gastosMovilUsuario) : [];
  const fmtDescarga = iso => {
    const f = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(f.getDate())}/${pad(f.getMonth() + 1)} ${horaA12(`${pad(f.getHours())}:${pad(f.getMinutes())}`)}`;
  };

  cont.innerHTML = fechas.map(fecha => {
    const dia = porFecha[fecha];
    const fechaISO = fechaDDMMYYYYaISO(fecha);
    const precintosDia = (typeof obtenerPrecintosDeJornada === 'function') ? obtenerPrecintosDeJornada(gastosMovilUsuario, fechaISO) : [];
    let totalJornada = 0;

    // Una línea por reporte (tipo): al tocarla se abre el detalle en un modal.
    const secciones = ['Alimentos', 'Movilidad', 'Días a Bordo'].filter(t => dia[t]).map(tipo => {
      const filasTipo = dia[tipo];
      const totalTipo = filasTipo.reduce((acc, f) => acc + (f.pendiente ? 0 : Number(f[campoMontoPorTipo[tipo]]) || 0), 0);
      totalJornada += totalTipo;
      const codigo = filasTipo[0]._codigo || 'Sin registrar';
      const n = filasTipo.length;
      return `
        <button type="button" class="reportes-tipo-fila" onclick="abrirDetalleReporte('${tipo}', '${fecha}')">
          <span class="reportes-tipo-info">
            <span class="reportes-tipo-nombre">${tipo}</span>
            <span class="reportes-tipo-meta">${codigo} · ${n} registro${n === 1 ? '' : 's'}</span>
          </span>
          <span class="reportes-tipo-total">S/ ${totalTipo.toFixed(2)}</span>
          <svg class="reportes-tipo-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m9 18 6-6-6-6"/></svg>
        </button>`;
    }).join('');

    const desc = DESCARGAS_JORNADA_GASTOS[claveDescargaJornada(fechaISO)];
    const estadoDescarga = desc
      ? `<span class="badge badge-vigente" title="Descargado el ${fmtDescarga(desc.fecha)}">Descargado ${fmtDescarga(desc.fecha)}</span>`
      : '<span class="badge badge-gris">Sin descargar</span>';

    return `
      <div class="reportes-dia-grupo">
        <div class="reportes-dia-header">
          <span class="reportes-dia-fecha">${fecha}</span>
          ${estadoDescarga}
        </div>
        <div class="reportes-dia-operaciones">${textoOperacionesInvolucradas(operaciones)} · ${precintosDia.length ? `Precintos usados (${precintosDia.length})` : 'Sin precintos usados'}</div>
        ${secciones}
        <div class="reportes-dia-pie">
          <span class="reportes-dia-total">Total jornada: S/ ${totalJornada.toFixed(2)}</span>
          <button type="button" class="btn-accion btn-guardar gastos-btn-registrar" onclick="iniciarDescargaJornada('${fechaISO}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${desc ? 'Descargar de nuevo' : 'Descargar PDF'}
          </button>
        </div>
      </div>`;
  }).join('');

  const totalGeneral = filas.reduce((acc, f) => acc + (f.pendiente ? 0 : Number(f[campoMontoPorTipo[f._tipo]]) || 0), 0);
  totalEl.textContent = `Total ${tipoSel === 'Todos' ? 'general' : 'del período'}: S/ ${totalGeneral.toFixed(2)}`;
}

// Detalle de un reporte (tipo) de una jornada en un modal: todos sus
// registros con los campos completos, sin apretar la tarjeta de la lista.
function abrirDetalleReporte(tipo, fecha) {
  const detalle = obtenerDetalleGastoPorTipo(tipo, gastosMovilPeriodo.ids[tipo]);
  const filas = detalle.grilla.filter(f => f.fecha === fecha);
  const campoMonto = { 'Alimentos': 'costo', 'Movilidad': 'totalDia', 'Días a Bordo': 'monto' }[tipo];
  const codigoCampo = tipo === 'Días a Bordo' ? 'codigo' : 'codigoJornada';
  const total = filas.reduce((acc, f) => acc + (f.pendiente ? 0 : Number(f[campoMonto]) || 0), 0);

  document.getElementById('detalleReporteTitulo').textContent = tipo;
  document.getElementById('detalleReporteSub').textContent = `${fecha} · ${(filas[0] && filas[0][codigoCampo]) || 'Sin registrar'}`;
  document.getElementById('detalleReporteLista').innerHTML = filas.map((f, i) => {
    const titulo = tipo === 'Alimentos' ? f.comida : tipo === 'Movilidad' ? `Viaje ${i + 1}` : (f.detalle || `Día ${i + 1}`);
    const monto = f.pendiente ? 'Pendiente' : `S/ ${Number(f[campoMonto] || 0).toFixed(2)}`;
    return `
      <div class="detalle-reg">
        <div class="detalle-reg-cab">
          <span class="reportes-acordeon-numero">${i + 1}</span>
          <span class="detalle-reg-titulo">${titulo}</span>
          <span class="detalle-reg-monto">${monto}</span>
        </div>
        ${camposAcordeonReporte(tipo, f)}
      </div>`;
  }).join('') || '<p class="submodulo-tabla-vacio">Sin registros.</p>';
  document.getElementById('detalleReporteTotal').textContent = `Total: S/ ${total.toFixed(2)}`;
  abrirModal('modalDetalleReporte');
}

/* =================================================
   DESCARGA DE LA JORNADA — "se firman de manera automática validando su
   huella": se simula la validación biométrica (setTimeout + estado de
   carga, mismo patrón que la geolocalización simulada de Operaciones, sin
   hardware real) antes de generar el PDF. El PDF sale IDÉNTICO al que arma
   la web para ese mismo día (mismos builders de descarga-gastos.js: misma
   planilla y marca de agua de "descargado desde este sistema"). Al terminar
   la jornada queda marcada como "Descargado" con fecha y hora.
================================================= */
let reportesDescargaPendiente = null;

function iniciarDescargaJornada(fechaISO) {
  if (!gastosMovilPeriodo) return;
  reportesDescargaPendiente = { fechaISO };
  document.getElementById('huellaEstadoTexto').textContent = 'Coloca tu huella en el sensor…';
  document.getElementById('huellaIcono').classList.remove('huella-ok');
  abrirModal('modalValidarHuella');

  setTimeout(() => {
    const elTexto = document.getElementById('huellaEstadoTexto');
    const elIcono = document.getElementById('huellaIcono');
    if (elTexto) elTexto.textContent = 'Huella validada. Firmando y generando el reporte…';
    if (elIcono) elIcono.classList.add('huella-ok');
    setTimeout(confirmarDescargaConHuella, 700);
  }, 1300);
}

function confirmarDescargaConHuella() {
  if (!reportesDescargaPendiente) return;
  const { fechaISO } = reportesDescargaPendiente;
  reportesDescargaPendiente = null;
  cerrarModal('modalValidarHuella');

  const reporte = construirHTMLReporteJornadaGastos(gastosMovilUsuario, fechaISO);
  if (!reporte) return;
  abrirVentanaHTMLGastos(reporte.html, { imprimir: true });

  // Misma marca de "última descarga" que ve la web, por tipo y para ese día.
  reporte.tipos.forEach(tipo => registrarUltimaDescargaGastos(gastosMovilUsuario, tipo, fechaISO, fechaISO));
  DESCARGAS_JORNADA_GASTOS[claveDescargaJornada(fechaISO)] = { fecha: new Date().toISOString(), tipos: reporte.tipos };
  tgGuardarCatalogo('descargasJornadaGastosData', DESCARGAS_JORNADA_GASTOS);
  guardarEstadoGastos();

  renderReportesAccordion();
  mostrarModalConfirmacionMovil(`Reporte de la jornada ${fechaISOaDDMMYYYY(fechaISO)} firmado con tu huella y descargado.`);
}

document.addEventListener('DOMContentLoaded', inicializarGastosMovil);
