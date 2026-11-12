// =================================================
// CABOTAJE-MOVIL.JS
// Módulo "Dashboard de Cabotaje" de la app móvil — solo para usuarios
// Administrativos. Misma información y mismos filtros que la página web
// (Inicio > Dashboard de Cabotaje, reporte-cabotaje.js): resumen, tendencia de
// viajes, viajes por puerto (origen / destino), top 5 clientes y el listado de
// operaciones con su cronograma. Los gráficos se dibujan con HTML/SVG propio
// (sin librerías externas).
// =================================================
function cabActualizarHora() {
  const el = document.getElementById('horaStatusBar');
  if (!el) return;
  const a = new Date();
  const pad = n => String(n).padStart(2, '0');
  el.textContent = horaA12(`${pad(a.getHours())}:${pad(a.getMinutes())}`);
}
cabActualizarHora();
setInterval(cabActualizarHora, 15000);

const CAB_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CAB_MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CAB_ANIO_ACTUAL = new Date().getFullYear();
const CAB_POR_PAGINA = 8;

let cabFiltrado = [];      // [{ opId, viajes[] }] tras los filtros
let cabVisibles = CAB_POR_PAGINA;
let cabPuertoModo = 'ambos'; // 'ambos' | 'origen' | 'destino'
let cabPuertosTodos = [];
let cabTemporizador = null;

function cabEsc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function cabTodosLosViajes() { return CABOTAJE_DATA.flatMap(op => op.viajes); }

function inicializarCabotajeMovil() {
  if (!obtenerUsuarioActual()) { window.location.href = 'login-movil.html'; return; }
  if (!esUsuarioAdministrativoMovil()) { window.location.href = 'operaciones-movil.html'; return; }

  const todos = cabTodosLosViajes();
  const anios = [...new Set(todos.flatMap(v => v.periodos.map(p => Number(p.slice(0, 4)))))].sort();
  const selAnio = document.getElementById('cabAnio');
  selAnio.innerHTML = '<option value="">Todos los años</option>' + anios.map(a => `<option value="${a}">${a}</option>`).join('');
  selAnio.value = anios.includes(CAB_ANIO_ACTUAL) ? CAB_ANIO_ACTUAL : (anios[anios.length - 1] || '');

  cabPoblarMeses();
  cabAplicar();
}

// Solo se pueden elegir meses con operaciones (en el año elegido, si hay uno).
function cabPoblarMeses() {
  const anio = document.getElementById('cabAnio').value;
  const sel = document.getElementById('cabMes');
  const actual = sel.value;
  const meses = new Set(cabTodosLosViajes().flatMap(v => v.periodos)
    .filter(p => !anio || p.startsWith(anio + '-')).map(p => Number(p.slice(5)) - 1));
  sel.innerHTML = '<option value="">Todos los meses</option>' + CAB_MESES.map((m, i) => meses.has(i) ? `<option value="${m}">${m}</option>` : '').join('');
  sel.value = meses.has(CAB_MESES.indexOf(actual)) ? actual : '';
}

function cabBuscarConRetardo() {
  clearTimeout(cabTemporizador);
  cabTemporizador = setTimeout(cabAplicar, 250);
}

function cabAnioPorDefecto() {
  const anios = [...new Set(cabTodosLosViajes().flatMap(v => v.periodos.map(p => Number(p.slice(0, 4)))))].sort();
  return String(anios.includes(CAB_ANIO_ACTUAL) ? CAB_ANIO_ACTUAL : (anios[anios.length - 1] || ''));
}

function cabAplicar() {
  cabPoblarMeses();
  const q = document.getElementById('cabBuscar').value.toLowerCase().trim();
  const mes = document.getElementById('cabMes').value;
  const anio = document.getElementById('cabAnio').value;
  const mesNum = mes ? String(CAB_MESES.indexOf(mes) + 1).padStart(2, '0') : '';

  cabFiltrado = CABOTAJE_DATA.map(op => ({
    opId: op.opId,
    viajes: op.viajes.filter(v => {
      const okQ = !q || [op.opId, v.cliente, v.per, v.viaje, v.buque, v.operacion, v.producto, v.ruta, v.terminalNombre, v.muelle, v.personal, v.estado]
        .some(s => String(s).toLowerCase().includes(q));
      const okP = (!mes && !anio) || v.periodos.some(p => (!anio || p.startsWith(anio + '-')) && (!mesNum || p.endsWith('-' + mesNum)));
      return okQ && okP;
    })
  })).filter(op => op.viajes.length > 0);

  cabVisibles = CAB_POR_PAGINA;
  cabRenderResumen();
  cabRenderGraficos();
  cabRenderLista();
}

