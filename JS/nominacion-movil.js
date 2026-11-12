// =================================================
// NOMINACION-MOVIL.JS
// Módulo "Dashboard de Nominación" de la app móvil — solo para usuarios
// Administrativos. Misma información que la página web (Inicio > Reporte de
// Nominación): resumen, nominaciones por periodo, distribución por estado,
// consumo por concepto, listado de nominaciones y, por cada una, su detalle
// (consumo por persona, operaciones, inspectores y aceptación enviada a cada
// cliente). Gráficos en HTML/SVG propio (sin librerías externas).
// =================================================
function nomActualizarHora() {
  const el = document.getElementById('horaStatusBar');
  if (!el) return;
  const a = new Date();
  const pad = n => String(n).padStart(2, '0');
  el.textContent = horaA12(`${pad(a.getHours())}:${pad(a.getMinutes())}`);
}
nomActualizarHora();
setInterval(nomActualizarHora, 15000);

const NOM_ESTADOS = ['Pendiente', 'Vigente', 'Finalizado', 'Reportado', 'Valorizado', 'Facturado', 'Pagado', 'Cancelado'];
const NOM_ESTADO_COLOR = {
  Pendiente: '#F5C400', Vigente: '#22C55E', Finalizado: '#00B4D8', Reportado: '#1D4ED8',
  Valorizado: '#7C3AED', Facturado: '#C2410C', Pagado: '#4338CA', Cancelado: '#9CA3AF'
};
const NOM_ESTADOS_OP = ['Activo', 'En Proceso', 'Completado', 'Reportado', 'Cancelado'];
const NOM_COLOR_ESTADO_OP = { 'Activo': '#00B4D8', 'En Proceso': '#F5C400', 'Completado': '#22C55E', 'Reportado': '#1D4ED8', 'Cancelado': '#9CA3AF' };
const NOM_COLOR_CONCEPTO = { alimentos: '#22C55E', movilidad: '#F59E0B', diasAbordo: '#00B4D8' };
const NOM_COLORES_PERSONAS = ['#1E3A5F', '#00B4D8', '#22C55E', '#F59E0B', '#8B5CF6', '#E53E3E'];
const NOM_MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const NOM_MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const NOM_POR_PAGINA = 8;

let nomRango = { desde: '', hasta: '', nombre: 'Todos los periodos' };
let nomPeriodoActualClave = '';
let nomFiltrado = [];
let nomVisibles = NOM_POR_PAGINA;
let nomTemporizador = null;
let nomFiltros = { operaciones: '', aceptacion: '' };   // los que activan las tarjetas del resumen

const nomEsc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nomRedondeo = v => Math.round(v * 100) / 100;
const nomSoles = v => {
  const n = nomRedondeo(v);
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
};
const nomPlural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const nomEnRango = iso => !!iso && (!nomRango.desde || iso >= nomRango.desde) && (!nomRango.hasta || iso <= nomRango.hasta);