function cabLimpiarFiltros() {
  document.getElementById('cabBuscar').value = '';
  document.getElementById('cabAnio').value = cabAnioPorDefecto();
  document.getElementById('cabMes').value = '';
  cabAplicar();
}

// Una operación = un viaje (una nominación compartida genera una fila por
// cliente pero sigue siendo un solo viaje): se toma una fila por operación.
function cabOperaciones() { return cabFiltrado.map(op => ({ ...op.viajes[0], opId: op.opId })); }

function cabTextoPeriodo() {
  const mes = document.getElementById('cabMes').value;
  const anio = document.getElementById('cabAnio').value;
  return mes || anio ? [mes, anio].filter(Boolean).join(' ') : 'Todos los periodos';
}

// ---------------------------------------------------------------- resumen
function cabRenderResumen() {
  const filas = cabFiltrado.flatMap(op => op.viajes);
  const ops = cabOperaciones();
  const kpi = (n, etiqueta, color, icono) => `<div class="cab-kpi" style="--c:${color}">
      <span class="cab-kpi-icono">${icono}</span>
      <strong>${n}</strong><span>${etiqueta}</span></div>`;
  const ic = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
  document.getElementById('cabKpis').innerHTML =
    kpi(new Set(filas.map(v => v.cliente).filter(c => c !== '—')).size, 'Clientes', '#2563EB', ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>')) +
    kpi(ops.length, 'Viajes', '#D97706', ic('<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>')) +
    kpi(ops.filter(v => v.compartido).length, 'Viajes compartidos', '#16A34A', ic('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>')) +
    kpi(new Set(ops.flatMap(v => v.puertos)).size, 'Puertos', '#F5C400', ic('<path d="m3 11 19-9-9 19-2-8-8-2z"/>'));
}

// ---------------------------------------------------------------- gráficos
function cabRenderGraficos() {
  const texto = cabTextoPeriodo();
  document.getElementById('cabClientesSub').textContent = texto;
  cabRenderTendencia();
  cabRenderPuertos();
  cabRenderClientes();
}

// Tendencia: con Mes → días de ese mes; solo Año → meses; sin Año → años.
function cabRenderTendencia() {
  const ops = cabOperaciones();
  const mes = document.getElementById('cabMes').value;
  const anioF = parseInt(document.getElementById('cabAnio').value) || 0;
  let labels, data, color, sub;

  if (mes) {
    const m = CAB_MESES.indexOf(mes);
    const anio = anioF || Math.max(...ops.flatMap(v => v.periodos.filter(p => Number(p.slice(5)) - 1 === m).map(p => Number(p.slice(0, 4)))), 0) || CAB_ANIO_ACTUAL;
    labels = Array.from({ length: new Date(anio, m + 1, 0).getDate() }, (_, i) => i + 1);
    data = labels.map(dia => {
      const d = new Date(anio, m, dia);
      const activas = ops.filter(v => d >= new Date(v.fechaInicio + 'T00:00:00') && d <= new Date(v.fechaFin + 'T00:00:00')).length;
      return activas || null;
    });
    color = '#00B4D8';
    sub = `${mes} ${anio} · operaciones activas por día`;
  } else if (anioF) {
    labels = CAB_MESES_CORTOS;
    data = CAB_MESES.map((_, i) => {
      const clave = `${anioF}-${String(i + 1).padStart(2, '0')}`;
      return ops.filter(v => v.periodos.includes(clave)).length || null;
    });
    color = '#F5C400';
    sub = `Año ${anioF} · operaciones por mes`;
  } else {
    const anios = [...new Set(ops.flatMap(v => v.periodos.map(p => p.slice(0, 4))))].sort();
    labels = anios;
    data = anios.map(a => ops.filter(v => v.periodos.some(p => p.startsWith(a + '-'))).length || null);
    color = '#F5C400';
    sub = 'Todos los años · operaciones por año';
  }
  document.getElementById('cabLineaSub').textContent = sub;
  document.getElementById('cabLinea').innerHTML = cabSvgLinea(labels, data, color);
}

// Línea suavizada con área degradada, ejes y puntos (SVG).
function cabSvgLinea(labels, data, color) {
  const W = 300, H = 160, pl = 24, pr = 8, pt = 10, pb = 22;
  const max = Math.max(1, ...data.map(v => v || 0));
  const paso = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : 10;
  const techo = Math.ceil(max / paso) * paso;
  const n = labels.length;
  const x = i => pl + (n === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1));
  const y = v => H - pb - (v / techo) * (H - pt - pb);
  const id = 'g' + Math.random().toString(36).slice(2, 7);

  let rejilla = '';
  for (let t = 0; t <= techo; t += paso) {
    rejilla += `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="#E5E7EB" stroke-width="1"/><text x="${pl - 5}" y="${y(t) + 3}" text-anchor="end" font-size="8" fill="#9CA3AF">${t}</text>`;
  }
  const cadaN = Math.ceil(n / 8);
  const etiquetas = labels.map((l, i) => i % cadaN === 0 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="8" fill="#9CA3AF">${l}</text>` : '').join('');

  const pts = data.map((v, i) => v == null ? null : { x: x(i), y: y(v), v, l: labels[i] }).filter(Boolean);
  let linea = '', area = '';
  if (pts.length) {
    linea = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2;
      linea += ` C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
    }
    area = `${linea} L${pts[pts.length - 1].x},${y(0)} L${pts[0].x},${y(0)} Z`;
  }
  const circulos = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="${n > 14 ? 2.5 : 3.5}" fill="#fff" stroke="${color}" stroke-width="2"><title>${p.l}: ${p.v} ${p.v === 1 ? 'operación' : 'operaciones'}</title></circle>`).join('');
  if (!pts.length) return '<p class="submodulo-tabla-vacio">Sin operaciones en este periodo.</p>';
  return `<svg viewBox="0 0 ${W} ${H}" class="cab-svg" role="img" aria-label="Tendencia de viajes">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".25"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${rejilla}<path d="${area}" fill="url(#${id})"/><path d="${linea}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>${circulos}${etiquetas}</svg>`;
}

// ---- Viajes por puerto: cada viaje cuenta una vez en su puerto de origen y
// una en el de destino (si hay y es otro). Tocar Origen/Destino deja solo esa
// serie; volver a tocarla muestra ambas. "Ver todos" lista todos los puertos.
function cabCalcularPuertos(viajes) {
  const conteo = {};
  const sumar = (puerto, campo) => {
    if (!puerto) return;
    conteo[puerto] = conteo[puerto] || { puerto, origen: 0, destino: 0 };
    conteo[puerto][campo]++;
  };
  viajes.forEach(v => { sumar(v.origen, 'origen'); if (v.destino && v.destino !== v.origen) sumar(v.destino, 'destino'); });
  return Object.values(conteo).map(p => ({ ...p, total: p.origen + p.destino }))
    .sort((a, b) => b.total - a.total || a.puerto.localeCompare(b.puerto));
}

function cabElegirModoPuerto(modo) {
  cabPuertoModo = cabPuertoModo === modo ? 'ambos' : modo;
  cabRenderPuertos();
}

function cabRenderPuertos() {
  cabPuertosTodos = cabCalcularPuertos(cabOperaciones());
  const clave = p => cabPuertoModo === 'ambos' ? p.total : p[cabPuertoModo];
  const top = cabPuertosTodos.filter(p => clave(p) > 0).sort((a, b) => clave(b) - clave(a) || a.puerto.localeCompare(b.puerto)).slice(0, 5);
  const max = Math.max(1, ...top.map(clave));

  document.querySelectorAll('#cabPuertoLeyenda .cab-leyenda-btn').forEach(b => {
    b.classList.toggle('activo', cabPuertoModo === b.dataset.modo);
    b.classList.toggle('apagado', cabPuertoModo !== 'ambos' && cabPuertoModo !== b.dataset.modo);
  });
  const que = cabPuertoModo === 'origen' ? 'solo origen' : cabPuertoModo === 'destino' ? 'solo destino' : 'origen y destino';
  document.getElementById('cabPuertoSub').textContent = `Top 5 · ${cabTextoPeriodo()} · ${que}`;

  document.getElementById('cabPuertos').innerHTML = top.length ? top.map(p => `
    <div class="cab-barra-fila" title="${cabEsc(p.puerto)}: ${p.origen} de origen, ${p.destino} de destino">
      <span class="cab-barra-etq">${cabEsc(p.puerto)}</span>
      <span class="cab-barra">
        ${cabPuertoModo !== 'destino' ? `<b style="width:${(p.origen / max * 100).toFixed(1)}%;background:#00B4D8"></b>` : ''}
        ${cabPuertoModo !== 'origen' ? `<b style="width:${(p.destino / max * 100).toFixed(1)}%;background:#1E3A5F"></b>` : ''}
      </span>
      <strong>${clave(p)}</strong>
    </div>`).join('') : '<p class="submodulo-tabla-vacio">Sin viajes en este periodo.</p>';

  if (document.getElementById('modalCabPuertos').classList.contains('open')) cabRenderModalPuertos();
}