function nomFechaDDMMYYYY(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------- periodos
// Periodos de Gastos (del 10 al 09), como en la web; por defecto el actual.
function nomISO(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function nomPeriodoDe(iso) {
  let [y, m, d] = iso.split('-').map(Number);
  if (d < 10) { m -= 1; if (m === 0) { m = 12; y -= 1; } }
  const fin = new Date(y, m, 9);                      // día 9 del mes siguiente
  const ini = new Date(y, m - 1, 10);
  return { clave: `${y}-${String(m).padStart(2, '0')}`, nombre: `Período ${NOM_MESES_LARGO[m - 1]} ${y}`, desde: nomISO(ini), hasta: nomISO(fin) };
}

function nomPeriodos() {
  const fechas = NOM_DATA.flatMap(n => [n.inicioISO, ...n.lineas.map(l => l.fechaISO), ...n.operaciones.map(o => o.fechaInicio)]).filter(Boolean).sort();
  const actual = nomPeriodoDe(nomISO(new Date()));
  const lista = [actual];
  if (fechas.length) {
    let p = actual;
    const primero = nomPeriodoDe(fechas[0]);
    while (p.desde > primero.desde) { p = nomPeriodoDe(nomISO(new Date(new Date(p.desde + 'T00:00:00').getTime() - 86400000))); lista.push(p); }
  }
  return { lista, actual };
}

function nomRangoSeleccionado() {
  const clave = document.getElementById('nomPeriodo').value;
  const p = nomPeriodos().lista.find(x => x.clave === clave);
  return p ? { desde: p.desde, hasta: p.hasta, nombre: p.nombre } : { desde: '', hasta: '', nombre: 'Todos los periodos' };
}

// ---------------------------------------------------------------- reglas (igual que la web)
function nomOpsEnPeriodo(n) {
  if (!nomRango.desde) return n.operaciones;
  return n.operaciones.filter(o => (o.fechaInicio || '') <= nomRango.hasta && (o.fechaFinReal || o.fechaFin || o.fechaInicio || '') >= nomRango.desde);
}

// Consumo de una nominación dentro del periodo elegido, con el detalle por persona.
function nomConsumo(n) {
  const lineas = n.lineas.filter(l => nomEnRango(l.fechaISO));
  const suma = (ls, tipo) => nomRedondeo(ls.filter(l => l.tipo === tipo).reduce((s, l) => s + l.monto, 0));
  const porTrabajador = n.personas.map(nombre => {
    const ls = lineas.filter(l => l.trabajador === nombre);
    const u = typeof USUARIOS_DEMO !== 'undefined' ? USUARIOS_DEMO.find(x => `${x.nombre} ${x.apellido}` === nombre) : null;
    const alimentos = suma(ls, 'Alimentos'), movilidad = suma(ls, 'Movilidad'), diasAbordo = suma(ls, 'Días a Bordo');
    return {
      nombre, asignado: n.asignados.includes(nombre),
      area: ls.length ? ls[0].area : 'Operaciones', codigo: u ? u.usuario : '—',
      alimentos, movilidad, diasAbordo,
      diasCount: ls.filter(l => l.tipo === 'Días a Bordo' && l.monto > 0).length,
      total: nomRedondeo(alimentos + movilidad + diasAbordo)
    };
  });
  const alimentos = suma(lineas, 'Alimentos'), movilidad = suma(lineas, 'Movilidad'), diasAbordo = suma(lineas, 'Días a Bordo');
  return {
    lineas, porTrabajador, alimentos, movilidad, diasAbordo,
    total: nomRedondeo(alimentos + movilidad + diasAbordo),
    conteo: {
      'Alimentos': lineas.filter(l => l.tipo === 'Alimentos').length,
      'Movilidad': lineas.filter(l => l.tipo === 'Movilidad').length,
      'Días a Bordo': lineas.filter(l => l.tipo === 'Días a Bordo' && l.monto > 0).length
    }
  };
}

// Una nominación entra en el periodo si su rango, alguna operación o algún gasto suyo caen en él.
function nomEnPeriodo(n) {
  if (!nomRango.desde) return true;
  const cruza = (a, b) => (!a || a <= nomRango.hasta) && (!b || b >= nomRango.desde);
  return cruza(n.inicioISO, n.finISO)
    || n.operaciones.some(o => cruza(o.fechaInicio, o.fechaFinReal || o.fechaFin || o.fechaInicio))
    || n.lineas.some(l => nomEnRango(l.fechaISO));
}

function nomFiltrar(omitirEstado = false) {
  nomRango = nomRangoSeleccionado();
  const estado = document.getElementById('nomEstado').value;
  const q = document.getElementById('nomBuscar').value.toLowerCase().trim();
  return NOM_DATA.filter(n => {
    if (estado && !omitirEstado && n.estado !== estado) return false;
    if (nomFiltros.operaciones === 'sin' && nomOpsEnPeriodo(n).length) return false;
    if (nomFiltros.aceptacion === 'pendiente' && !n.aceptaciones.some(a => !a.enviada)) return false;
    if (q && ![n.id, n.per, n.cliente, n.supervisor, n.buque, n.viaje, n.locacion].some(t => String(t).toLowerCase().includes(q))) return false;
    return nomEnPeriodo(n);
  });
}

// ---------------------------------------------------------------- inicio / filtros
function inicializarNominacionMovil() {
  if (!obtenerUsuarioActual()) { window.location.href = 'login-movil.html'; return; }
  if (!esUsuarioAdministrativoMovil()) { window.location.href = 'operaciones-movil.html'; return; }

  document.getElementById('nomEstado').innerHTML = '<option value="">Todos</option>' + NOM_ESTADOS.map(e => `<option value="${e}">${e}</option>`).join('');
  const { lista, actual } = nomPeriodos();
  document.getElementById('nomPeriodo').innerHTML = '<option value="">Todos los periodos</option>' +
    lista.map(p => `<option value="${p.clave}">${p.nombre}${p.clave === actual.clave ? ' (actual)' : ''}</option>`).join('');
  nomPeriodoActualClave = actual.clave;
  document.getElementById('nomPeriodo').value = actual.clave;
  nomAplicar();
}

function nomBuscarConRetardo() {
  clearTimeout(nomTemporizador);
  nomTemporizador = setTimeout(nomAplicar, 250);
}

function nomAplicar() {
  nomFiltrado = nomFiltrar();
  nomVisibles = NOM_POR_PAGINA;
  nomRenderKpis();
  nomRenderPeriodo();
  nomRenderDonut();
  nomRenderConsumo();
  nomRenderLista();
}

function nomLimpiarFiltros() {
  document.getElementById('nomBuscar').value = '';
  document.getElementById('nomEstado').value = '';
  nomFiltros = { operaciones: '', aceptacion: '' };
  document.getElementById('nomPeriodo').value = nomPeriodoActualClave;
  nomAplicar();
}

function nomAlternarFiltro(clave, valor) {
  nomFiltros[clave] = nomFiltros[clave] === valor ? '' : valor;
  nomAplicar();
}

function nomFiltrarPorEstado(estado) {
  const sel = document.getElementById('nomEstado');
  sel.value = sel.value === estado ? '' : estado;
  nomAplicar();
}

function nomVerTodosLosPeriodos() {
  document.getElementById('nomPeriodo').value = '';
  nomAplicar();
}

// ---------------------------------------------------------------- resumen
function nomRenderKpis() {
  const total = nomFiltrado.length;
  const consumos = nomFiltrado.map(nomConsumo);
  const consumo = nomRedondeo(consumos.reduce((s, c) => s + c.total, 0));
  const viajes = nomFiltrado.reduce((s, n) => s + nomOpsEnPeriodo(n).length, 0);
  const clientes = new Set(nomFiltrado.flatMap(n => n.clientes)).size;
  const conConsumo = consumos.filter(c => c.total > 0).length;
  const sinOps = nomFiltrado.filter(n => !nomOpsEnPeriodo(n).length).length;
  const aceptaciones = nomFiltrado.flatMap(n => n.aceptaciones);
  const porEnviar = aceptaciones.filter(a => !a.enviada).length;
  const conAceptPend = nomFiltrado.filter(n => n.aceptaciones.some(a => !a.enviada)).length;

  const ic = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
  const kpi = ({ etiqueta, valor, sub, color, icono, clic, sel, ancho }) => `
    <${clic ? `button type="button" onclick="${clic}"` : 'div'} class="nom-kpi${clic ? ' clic' : ''}${sel ? ' sel' : ''}${ancho ? ' ancho' : ''}" style="--c:${color}">
      <span class="nom-kpi-icono">${icono}</span>
      <span class="nom-kpi-etq">${etiqueta}</span>
      <strong>${valor}</strong>
      <small>${sub}</small>
    </${clic ? 'button' : 'div'}>`;

  document.getElementById('nomKpis').innerHTML =
    kpi({ etiqueta: 'Total nominaciones', valor: total, color: '#4338CA', icono: ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>'),
      sub: total === NOM_DATA.length ? `${nomPlural(clientes, 'cliente', 'clientes')} · ${nomPlural(viajes, 'operación', 'operaciones')}` : `de ${NOM_DATA.length} · ${nomPlural(viajes, 'operación', 'operaciones')}` }) +
    kpi({ etiqueta: 'Sin operaciones', valor: sinOps, color: '#D97706', icono: ic('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
      sub: `de ${nomPlural(total, 'nominación', 'nominaciones')}`, clic: "nomAlternarFiltro('operaciones','sin')", sel: nomFiltros.operaciones === 'sin' }) +
    kpi({ etiqueta: 'Aceptación por enviar', valor: conAceptPend, color: '#0891B2', icono: ic('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'),
      sub: `${porEnviar} de ${nomPlural(aceptaciones.length, 'aceptación', 'aceptaciones')} sin enviar`, clic: "nomAlternarFiltro('aceptacion','pendiente')", sel: nomFiltros.aceptacion === 'pendiente' }) +
    kpi({ etiqueta: 'Consumo total', valor: nomSoles(consumo), color: '#7C3AED', icono: ic('<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 6v2m0 8v2"/>'),
      sub: `${nomPlural(conConsumo, 'nominación', 'nominaciones')} con gastos · ${nomRango.nombre}` });
}

// ---------------------------------------------------------------- gráficos (SVG / HTML)
// Nominaciones por mes de inicio (por año si abarcan más de 24 meses), apiladas por estado.
function nomRenderPeriodo() {
  const datos = nomFiltrado.filter(n => n.inicioISO);
  const cont = document.getElementById('nomGrafPeriodo');
  const sub = document.getElementById('nomPeriodoSub');
  if (!datos.length) { sub.textContent = 'Sin nominaciones con los filtros aplicados'; cont.innerHTML = '<p class="submodulo-tabla-vacio">Sin datos.</p>'; return; }

  const meses = datos.map(n => n.inicioISO.slice(0, 7)).sort();
  const [y0, m0] = meses[0].split('-').map(Number);
  const [y1, m1] = meses[meses.length - 1].split('-').map(Number);
  const totalMeses = (y1 - y0) * 12 + (m1 - m0) + 1;
  const porAnio = totalMeses > 24, anioUnico = y0 === y1;
  const claves = [];
  if (porAnio) for (let y = y0; y <= y1; y++) claves.push(String(y));
  else for (let i = 0; i < totalMeses; i++) {
    const y = y0 + Math.floor((m0 - 1 + i) / 12), m = (m0 - 1 + i) % 12 + 1;
    claves.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  const claveDe = n => porAnio ? n.inicioISO.slice(0, 4) : n.inicioISO.slice(0, 7);
  const etiqueta = k => porAnio ? k : `${NOM_MESES[Number(k.slice(5)) - 1]}${anioUnico ? '' : ' ' + k.slice(2, 4)}`;
  sub.textContent = `${datos.length} nominaciones por ${porAnio ? 'año' : 'mes'} de inicio, por estado`;

  const estados = NOM_ESTADOS.filter(e => datos.some(n => n.estado === e));
  const cuentas = claves.map(k => estados.map(e => datos.filter(n => n.estado === e && claveDe(n) === k).length));
  const max = Math.max(1, ...cuentas.map(c => c.reduce((a, b) => a + b, 0)));
  const paso = max <= 5 ? 1 : max <= 10 ? 2 : 5;
  const techo = Math.ceil(max / paso) * paso;

  const W = 300, H = 150, pl = 22, pr = 6, pt = 8, pb = 20;
  const ancho = (W - pl - pr) / claves.length;
  const bw = Math.min(26, ancho * 0.62);
  const y = v => H - pb - (v / techo) * (H - pt - pb);
  let rejilla = '';
  for (let t = 0; t <= techo; t += paso) rejilla += `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="#E5E7EB"/><text x="${pl - 5}" y="${y(t) + 3}" text-anchor="end" font-size="8" fill="#9CA3AF">${t}</text>`;
  const cadaN = Math.ceil(claves.length / 9);
  const barras = claves.map((k, i) => {
    const x0 = pl + i * ancho + (ancho - bw) / 2;
    let acum = 0;
    const segs = estados.map((e, j) => {
      const v = cuentas[i][j];
      if (!v) return '';
      const top = y(acum + v), h = y(acum) - top;
      acum += v;
      return `<rect x="${x0}" y="${top}" width="${bw}" height="${h}" fill="${NOM_ESTADO_COLOR[e]}"><title>${e}: ${v}</title></rect>`;
    }).join('');
    const et = i % cadaN === 0 ? `<text x="${x0 + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="8" fill="#9CA3AF">${etiqueta(k)}</text>` : '';
    return segs + et;
  }).join('');
  const leyenda = estados.map(e => `<span><i style="background:${NOM_ESTADO_COLOR[e]}"></i>${e}</span>`).join('');
  cont.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="cab-svg" role="img" aria-label="Nominaciones por periodo">${rejilla}${barras}</svg><div class="nom-ley-linea">${leyenda}</div>`;
}

// Donut SVG genérico: valores, colores y texto del centro.
function nomSvgDonut(valores, colores, centro, sub, activo) {
  const total = valores.reduce((a, b) => a + b, 0);
  const r = 44, c = 2 * Math.PI * r;
  let desfase = 0;
  const arcos = total ? valores.map((v, i) => {
    if (!v) return '';
    const largo = v / total * c;
    const op = activo == null || activo === i ? 1 : 0.25;
    const s = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${colores[i]}" stroke-width="14" stroke-dasharray="${largo} ${c - largo}" stroke-dashoffset="${-desfase}" opacity="${op}" transform="rotate(-90 60 60)"/>`;
    desfase += largo;
    return s;
  }).join('') : `<circle cx="60" cy="60" r="${r}" fill="none" stroke="#E5E7EB" stroke-width="14"/>`;
  return `<svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#F3F4F6" stroke-width="14"/>${arcos}
    <text x="60" y="60" text-anchor="middle" font-size="19" font-weight="800" fill="#111">${centro}</text>
    <text x="60" y="75" text-anchor="middle" font-size="8" fill="#6B7280">${sub}</text></svg>`;
}

function nomRenderDonut() {
  const base = nomFiltrar(true);   // ignora el filtro de estado: la leyenda filtra
  const elegido = document.getElementById('nomEstado').value;
  const valores = NOM_ESTADOS.map(e => base.filter(n => n.estado === e).length);
  const idx = elegido ? NOM_ESTADOS.indexOf(elegido) : null;
  document.getElementById('nomDonut').innerHTML = nomSvgDonut(valores, NOM_ESTADOS.map(e => NOM_ESTADO_COLOR[e]), base.length, 'total', idx);
  document.getElementById('nomDonutLeyenda').innerHTML = NOM_ESTADOS.map((e, i) => {
    if (!valores[i] && elegido !== e) return '';
    const pct = base.length ? Math.round(valores[i] / base.length * 100) : 0;
    return `<button type="button" class="nom-ley-fila${elegido === e ? ' sel' : ''}" onclick="nomFiltrarPorEstado('${e}')" title="Filtrar por ${e}">
      <span><i style="background:${NOM_ESTADO_COLOR[e]}"></i>${e}</span><b>${valores[i]}</b><em>${pct}%</em></button>`;
  }).join('') || '<span class="nom-vacio-txt">Sin nominaciones.</span>';
}

function nomRenderConsumo() {
  const consumos = nomFiltrado.map(nomConsumo);
  const suma = campo => nomRedondeo(consumos.reduce((s, c) => s + c[campo], 0));
  const cuenta = tipo => consumos.reduce((s, c) => s + c.conteo[tipo], 0);
  const filas = [
    { label: 'Alimentos', monto: suma('alimentos'), n: cuenta('Alimentos'), unidad: ['comida', 'comidas'], color: NOM_COLOR_CONCEPTO.alimentos },
    { label: 'Movilidad', monto: suma('movilidad'), n: cuenta('Movilidad'), unidad: ['traslado', 'traslados'], color: NOM_COLOR_CONCEPTO.movilidad },
    { label: 'Días a bordo', monto: suma('diasAbordo'), n: cuenta('Días a Bordo'), unidad: ['día', 'días'], color: NOM_COLOR_CONCEPTO.diasAbordo }
  ];
  const total = filas.reduce((s, f) => s + f.monto, 0);
  filas.forEach(f => { f.pct = total ? Math.round(f.monto / total * 100) : 0; });
  document.getElementById('nomConsumoSub').textContent = total
    ? `100 % = ${nomSoles(total)} · Alimentos + Movilidad + Días a bordo`
    : 'Sin gastos registrados en el periodo elegido';
  const max = Math.max(1, ...filas.map(f => f.monto));
  document.getElementById('nomConsumoConceptos').innerHTML = filas.map(f => `
    <div class="nom-concepto">
      <div class="nom-concepto-cab"><span>${f.label}<small>${f.n} ${f.n === 1 ? f.unidad[0] : f.unidad[1]}</small></span><strong>${nomSoles(f.monto)} · ${f.pct}%</strong></div>
      <span class="cab-barra"><b style="width:${(f.monto / max * 100).toFixed(1)}%;background:${f.color}"></b></span>
    </div>`).join('');
}

// ---------------------------------------------------------------- listado
function nomBadgeEstado(e) {
  const c = NOM_ESTADO_COLOR[e] || '#9CA3AF';
  return `<span class="nom-badge" style="--c:${c}"><i></i>${nomEsc(e)}</span>`;
}

function nomRenderLista() {
  const cont = document.getElementById('nomLista');
  const total = nomFiltrado.length;
  document.getElementById('nomContador').textContent = `· ${total} ${total === 1 ? 'nominación' : 'nominaciones'}`;
  const btn = document.getElementById('nomVerMas');

  if (!total) {
    cont.innerHTML = `<p class="submodulo-tabla-vacio">Sin nominaciones para los filtros aplicados${nomRango.desde ? ` en el ${nomEsc(nomRango.nombre)}` : ''}.</p>
      ${nomRango.desde ? '<button type="button" class="btn-accion btn-cancelar" style="width:100%;justify-content:center;margin-top:4px;" onclick="nomVerTodosLosPeriodos()">Ver todos los periodos</button>' : ''}`;
    btn.style.display = 'none';
    return;
  }
  cont.innerHTML = nomFiltrado.slice(0, nomVisibles).map(n => {
    const ops = nomOpsEnPeriodo(n);
    const opsTxt = !ops.length
      ? (n.operaciones.length ? `0 de ${n.operaciones.length}` : 'Sin operaciones')
      : (nomRango.desde && ops.length !== n.operaciones.length ? `${nomPlural(ops.length, 'operación', 'operaciones')} de ${n.operaciones.length}` : nomPlural(ops.length, 'operación', 'operaciones'));
    const c = nomConsumo(n);
    const dato = (etq, val, ancho) => `<div class="cab-dato${ancho ? ' cab-dato-ancho' : ''}"><span>${etq}</span><strong>${val}</strong></div>`;
    return `
      <section class="cab-op nom-item">
        <div class="cab-op-cab"><span>${nomEsc(n.id)} · ${nomEsc(n.per)}</span>${nomBadgeEstado(n.estado)}</div>
        <div class="cab-viaje">
          <div class="cab-datos">
            ${dato('Cliente', nomEsc(n.clientes.join(' / ') || '—'), true)}
            ${dato('Buque', nomEsc(n.buque))}${dato('Operaciones', nomEsc(opsTxt))}
            ${dato('Locación', nomEsc(n.locacion), true)}
            ${dato('Supervisor', nomEsc(n.supervisor))}${dato('Vigencia', `${nomEsc(n.inicio)}<small>al ${nomEsc(n.fin)}</small>`)}
            ${dato('Consumo', nomSoles(c.total), true)}
          </div>
          <button type="button" class="cab-crono-btn nom-btn-detalle" onclick="nomAbrirDetalle('${n.id}')"><span>Ver detalle</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 18 6-6-6-6"/></svg></button>
        </div>
      </section>`;
  }).join('');
  const restantes = total - nomVisibles;
  btn.style.display = restantes > 0 ? '' : 'none';
  btn.textContent = `Ver más (${Math.min(NOM_POR_PAGINA, restantes)} de ${restantes} restantes)`;
}

function nomVerMas() { nomVisibles += NOM_POR_PAGINA; nomRenderLista(); }

// ---------------------------------------------------------------- detalle
function nomAbrirDetalle(id) {
  const n = NOM_DATA.find(x => x.id === id);
  if (!n) return;
  document.getElementById('nomMain').style.display = 'none';
  document.getElementById('nomDetalle').style.display = '';
  document.getElementById('nomTituloHeader').textContent = n.id;
  document.getElementById('nomDetTitulo').textContent = n.id;
  document.getElementById('nomDetSub').textContent = `${n.clientePrincipal} · ${n.locacion}`;
  document.getElementById('nomDetEstado').innerHTML = nomBadgeEstado(n.estado);

  const c = nomConsumo(n);
  const opsPeriodo = nomOpsEnPeriodo(n);
  const opsLoc = opsPeriodo.length ? opsPeriodo : n.operaciones;
  const unicos = v => [...new Set(v.filter(x => x && x !== '—'))];
  const puertos = unicos(opsLoc.flatMap(o => [o.terminalInicial, o.terminalDestino]));
  const terminales = unicos(opsLoc.map(o => o.terminal)).length ? unicos(opsLoc.map(o => o.terminal)) : unicos([n.locacion]);
  const muelles = unicos(opsLoc.map(o => o.muelle));
  const info = [
    ['Cliente principal', n.clientePrincipal, n.clientes.length > 1 ? 'Nominación compartida' : 'Cliente único'],
    ['Locación', puertos.length ? `${puertos.length > 1 ? 'Puertos' : 'Puerto'} ${puertos.join(', ')}` : 'Sin puerto registrado', `${terminales.join(', ') || '—'}${muelles.length ? ' / ' + muelles.join(', ') : ''}`],
    ['Supervisor / Vigencia', n.supervisor, `${n.inicio} — ${n.fin}`],
    ['Consumo generado', nomSoles(c.total), `${nomPlural(opsPeriodo.length, 'operación', 'operaciones')} en ${nomRango.desde ? 'el ' + nomRango.nombre : 'todos los periodos'}`]
  ];
  document.getElementById('nomDetInfo').innerHTML = info.map(([e, v, s]) => `<div class="nom-info"><span>${e}</span><strong>${nomEsc(v)}</strong><small>${nomEsc(s)}</small></div>`).join('');

  nomDetGraficos(n, c, opsPeriodo);
  nomDetOperaciones(n, opsPeriodo);
  nomDetInspectores(c);
  nomDetAceptacion(n);
  document.querySelector('.movil-contenido').scrollTop = 0;
}

function nomCerrarDetalle() {
  document.getElementById('nomDetalle').style.display = 'none';
  document.getElementById('nomMain').style.display = '';
  document.getElementById('nomTituloHeader').textContent = 'Dashboard de Nominación';
  document.querySelector('.movil-contenido').scrollTop = 0;
}

function nomDetGraficos(n, c, opsPeriodo) {
  const personas = c.porTrabajador;

  // Costo por persona
  const conCosto = personas.filter(t => t.total > 0);
  const costos = conCosto.map(t => t.total);
  document.getElementById('nomDetCostoSub').textContent = nomRango.desde ? nomRango.nombre : 'Todos los periodos';
  document.getElementById('nomDetDonutCosto').innerHTML = nomSvgDonut(costos, NOM_COLORES_PERSONAS.slice(0, costos.length), nomSoles(c.total).replace('S/ ', 'S/'), 'consumo');
  document.getElementById('nomDetLeyCosto').innerHTML = conCosto.length ? conCosto.map((t, i) => {
    const pct = c.total ? Math.round(t.total / c.total * 100) : 0;
    return `<div class="nom-ley-fila est"><span><i style="background:${NOM_COLORES_PERSONAS[i]}"></i>${nomEsc(t.nombre.split(' ')[0])}</span><b>${nomSoles(t.total)}</b><em>${pct}%</em></div>`;
  }).join('') : '<span class="nom-vacio-txt">Sin gastos registrados en este periodo.</span>';

  // Estado de las operaciones
  const estadosOp = NOM_ESTADOS_OP.map(e => [e, opsPeriodo.filter(o => o.estado === e).length]).filter(([, k]) => k);
  document.getElementById('nomDetOpsSub').textContent = nomRango.desde ? `${opsPeriodo.length} de ${n.operaciones.length} en el ${nomRango.nombre}` : 'Todas las operaciones de la nominación';
  document.getElementById('nomDetDonutOps').innerHTML = nomSvgDonut(estadosOp.map(x => x[1]), estadosOp.map(([e]) => NOM_COLOR_ESTADO_OP[e]), opsPeriodo.length, 'operaciones');
  document.getElementById('nomDetLeyOps').innerHTML = estadosOp.length ? estadosOp.map(([e, k]) =>
    `<div class="nom-ley-fila est"><span><i style="background:${NOM_COLOR_ESTADO_OP[e]}"></i>${e}</span><b>${k}</b><em>${Math.round(k / opsPeriodo.length * 100)}%</em></div>`).join('')
    : '<span class="nom-vacio-txt">Sin operaciones en este periodo.</span>';

  // Conceptos por persona (barras apiladas)
  const max = Math.max(1, ...personas.map(t => t.total));
  document.getElementById('nomDetConceptos').innerHTML = personas.length ? personas.map(t => `
    <div class="cab-barra-fila nom-barra-persona">
      <span class="cab-barra-etq" title="${nomEsc(t.nombre)}">${nomEsc(t.nombre)}</span>
      <span class="cab-barra">
        <b style="width:${(t.alimentos / max * 100).toFixed(1)}%;background:${NOM_COLOR_CONCEPTO.alimentos}"></b>
        <b style="width:${(t.movilidad / max * 100).toFixed(1)}%;background:${NOM_COLOR_CONCEPTO.movilidad}"></b>
        <b style="width:${(t.diasAbordo / max * 100).toFixed(1)}%;background:${NOM_COLOR_CONCEPTO.diasAbordo}"></b>
      </span>
      <strong>${nomSoles(t.total)}</strong>
    </div>`).join('') + `<div class="nom-ley-linea">
      <span><i style="background:${NOM_COLOR_CONCEPTO.alimentos}"></i>Alimentos</span><span><i style="background:${NOM_COLOR_CONCEPTO.movilidad}"></i>Movilidad</span><span><i style="background:${NOM_COLOR_CONCEPTO.diasAbordo}"></i>Días a bordo</span></div>`
    : '<p class="submodulo-tabla-vacio">Sin personas asignadas.</p>';
}

function nomDetOperaciones(n, ops) {
  document.getElementById('nomDetOpsTitulo').textContent = nomRango.desde
    ? `Operaciones · ${ops.length} de ${n.operaciones.length} en el ${nomRango.nombre}` : `Operaciones · ${ops.length}`;
  const cont = document.getElementById('nomDetOps');
  if (!ops.length) {
    cont.innerHTML = `<p class="submodulo-tabla-vacio">${n.operaciones.length ? `Esta nominación tiene ${nomPlural(n.operaciones.length, 'operación', 'operaciones')}, ninguna en el ${nomEsc(nomRango.nombre)}.` : 'Esta nominación todavía no tiene operaciones registradas.'}</p>`;
    return;
  }
  const dato = (etq, val, ancho) => `<div class="cab-dato${ancho ? ' cab-dato-ancho' : ''}"><span>${etq}</span><strong>${val}</strong></div>`;
  const badge = e => { const c = { 'Activo': '#00B4D8', 'En Proceso': '#F5C400', 'Completado': '#22C55E', 'Reportado': '#1D4ED8', 'Cancelado': '#9CA3AF' }[e] || '#9CA3AF'; return `<span class="nom-badge" style="--c:${c}"><i></i>${nomEsc(e || '—')}</span>`; };
  cont.innerHTML = ops.map(op => {
    const personal = (op.personal || []).map(p => p.rol && p.rol !== 'Inspector' ? `${p.nombre} (${p.rol})` : p.nombre).join(' · ') || 'Sin personal asignado';
    return `<section class="cab-op">
      <div class="cab-op-cab"><span>${nomEsc(op.id)} · ${nomEsc(op.tipoOperacion || '—')}</span>${badge(op.estado)}</div>
      <div class="cab-viaje"><div class="cab-datos">
        ${dato('Viaje', nomEsc(op.nroViaje || '—'))}${dato('Buque', nomEsc(op.buque || '—'))}
        ${dato('Fecha inicio', nomFechaDDMMYYYY(op.fechaInicio))}${dato('Fecha fin', nomFechaDDMMYYYY(op.fechaFinReal || op.fechaFin))}
        ${dato('Puerto', `${nomEsc(op.terminalInicial || '—')}${op.terminalDestino ? ' → ' + nomEsc(op.terminalDestino) : ''}`, true)}
        ${dato('Supervisor', nomEsc(op.supervisor || 'Sin supervisor'), true)}
        ${dato('Personal', nomEsc(personal), true)}
      </div></div></section>`;
  }).join('');
}

function nomDetInspectores(c) {
  document.getElementById('nomDetInspTitulo').textContent = `Inspectores · Gastos ${nomRango.desde ? 'del ' + nomRango.nombre : 'de todos los periodos'}`;
  const cont = document.getElementById('nomDetInsp');
  if (!c.porTrabajador.length) { cont.innerHTML = '<p class="submodulo-tabla-vacio">Esta nominación no tiene inspectores asignados ni gastos registrados.</p>'; return; }
  const fila = (etq, val, color, total) => `<div class="nom-monto${total ? ' total' : ''}"><span>${color ? `<i style="background:${color}"></i>` : ''}${etq}</span><strong>${val}</strong></div>`;
  cont.innerHTML = c.porTrabajador.map(t => `
    <div class="nom-insp">
      <div class="nom-insp-cab">
        <span class="nom-insp-av">${nomEsc(t.nombre.split(' ').map(w => w[0]).join('').slice(0, 2))}</span>
        <div><strong>${nomEsc(t.nombre)}</strong><small>${nomEsc(t.area)} · ${nomEsc(t.codigo)}</small></div>
      </div>
      ${fila('Alimentos', nomSoles(t.alimentos), NOM_COLOR_CONCEPTO.alimentos)}
      ${fila('Movilidad', nomSoles(t.movilidad), NOM_COLOR_CONCEPTO.movilidad)}
      ${fila(`Días a bordo${t.diasCount ? ` (${t.diasCount})` : ''}`, nomSoles(t.diasAbordo), NOM_COLOR_CONCEPTO.diasAbordo)}
      ${fila('Total', nomSoles(t.total), '', true)}
    </div>`).join('');
}

// ---- Aceptación enviada a cada cliente (una pestaña por cliente si es compartida)
let nomAceptActiva = 0;
let nomAceptDe = null;

function nomDetAceptacion(n) {
  nomAceptDe = n;
  const titulo = document.getElementById('nomDetAceptTitulo');
  if (!n.aceptaciones.length) { titulo.textContent = 'Aceptación'; document.getElementById('nomDetAcept').innerHTML = '<p class="submodulo-tabla-vacio">La nominación no tiene clientes asociados.</p>'; return; }
  const total = n.aceptaciones.length, enviadas = n.aceptaciones.filter(a => a.enviada).length;
  titulo.textContent = total > 1 ? `Aceptaciones · ${enviadas} de ${total} clientes la recibieron` : (enviadas ? 'Aceptación enviada' : 'Aceptación · Pendiente de envío');
  nomAceptActiva = Math.max(0, n.aceptaciones.findIndex(a => a.enviada));
  nomRenderAceptacion();
}

function nomElegirAceptacion(i) { nomAceptActiva = i; nomRenderAceptacion(); }

function nomFechaEnvio(a) { return a.fecha ? nomFechaDDMMYYYY(a.fecha.slice(0, 10)) : '—'; }

function nomParseContacto(txt) {
  const t = String(txt).trim();
  const m = t.match(/^(.*?)\s*\(([^()]+@[^()]+)\)\s*$/);
  if (m) return { nombre: m[1].trim(), correo: m[2].trim() };
  return t.includes('@') ? { nombre: '', correo: t } : { nombre: t, correo: '' };
}

function nomListaCorreos(titulo, lista) {
  if (!lista || !lista.length) return '';
  const correos = lista.map(c => { const p = nomParseContacto(c); return p.correo ? `<a href="mailto:${nomEsc(p.correo)}">${nomEsc(p.correo)}</a>` : `<span>${nomEsc(p.nombre)}</span>`; }).join(', ');
  return `<div class="nom-acep-grupo"><span>${titulo} <b>${lista.length}</b></span><p>${correos}</p></div>`;
}

function nomRenderAceptacion() {
  const n = nomAceptDe;
  const cont = document.getElementById('nomDetAcept');
  const tabs = n.aceptaciones.length > 1 ? `<div class="nom-acep-tabs">${n.aceptaciones.map((a, i) => `
    <button type="button" class="nom-acep-tab${i === nomAceptActiva ? ' activa' : ''}" onclick="nomElegirAceptacion(${i})">
      <strong>${nomEsc(a.cliente)}</strong><small>${a.enviada ? 'Enviada el ' + nomFechaEnvio(a) : 'Pendiente'}${a.porcentaje != null ? ' · ' + a.porcentaje + '%' : ''}</small>
    </button>`).join('')}</div>` : '';
  const a = n.aceptaciones[nomAceptActiva];
  const campo = (e, v) => v ? `<div class="cab-dato"><span>${e}</span><strong>${nomEsc(v)}</strong></div>` : '';
  const cliente = a.cliente + (a.porcentaje != null ? ` (${a.porcentaje}%)` : '');
  let cuerpo;
  if (!a.enviada) {
    cuerpo = `<div class="nom-acep-cab"><strong>${nomEsc(a.cliente)}</strong><span class="nom-acep-est pend">Pendiente de envío</span></div>
      <div class="cab-datos">${campo('Cliente', cliente)}${campo('Contacto previsto', a.contacto)}</div>
      <p class="nom-acep-aviso">Aún no se ha enviado la aceptación a este cliente.</p>`;
  } else {
    const s = a.snapshot || {};
    const para = s.destinatariosTo || [], cc = s.correosCopia || [], arch = s.archivos || [];
    cuerpo = `<div class="nom-acep-cab"><strong>${nomEsc(s.asunto || 'Aceptación de Nominación')}</strong><span class="nom-acep-est">Enviada el ${nomFechaEnvio(a)}</span></div>
      <div class="nom-acep-resumen"><span>${nomPlural(para.length, 'destinatario', 'destinatarios')}</span><span>${nomPlural(cc.length, 'persona en copia', 'personas en copia')}</span><span>${nomPlural(arch.length, 'archivo adjunto', 'archivos adjuntos')}</span></div>
      <div class="cab-datos">${campo('Cliente', cliente)}${campo('Atención', s.atencion)}${campo('Referencia cliente', s.refCliente || '—')}${campo('Referencia interna', s.refIntertek || '—')}</div>
      ${nomListaCorreos('Para', para) || '<div class="nom-acep-grupo"><span>Para</span><p>Sin destinatarios registrados</p></div>'}
      ${nomListaCorreos('Con copia', cc)}
      ${s.comentariosAdicionales ? `<p class="nom-acep-msg">${nomEsc(s.comentariosAdicionales)}</p>` : ''}
      ${arch.length ? `<div class="nom-acep-grupo"><span>Archivos enviados <b>${arch.length}</b></span><p>${arch.map(f => `<em>${nomEsc(f)}</em>`).join('')}</p></div>` : ''}`;
  }
  cont.innerHTML = `${tabs}<div class="nom-acep">${cuerpo}</div>`;
}