// Todos los puertos del sistema (Mantenedor de Puertos) más los que usen los
// viajes; los que no tienen viajes salen en 0.
function cabPuertosDelSistema() {
  const porNombre = {};
  cabPuertosTodos.forEach(p => { porNombre[p.puerto] = p; });
  const catalogo = (typeof cargarPuertos === 'function' ? cargarPuertos() : []).map(p => p.nombre);
  const nombres = [...new Set([...catalogo, ...cabPuertosTodos.map(p => p.puerto)])];
  return nombres.map(n => porNombre[n] || { puerto: n, origen: 0, destino: 0, total: 0 })
    .sort((a, b) => b.total - a.total || nombres.indexOf(a.puerto) - nombres.indexOf(b.puerto));
}

function cabAbrirPuertos() { cabRenderModalPuertos(); abrirModal('modalCabPuertos'); }

function cabRenderModalPuertos() {
  const lista = cabPuertosDelSistema();
  const conViajes = lista.filter(p => p.total > 0);
  document.getElementById('cabPuertosModalSub').textContent = `${cabTextoPeriodo()} · ${lista.length} puerto${lista.length === 1 ? '' : 's'} registrados`;
  document.getElementById('cabPuertosResumen').innerHTML = [
    [lista.length, 'Puertos registrados'], [conViajes.length, 'Con viajes'], [lista.length - conViajes.length, 'Sin viajes']
  ].map(([n, t]) => `<div class="cab-pm-kpi"><strong>${n}</strong><span>${t}</span></div>`).join('');
  const max = Math.max(1, ...lista.map(p => p.total));
  document.getElementById('cabPuertosLista').innerHTML = lista.map((p, i) => `
    <div class="cab-pm-fila${p.total ? '' : ' sin'}">
      <div class="cab-pm-cab"><span><i>${i + 1}</i>${cabEsc(p.puerto)}</span><strong>${p.total}</strong></div>
      <span class="cab-barra"><b style="width:${(p.origen / max * 100).toFixed(1)}%;background:#00B4D8"></b><b style="width:${(p.destino / max * 100).toFixed(1)}%;background:#1E3A5F"></b></span>
      <small>${p.total ? `${p.origen} orig. · ${p.destino} dest.` : 'Sin viajes'}</small>
    </div>`).join('');
}

// ---- Top 5 clientes
function cabRenderClientes() {
  const conteo = {};
  cabFiltrado.flatMap(op => op.viajes).forEach(v => { conteo[v.cliente] = (conteo[v.cliente] || 0) + 1; });
  const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(1, ...top.map(t => t[1]));
  document.getElementById('cabClientes').innerHTML = top.length ? top.map(([c, n], i) => {
    const color = i === 0 ? '#F5C400' : i === 1 ? '#D4A900' : `rgba(245,196,0,${Math.max(0.35, 0.85 - i * 0.12)})`;
    return `<div class="cab-barra-fila">
      <span class="cab-barra-etq" title="${cabEsc(c)}">${cabEsc(c)}</span>
      <span class="cab-barra"><b style="width:${(n / max * 100).toFixed(1)}%;background:${color}"></b></span>
      <strong>${n}</strong></div>`;
  }).join('') : '<p class="submodulo-tabla-vacio">Sin viajes en este periodo.</p>';
}

// ---------------------------------------------------------------- listado
const CAB_BADGE_ESTADO = { 'Activo': 'badge-vigente', 'En Proceso': 'badge-por-vencer', 'Completado': 'badge-pagado', 'Reportado': 'badge-facturado', 'Cancelado': 'badge-cancelado' };

function cabBadgeEstado(e) { return `<span class="badge ${CAB_BADGE_ESTADO[e] || 'badge-gris'}"><span class="badge-dot"></span>${cabEsc(e)}</span>`; }

function cabRenderLista() {
  const cont = document.getElementById('cabLista');
  const total = cabFiltrado.length;
  document.getElementById('cabContador').textContent = `· ${total} ${total === 1 ? 'operación' : 'operaciones'}`;
  const btn = document.getElementById('cabVerMas');

  if (!total) {
    cont.innerHTML = '<p class="submodulo-tabla-vacio">Sin resultados para los filtros aplicados.</p>';
    btn.style.display = 'none';
    return;
  }
  cont.innerHTML = cabFiltrado.slice(0, cabVisibles).map(op => `
    <section class="cab-op">
      <div class="cab-op-cab"><span>N° Operación ${cabEsc(op.opId)}</span>${op.viajes.length > 1 ? `<em>Compartida · ${op.viajes.length} clientes</em>` : ''}</div>
      ${op.viajes.map((v, i) => cabHtmlViaje(op.opId, i, v)).join('')}
    </section>`).join('');

  const restantes = total - cabVisibles;
  btn.style.display = restantes > 0 ? '' : 'none';
  btn.textContent = `Ver más (${Math.min(CAB_POR_PAGINA, restantes)} de ${restantes} restantes)`;
}

function cabVerMas() { cabVisibles += CAB_POR_PAGINA; cabRenderLista(); }

function cabHtmlViaje(opId, i, v) {
  const id = `${opId}-${i}`;
  const dato = (etq, val, ancho) => `<div class="cab-dato${ancho ? ' cab-dato-ancho' : ''}"><span>${etq}</span><strong>${val}</strong></div>`;
  const terminalMuelle = [v.terminalNombre, v.muelle].filter(x => x && x !== '—').join(' · ');
  const act = v.cronograma;
  return `
    <div class="cab-viaje">
      <div class="cab-viaje-cab">
        <div class="cab-viaje-titulo"><strong>${cabEsc(v.cliente)}</strong><span>${cabEsc(v.operacion)} · ${cabEsc(v.buque)}</span></div>
        ${cabBadgeEstado(v.estado)}
      </div>
      <div class="cab-datos">
        ${dato('PER', cabEsc(v.per))}${dato('Viaje', cabEsc(v.viaje))}
        ${dato('Producto', cabEsc((v.productos || []).join(', ') || v.producto), true)}
        ${dato('Ubicación', `${cabEsc(v.ruta)}${terminalMuelle ? `<small>${cabEsc(terminalMuelle)}</small>` : ''}`, true)}
        ${dato('Personal asignado', cabEsc(v.personalLista.join(' · ') || v.personal), true)}
      </div>
      <button type="button" class="cab-crono-btn" onclick="cabToggleCronograma('${id}')" id="cabBtn-${id}">
        <span>Cronograma${act.length ? ` (${act.length})` : ''}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="cab-crono" id="cabCrono-${id}" style="display:none;">
        ${act.length ? act.map(x => `<div class="cab-crono-fila"><span>${cabEsc(x.label)}</span><strong>${cabEsc(x.valor)}</strong></div>`).join('')
          : '<p class="cab-crono-vacio">Esta operación todavía no tiene actividades registradas.</p>'}
      </div>
    </div>`;
}

function cabToggleCronograma(id) {
  const cont = document.getElementById(`cabCrono-${id}`);
  const btn = document.getElementById(`cabBtn-${id}`);
  const abrir = cont.style.display === 'none';
  cont.style.display = abrir ? '' : 'none';
  btn.classList.toggle('abierto', abrir);
}
