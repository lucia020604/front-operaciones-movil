// =================================================
// DESCARGA-GASTOS.JS
// Construcción de los reportes de Gastos (Alimentos/Movilidad/Días a Bordo)
// en Excel real (ExcelJS) y PDF (HTML imprimible) — calcan las plantillas
// de Intertek (carpeta raíz del proyecto). Compartido entre la web
// (Registro de Gastos Operativos, ícono de ojo de la grilla) y el móvil
// (Reportes > Descargar): los operadores descargan desde acá el mismo
// archivo que ve el supervisor, con la misma marca de agua de "descargado
// desde este sistema" — un solo lugar para no mantener la plantilla dos
// veces. Requiere ExcelJS cargado por CDN y data-gastos.js/data-tablas-generales.js
// ya cargados antes que este archivo.
// =================================================

function nombreColaboradorGastos(usuario) {
  const u = obtenerUsuarioPorNombre(usuario);
  return u ? `${u.nombre} ${u.apellido}` : usuario;
}

function fechaHoraActualGastos() {
  const ahora = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(ahora.getDate())}/${pad(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${horaA12(`${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`)}`;
}

/* =================================================
   DESCARGA por usuario + tipo de reporte + rango — Excel o PDF. Junta los
   gastos de TODOS los períodos del usuario+tipo que caigan dentro del rango
   elegido (la web pasa el rango que cubre todos sus períodos; el móvil pasa
   directo el período activo, un solo rango).
================================================= */
// Orden y etiquetas de columnas para la descarga — calcan la planilla real
// de Intertek (no el orden que usa la grilla en pantalla, CONFIG_TIPO_GASTO
// en detalle-gastos.js, que sigue siendo el de siempre). "comida" (Alimentos)
// es un dato propio del sistema que la planilla de referencia no tenía — se
// agrega al final de la tabla, no reemplaza ninguna columna de la plantilla
// original. Días a Bordo no trae "Cliente": Precintos no lo registra por
// Uso (casi siempre salía vacío) — Operación sí tiene dato real siempre.
// "costoTotal" (Alimentos) es una columna sintética, no un campo real del
// dato: en la planilla original TOTAL es una fórmula que solo repite COSTO
// (=J15) — acá se resuelve igual, leyendo "costo" (ver valorColumnaGasto).
// Marca de agua diagonal real para los 4 Excel (PROMPT_GASTOS_PENDIENTES_SPRINT4
// §4) — generada una sola vez con <canvas> (texto 'GENERADO POR EL SISTEMA /
// INTERTEK CALEB BRETT' rotado -30°, mismo ángulo que la marca de agua del
// PDF) y embebida como PNG base64 (mismo patrón que LOGO_INTERTEK_BASE64 en
// main.js) — Excel la tilea sola al aplicarla con worksheet.addBackgroundImage,
// sin tener que generarla de nuevo en cada descarga.
const MARCA_AGUA_EXCEL_BASE64 = "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";

// Aplica la marca de agua real a una hoja — ExcelJS la tilea sola en todo
// el área de impresión al ser más chica que la hoja, igual que el PDF
// (que si soporta watermark gráfica diagonal; el Excel antes solo tenía el
// texto "DESCARGADO DESDE…" en la fila 1, sin marca gráfica real).
function aplicarMarcaAguaExcel(sheet) {
  const imgId = sheet.workbook.addImage({ base64: MARCA_AGUA_EXCEL_BASE64, extension: 'png' });
  sheet.addBackgroundImage(imgId);
}

const DESCARGA_COLUMNAS_GASTO = {
  Alimentos: [['fecha', 'FECHA'], ['lugar', 'LUGAR'], ['cliente', 'CLIENTE'], ['operacionPer', 'OPERACIÓN / PER'], ['hora', 'HORAS'], ['comida', 'COMIDA'], ['costo', 'COSTO'], ['costoTotal', 'TOTAL']],
  Movilidad: [['fecha', 'FECHA'], ['empresa', 'EMPRESA'], ['distritoPartida', 'DISTRITO DE PARTIDA'], ['distritoDestino', 'DISTRITO DE DESTINO'], ['motivo', 'MOTIVO'], ['importeDia', 'IMPORTE / DÍA'], ['totalDia', 'TOTAL / DÍA']],
  'Días a Bordo': [['dia', 'DÍA'], ['fecha', 'FECHA'], ['lugar', 'LUGAR'], ['operacion', 'OPERACIÓN'], ['operacionPer', 'ITS REF.'], ['buque', 'BUQUE'], ['detalle', 'DETALLE'], ['monto', 'MONTO']]
};
// Campo cuya suma arma "TOTAL GENERAL" — siempre la última columna de cada
// tabla de arriba, igual que en la planilla de referencia.
const DESCARGA_CAMPO_TOTAL_GASTO = { Alimentos: 'costoTotal', Movilidad: 'totalDia', 'Días a Bordo': 'monto' };
// Columnas de monto (alineadas a la derecha, con formato S/) por tipo — las
// mismas que DESCARGA_CAMPO_TOTAL_GASTO más las intermedias que también son
// plata (ej. Movilidad tiene Importe/Día Y Total/Día).
const DESCARGA_COLUMNAS_MONTO = { costo: true, costoTotal: true, importeDia: true, totalDia: true, monto: true };
// Valor de una celda de dato: "costoTotal" no existe en el objeto real, se
// resuelve leyendo "costo" (ver nota arriba).
function valorColumnaGasto(filaDato, key) {
  return key === 'costoTotal' ? filaDato.costo : filaDato[key];
}
const CENTRO_COSTO_GASTOS = '1101'; // estático, igual que en la planilla de referencia (ver nota en la reunión: el dato real todavía no está modelado en el sistema)

// Arma los datos comunes a Excel y PDF a partir de usuario+tipo+rango —
// devuelve null (con el toast correspondiente) si falta algo o no hay
// resultados, así ambos exportadores solo tienen que preocuparse del
// formato de salida.
function prepararDescargaGastos({ usuario, tipo, desde, hasta }) {
  if (!usuario) { mostrarToast('Selecciona un usuario.'); return null; }
  if (!desde || !hasta) { mostrarToast('Selecciona un rango de fechas válido.'); return null; }

  const reportes = GASTOS_OPERATIVOS_DEMO.filter(g => {
    if (g.tipo !== tipo) return false;
    const detalle = obtenerDetalleGastoPorTipo(g.tipo, g.id);
    return detalle && detalle.firmaTrabajador === usuario;
  });

  const columnas = DESCARGA_COLUMNAS_GASTO[tipo];
  const campoTotal = DESCARGA_CAMPO_TOTAL_GASTO[tipo];
  const filas = [];
  // Solo los períodos que de verdad aportaron alguna fila dentro del rango
  // quedan en "reportesConDatos" — "reportes" trae TODOS los períodos del
  // usuario+tipo (sin filtrar por fecha), y usarlo tal cual para el N°
  // apilaba ahí el código de cada período que el operador tuvo alguna vez,
  // aunque no tuviera nada que ver con esta descarga puntual.
  const reportesConDatos = new Set();
  reportes.forEach(g => {
    // Días a Bordo se regenera antes de armar la descarga (§1.2) — así un
    // cambio de tarifa/tipo de cambio se refleja aunque nadie haya abierto
    // el Detalle antes de descargar.
    if (tipo === 'Días a Bordo') regenerarDiasABordo(g.id);
    const detalle = obtenerDetalleGastoPorTipo(g.tipo, g.id);
    detalle.grilla.forEach(fila => {
      const fechaISO = fechaDDMMYYYYaISO(fila.fecha);
      if (fechaISO < desde || fechaISO > hasta) return;
      filas.push(fila);
      reportesConDatos.add(g);
    });
  });

  if (!filas.length) { mostrarToast('No se encontraron registros con estos filtros.'); return null; }

  const colaborador = reportes.length ? COLABORADOR_GASTOS_DEMO[reportes[0].id] || {} : {};
  const nombreCompleto = reportes.length ? `${reportes[0].nombre} ${reportes[0].apellido}` : nombreColaboradorGastos(usuario);
  const area = reportes.length ? reportes[0].area : '—';
  // "N°" de la planilla de referencia: el/los código(s) de reporte (RA/RM/RD)
  // que de verdad aportaron filas en este rango — puede ser más de uno si
  // el rango cruza varios períodos mensuales, pero nunca uno ajeno a esta
  // descarga puntual.
  const numero = [...new Set([...reportesConDatos].map(g => obtenerDetalleGastoPorTipo(g.tipo, g.id)?.numero).filter(Boolean))].join(' / ') || '—';
  const totalGeneral = filas.reduce((acc, fila) => acc + (Number(valorColumnaGasto(fila, campoTotal)) || 0), 0);
  const tituloTipo = tipo === 'Días a Bordo'
    ? `Días a Bordo del ${fechaISOaDDMMYYYY(desde)} al ${fechaISOaDDMMYYYY(hasta)}`
    : `PLANILLA DE GASTO DE ${tipo.toUpperCase()} - TRABAJADOR`;

  return { usuario, tipo, desde, hasta, columnas, campoTotal, filas, colaborador, nombreCompleto, area, numero, totalGeneral, tituloTipo };
}

/* =================================================
   EXCEL (.xlsx real, vía ExcelJS cargado en el <head>) — calca la planilla
   de referencia de Intertek: membrete Razón social/RUC/N°/Fecha de
   emisión/Centro de costo/Área, tabla con encabezado dorado, TOTAL GENERAL,
   Firma del Trabajador (Alimentos y Movilidad) o NOMBRE + Recibí conforme
   (Días a Bordo), y Base Legal — sin "Revisado"/"Autorizado": no hay un
   flujo de aprobación de un supervisor en el sistema (Sprint 4 §4, la web
   es solo ver y descargar), así que no hay quién firme ahí.
   No soporta marca de agua gráfica diagonal (Excel no la tiene sin plugins)
   — el aviso de "descargado del sistema" queda como primera fila de texto.
================================================= */
// Colores exactos leídos de las planillas .xlsx reales de Intertek (no
// aproximados): dorado de encabezado FFC000, crema de celdas de dato FFF8DD.
const EXCEL_COLOR_GOLD = 'FFFFC000';
const EXCEL_COLOR_CREAM = 'FFFFF8DD';
const EXCEL_BORDE = { style: 'thin', color: { argb: 'FF999999' } };
const EXCEL_BORDES_TODOS = { top: EXCEL_BORDE, left: EXCEL_BORDE, bottom: EXCEL_BORDE, right: EXCEL_BORDE };

// Aviso de "descargado del sistema" que encabeza los 3 formatos (Excel,
// vista previa y PDF) — texto compartido para no repetir el formateo de
// fecha en cada lugar que lo usa.
function textoDescargadoDesdeGastos() {
  return `DESCARGADO DESDE PROCESOS OPERACIONES — INTERTEK CALEB BRETT — ${new Date().toLocaleString('es-PE')}`;
}

// Escribe una celda por coordenadas numéricas (fila, columna — ambas desde
// 1) en vez de referencias tipo "A1": evita errores de conversión letra/
// número a mano en una hoja con bastantes celdas armadas una por una.
function celdaExcelGastos(sheet, fila, col, valor, opciones = {}) {
  const cell = sheet.getRow(fila).getCell(col);
  if (valor !== undefined) cell.value = valor;
  cell.font = { bold: !!opciones.bold, size: opciones.size || 10, color: opciones.colorTexto ? { argb: opciones.colorTexto } : undefined };
  if (opciones.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opciones.fill } };
  cell.alignment = { horizontal: opciones.align || 'left', vertical: 'middle', wrapText: !!opciones.wrap };
  if (opciones.borde !== false) cell.border = EXCEL_BORDES_TODOS;
  if (opciones.formato) cell.numFmt = opciones.formato;
  return cell;
}

function construirHojaExcelAlimentosMovilidad(sheet, d) {
  aplicarMarcaAguaExcel(sheet);
  sheet.columns = [{ width: 18 }, { width: 22 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }];

  sheet.mergeCells(1, 1, 1, 7);
  celdaExcelGastos(sheet, 1, 1, textoDescargadoDesdeGastos(), { bold: true, align: 'center', borde: false });

  // Logo a tamaño legible (~150-200px de ancho, proporción real 3000x2000 =
  // 1.5 — 180x120 no lo deforma ni lo deja pixelado).
  sheet.getRow(2).height = 92;
  const logoId = sheet.workbook.addImage({ base64: LOGO_INTERTEK_BASE64, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0, row: 1.05 }, ext: { width: 180, height: 120 } });

  sheet.mergeCells(3, 1, 3, 7);
  celdaExcelGastos(sheet, 3, 1, d.tituloTipo, { bold: true, size: 12, align: 'center', borde: false });

  let f = 5;
  sheet.mergeCells(f, 2, f, 4);
  celdaExcelGastos(sheet, f, 1, 'Razón social:', { bold: true });
  celdaExcelGastos(sheet, f, 2, EMPRESA_GASTOS.razonSocial.toUpperCase(), { fill: EXCEL_COLOR_CREAM });
  celdaExcelGastos(sheet, f, 5, 'N° de Registro', { bold: true, align: 'center' });
  sheet.mergeCells(f, 6, f, 7);
  celdaExcelGastos(sheet, f, 6, d.numero, { fill: EXCEL_COLOR_CREAM, align: 'center' });
  f++;

  sheet.mergeCells(f, 2, f, 4);
  celdaExcelGastos(sheet, f, 1, 'RUC :', { bold: true });
  celdaExcelGastos(sheet, f, 2, EMPRESA_GASTOS.ruc, { fill: EXCEL_COLOR_CREAM });
  celdaExcelGastos(sheet, f, 5, 'Fecha de emisión:', { bold: true, align: 'center' });
  sheet.mergeCells(f, 6, f, 7);
  celdaExcelGastos(sheet, f, 6, fechaHoraActualGastos(), { fill: EXCEL_COLOR_CREAM, align: 'center' });
  f++;

  sheet.mergeCells(f, 2, f, 4);
  celdaExcelGastos(sheet, f, 1, 'Nombres y apellidos', { bold: true });
  celdaExcelGastos(sheet, f, 2, d.nombreCompleto, { fill: EXCEL_COLOR_CREAM });
  celdaExcelGastos(sheet, f, 5, 'Centro de costo:', { bold: true, align: 'center' });
  sheet.mergeCells(f, 6, f, 7);
  celdaExcelGastos(sheet, f, 6, CENTRO_COSTO_GASTOS, { fill: EXCEL_COLOR_CREAM, align: 'center' });
  f++;

  celdaExcelGastos(sheet, f, 1, 'Cargo', { bold: true });
  celdaExcelGastos(sheet, f, 2, d.colaborador.cargo || '—', { fill: EXCEL_COLOR_CREAM });
  celdaExcelGastos(sheet, f, 3, 'Doc. Identidad:', { bold: true, align: 'center' });
  celdaExcelGastos(sheet, f, 4, d.colaborador.docIdentidad || '—', { fill: EXCEL_COLOR_CREAM, align: 'center' });
  celdaExcelGastos(sheet, f, 5, 'Área:', { bold: true, align: 'center' });
  sheet.mergeCells(f, 6, f, 7);
  celdaExcelGastos(sheet, f, 6, d.area, { fill: EXCEL_COLOR_CREAM, align: 'center' });
  f += 2;

  celdaExcelGastos(sheet, f, 1, 'ASIGNACIÓN ESPECÍFICA', { bold: true, borde: false });
  sheet.mergeCells(f, 4, f, 7);
  celdaExcelGastos(sheet, f, 4, `PERÍODO DEL ${fechaISOaDDMMYYYY(d.desde).toUpperCase()} AL ${fechaISOaDDMMYYYY(d.hasta).toUpperCase()}`, { bold: true, align: 'right', borde: false });
  f++;

  const filaHeaderTabla = f;
  d.columnas.forEach(([, label], i) => celdaExcelGastos(sheet, filaHeaderTabla, i + 1, label, { bold: true, fill: EXCEL_COLOR_GOLD, align: 'center' }));
  f++;

  d.filas.forEach(filaDato => {
    d.columnas.forEach(([key], i) => {
      const esMonto = !!DESCARGA_COLUMNAS_MONTO[key];
      const valor = valorColumnaGasto(filaDato, key);
      celdaExcelGastos(sheet, f, i + 1, esMonto ? (Number(valor) || 0) : (valor ?? ''), {
        align: esMonto ? 'right' : 'left', formato: esMonto ? '"S/" #,##0.00' : undefined, fill: EXCEL_COLOR_CREAM
      });
    });
    f++;
  });

  const colTotal = d.columnas.findIndex(([key]) => key === d.campoTotal) + 1;
  sheet.mergeCells(f, 1, f, colTotal - 1);
  celdaExcelGastos(sheet, f, 1, 'TOTAL GENERAL', { bold: true, align: 'right', fill: EXCEL_COLOR_GOLD });
  celdaExcelGastos(sheet, f, colTotal, d.totalGeneral, { bold: true, align: 'right', fill: EXCEL_COLOR_GOLD, formato: '"S/" #,##0.00' });
  f += 3;

  celdaExcelGastos(sheet, f, 1, 'Firma del Trabajador:', { bold: true, borde: false });
  f += 4;

  // Sin "Revisado"/"Autorizado": no hay flujo de aprobación de un
  // supervisor en el sistema (Sprint 4 §4, la web es solo ver y
  // descargar) — el único firmante real es el operador.
  celdaExcelGastos(sheet, f, 1, 'BASE LEGAL:', { bold: true, size: 8, borde: false });
  f++;
  sheet.mergeCells(f, 1, f, 7);
  celdaExcelGastos(sheet, f, 1, BASE_LEGAL_GASTOS, { size: 8, borde: false, wrap: true });
}

// Una sola tabla con todo el período (ya no 2 quincenas lado a lado) — se
// arma acá partiendo d.filas (ya filtradas por usuario+rango en
// prepararDescargaGastos).
const COLUMNAS_QUINCENA_DIAS_BORDO = [['dia', 'DÍA'], ['fecha', 'FECHA'], ['lugar', 'LUGAR'], ['operacion', 'OPERACIÓN'], ['operacionPer', 'ITS REF.'], ['buque', 'BUQUE'], ['detalle', 'DETALLE'], ['monto', 'MONTO']];

function construirHojaExcelDiasABordo(sheet, d) {
  aplicarMarcaAguaExcel(sheet);
  const anchoCol = { width: 16 };
  sheet.columns = [anchoCol, anchoCol, anchoCol, anchoCol, anchoCol, anchoCol, anchoCol, anchoCol];

  sheet.mergeCells(1, 1, 1, 8);
  celdaExcelGastos(sheet, 1, 1, textoDescargadoDesdeGastos(), { bold: true, align: 'center', borde: false });

  // Logo a tamaño legible (~150-200px de ancho, proporción real 3:2).
  sheet.getRow(2).height = 92;
  const logoId = sheet.workbook.addImage({ base64: LOGO_INTERTEK_BASE64, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0, row: 1.05 }, ext: { width: 180, height: 120 } });

  const filas = [...d.filas].sort((a, b) => fechaDDMMYYYYaISO(a.fecha).localeCompare(fechaDDMMYYYYaISO(b.fecha)));
  const titulo = `DÍAS A BORDO DEL ${fechaISOaDDMMYYYY(d.desde)} AL ${fechaISOaDDMMYYYY(d.hasta)}`.toUpperCase();

  sheet.mergeCells(3, 1, 3, 8);
  celdaExcelGastos(sheet, 3, 1, titulo, { bold: true, size: 12, align: 'center', borde: false });

  let f = 5;
  celdaExcelGastos(sheet, f, 1, 'NOMBRE:', { bold: true });
  sheet.mergeCells(f, 2, f, 8);
  celdaExcelGastos(sheet, f, 2, d.nombreCompleto, { bold: true });
  f += 2;

  const filaHeaderTabla = f;
  COLUMNAS_QUINCENA_DIAS_BORDO.forEach(([, label], i) => {
    celdaExcelGastos(sheet, filaHeaderTabla, i + 1, label, { bold: true, align: 'center', fill: EXCEL_COLOR_GOLD });
  });
  f++;

  filas.forEach(fila => {
    COLUMNAS_QUINCENA_DIAS_BORDO.forEach(([key], c) => {
      const esMonto = key === 'monto';
      const v = esMonto ? (Number(fila[key]) || 0) : (fila[key] ?? '');
      celdaExcelGastos(sheet, f, c + 1, v, { align: esMonto ? 'right' : 'left', formato: esMonto ? '"S/" #,##0.00' : undefined, fill: EXCEL_COLOR_CREAM });
    });
    f++;
  });
  if (!filas.length) {
    sheet.mergeCells(f, 1, f, 8);
    celdaExcelGastos(sheet, f, 1, 'Sin días en este período.', { align: 'center', fill: EXCEL_COLOR_CREAM });
    f++;
  }

  const total = filas.reduce((acc, x) => acc + (Number(x.monto) || 0), 0);
  celdaExcelGastos(sheet, f, 7, 'TOTAL', { bold: true, align: 'right', fill: EXCEL_COLOR_GOLD });
  celdaExcelGastos(sheet, f, 8, total, { bold: true, align: 'right', fill: EXCEL_COLOR_GOLD, formato: '"S/" #,##0.00' });
  f += 3;

  celdaExcelGastos(sheet, f, 1, 'RECIBÍ CONFORME', { align: 'center', borde: false });
}

// Arma el workbook y dispara la descarga del .xlsx — la usa tanto el ícono
// de ojo de la grilla (web) como "Reportes > Descargar" (móvil).
async function descargarWorkbookGastos(d) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(d.tipo.slice(0, 30));

  if (d.tipo === 'Días a Bordo') construirHojaExcelDiasABordo(sheet, d);
  else construirHojaExcelAlimentosMovilidad(sheet, d);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${d.tipo.replace(/\s+/g, '-')}-${d.usuario}-${fechaISOaDDMMYYYY(d.desde).replace(/\//g, '')}-${fechaISOaDDMMYYYY(d.hasta).replace(/\//g, '')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =================================================
   PDF (impresión) — mismo contenido y layout que el Excel de arriba, con la
   diferencia de que acá sí se puede mostrar una marca de agua gráfica
   diagonal real (algo que un .xlsx no soporta sin plugins).
================================================= */
function marcaAguaGastosHTML() {
  const texto = 'PROCESOS OPERACIONES — INTERTEK CALEB BRETT';
  const repeticiones = Array.from({ length: 24 }, () => `<span>${texto}</span>`).join('');
  return `<div class="marca-agua">${repeticiones}</div>`;
}

// Una sola tabla con todo el período (ya no 2 quincenas lado a lado).
function tablaDiasABordoHTML(d) {
  const filas = [...d.filas].sort((a, b) => fechaDDMMYYYYaISO(a.fecha).localeCompare(fechaDDMMYYYYaISO(b.fecha)));
  const titulo = `DÍAS A BORDO DEL ${fechaISOaDDMMYYYY(d.desde)} AL ${fechaISOaDDMMYYYY(d.hasta)}`.toUpperCase();
  const total = filas.reduce((acc, x) => acc + (Number(x.monto) || 0), 0);

  const filasHTML = filas.length
    ? filas.map(f => `<tr>${COLUMNAS_QUINCENA_DIAS_BORDO.map(([key]) => {
        const esMonto = key === 'monto';
        return `<td${esMonto ? ' style="text-align:right;"' : ''}>${esMonto ? 'S/ ' + Number(f[key] || 0).toFixed(2) : (f[key] ?? '—')}</td>`;
      }).join('')}</tr>`).join('')
    : `<tr><td colspan="${COLUMNAS_QUINCENA_DIAS_BORDO.length}" style="text-align:center;color:#888;">Sin días en este período.</td></tr>`;

  return `
    <table class="quincena-tabla quincena-tabla-unica">
      <caption>${titulo}</caption>
      <thead><tr>${COLUMNAS_QUINCENA_DIAS_BORDO.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead>
      <tbody>${filasHTML}</tbody>
      <tfoot><tr class="fila-total"><td colspan="${COLUMNAS_QUINCENA_DIAS_BORDO.length - 1}">TOTAL</td><td>S/ ${total.toFixed(2)}</td></tr></tfoot>
    </table>`;
}

// Arma el HTML del reporte a partir de "d" (ver prepararDescargaGastos) —
// lo usan tanto la descarga en PDF (descarga + imprime, con la marca de
// agua diagonal que un PDF sí soporta) como la vista previa ("modoExcel":
// un aviso de texto plano en vez de la marca de agua, para calcar el
// encabezado del .xlsx real).
function construirHTMLReporteGastos(d, modoExcel) {
  const { usuario, tipo, desde, hasta, columnas, campoTotal, filas, colaborador, nombreCompleto, area, numero, totalGeneral, tituloTipo } = d;

  // Firma del OPERADOR (§6 PROMPT_GASTOS_JORNADA_SPRINT4): la que ya tiene
  // cargada en su perfil (Configuración > Usuarios) — es la ÚNICA firma del
  // documento (ver bloqueFirmas): no hay "Revisado"/"Autorizado" porque no
  // existe un flujo de aprobación de un supervisor en el sistema. Si el
  // operador todavía no tiene una firma registrada, se deja la raya en
  // blanco como antes.
  const firmaOperador = (typeof obtenerFirmaUsuario === 'function' && typeof obtenerUsuarioPorNombre === 'function')
    ? obtenerFirmaUsuario(obtenerUsuarioPorNombre(usuario))
    : null;

  const filasHTML = filas.map(fila => `
    <tr>${columnas.map(([key]) => {
      const esMonto = !!DESCARGA_COLUMNAS_MONTO[key];
      const valor = valorColumnaGasto(fila, key);
      return `<td${esMonto ? ' style="text-align:right;"' : ''}>${esMonto ? 'S/ ' + Number(valor || 0).toFixed(2) : (valor ?? '')}</td>`;
    }).join('')}</tr>`).join('');

  const colTotalIndex = columnas.findIndex(([key]) => key === campoTotal);
  const esDiasABordo = tipo === 'Días a Bordo';

  const bloqueEncabezadoInfo = esDiasABordo
    ? `<table class="info-tabla"><tr><th style="width:90px;">NOMBRE:</th><td colspan="8">${nombreCompleto}</td></tr></table>`
    : `<table class="info-tabla">
        <tr><th>Razón social:</th><td colspan="2">${EMPRESA_GASTOS.razonSocial.toUpperCase()}</td><th>N° de Registro</th><td>${numero}</td></tr>
        <tr><th>RUC :</th><td colspan="2">${EMPRESA_GASTOS.ruc}</td><th>Fecha de emisión:</th><td>${fechaHoraActualGastos()}</td></tr>
        <tr><th>Nombres y apellidos</th><td colspan="2">${nombreCompleto}</td><th>Centro de costo:</th><td>${CENTRO_COSTO_GASTOS}</td></tr>
        <tr><th>Cargo</th><td>${colaborador.cargo || '—'}</td><th>Doc. Identidad:</th><td>${colaborador.docIdentidad || '—'}</td><th>Área:</th><td>${area}</td></tr>
      </table>
      <div class="asignacion-fila"><strong>ASIGNACIÓN ESPECÍFICA</strong><span>PERÍODO DEL ${fechaISOaDDMMYYYY(desde).toUpperCase()} AL ${fechaISOaDDMMYYYY(hasta).toUpperCase()}</span></div>`;

  // Sin "Autorizado"/"Revisado": no hay flujo de aprobación de un
  // supervisor en el sistema (Sprint 4 §4, la web es solo ver y
  // descargar) — el único firmante real es el operador.
  const bloqueFirmas = esDiasABordo
    ? `<div class="firma-fila-doble">
        <div class="firma-linea-doble">${firmaOperador ? `<img src="${firmaOperador}" class="firma-operador-img" alt="Firma">` : ''}<strong>${nombreCompleto}</strong><br>RECIBÍ CONFORME</div>
      </div>`
    : `<p class="firma-label">Firma del Trabajador:${firmaOperador ? `<img src="${firmaOperador}" class="firma-operador-img-inline" alt="Firma">` : '<span class="firma-raya"></span>'}</p>
      <p class="base-legal"><strong>BASE LEGAL:</strong> ${BASE_LEGAL_GASTOS}</p>`;

  const html = `<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8">
    <title>${tipo} — ${nombreCompleto}</title>
    <style>
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
      body  { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; color: #111; position: relative; }
      .marca { margin-bottom: 10px; }
      .marca img { width: 170px; height: auto; display: block; }
      h2    { font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: .05em; margin: 10px 0; }
      .info-tabla { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      .info-tabla th, .info-tabla td { border: 1px solid #999; padding: 4px 8px; font-size: 9px; }
      .info-tabla th { text-align: left; background: #fff; font-weight: 700; white-space: nowrap; }
      .info-tabla td { background: #FFF8DD; }
      .asignacion-fila { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; margin: 10px 0 6px; }
      table.datos { width: 100%; border-collapse: collapse; }
      table.datos th { background: #FFC000; color: #111; padding: 6px 8px; text-align: center;
              font-size: 8.5px; text-transform: uppercase; letter-spacing: .03em; border: 1px solid #999; }
      table.datos.sin-color th { background: #fff; border: 1px solid #111; }
      table.datos td { padding: 5px 8px; border: 1px solid #ddd; background: #FFF8DD; }
      table.datos.sin-color td { background: #fff; }
      .fila-total td { font-weight: 700; background: #FFC000; text-align: right; border: 1px solid #999; }
      .firma-label { margin-top: 36px; font-weight: 700; font-size: 10px; }
      .firma-raya { display: inline-block; width: 220px; border-bottom: 1px solid #111; margin-left: 8px; }
      .firma-operador-img-inline { display: inline-block; height: 40px; margin-left: 10px; vertical-align: middle; }
      .firma-operador-img { display: block; height: 40px; margin: 0 auto 2px; }
      .base-legal { font-size: 8px; color: #333; margin-top: 14px; }
      .firma-fila-doble { display: flex; justify-content: center; margin-top: 60px; text-align: center; }
      .firma-linea-doble { border-top: 1px solid #111; padding-top: 4px; font-size: 9px; width: 220px; }
      .pie-codigo { display: flex; justify-content: space-between; font-size: 7.5px; color: #777; margin-top: 20px; }
      .quincena-tabla { width: 100%; border-collapse: collapse; }
      .quincena-tabla caption { font-size: 9.5px; font-weight: 700; text-align: center; padding: 4px 0 6px; caption-side: top; }
      .quincena-tabla th { background: #FFC000; color: #111; padding: 4px 5px; text-align: center; font-size: 7.5px; text-transform: uppercase; border: 1px solid #999; }
      .quincena-tabla td { padding: 4px 5px; border: 1px solid #ddd; background: #FFF8DD; font-size: 8px; }
      .quincena-tabla .fila-total td { font-weight: 700; background: #FFC000; text-align: right; border: 1px solid #999; }
      .quincena-tabla-unica th { font-size: 9px; padding: 5px 6px; }
      .quincena-tabla-unica td { font-size: 9.5px; padding: 5px 6px; }
      .marca-agua {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        display: flex; flex-wrap: wrap; align-content: space-around; justify-content: space-around;
        transform: rotate(-30deg); transform-origin: center;
        opacity: .09; font-size: 16px; font-weight: 700; color: #000;
        pointer-events: none; z-index: 1; overflow: hidden;
      }
      .marca-agua span { margin: 18px 26px; white-space: nowrap; }
      .aviso-descarga { font-size: 10px; font-weight: 700; text-align: center; margin-bottom: 10px; }
      .hoja { position: relative; z-index: 2; }
      @media print { @page { margin: 15mm; } }
    </style>
  </head><body>
    ${modoExcel ? `<div class="aviso-descarga">${textoDescargadoDesdeGastos()}</div>` : marcaAguaGastosHTML()}
    <div class="hoja">
      <div class="marca"><img src="data:image/png;base64,${LOGO_INTERTEK_BASE64}" alt="Intertek"></div>
      ${esDiasABordo ? '' : `<h2>${tituloTipo}</h2>`}${bloqueEncabezadoInfo}
      ${esDiasABordo ? tablaDiasABordoHTML(d) : `
      <table class="datos">
        <thead><tr>${columnas.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead>
        <tbody>${filasHTML}</tbody>
        <tfoot><tr class="fila-total">${(() => {
          const restantes = columnas.length - colTotalIndex - 2;
          return `<td colspan="${colTotalIndex}">TOTAL GENERAL</td><td>S/ ${totalGeneral.toFixed(2)}</td>${restantes > 0 ? `<td colspan="${restantes}"></td>` : ''}`;
        })()}</tr></tfoot>
      </table>`}
      ${bloqueFirmas}
    </div>
  </body></html>`;

  return html;
}

// Abre el reporte en una ventana nueva, solo para verlo — no dispara ni
// descarga ni impresión por sí sola. "imprimir" además abre el diálogo de
// impresión (descarga PDF real); "modoExcel" cambia el encabezado para
// calcar el .xlsx en vez del PDF (ver construirHTMLReporteGastos).
function abrirVentanaReporteGastos(d, { imprimir = false, modoExcel = false } = {}) {
  const win = window.open('', '_blank', 'width=1000,height=700');
  win.document.write(construirHTMLReporteGastos(d, modoExcel));
  win.document.close();
  win.focus();
  if (imprimir) win.print();
}

/* =================================================
   ÚLTIMA DESCARGA — igual que "Última Descarga" de Precintos: {fecha, por,
   desde, hasta} por usuario+tipo, persistido. La usan tanto la grilla web
   (columna "Última Descarga") como, si hiciera falta, el móvil.
================================================= */
const TIPOS_GASTO_PREVIEW = ['Alimentos', 'Movilidad', 'Días a Bordo'];

const ULTIMA_DESCARGA_GASTOS = tgCargarCatalogo('ultimaDescargaGastosData', {});
function claveUltimaDescargaGastos(usuario, tipo) { return `${usuario}|${tipo}`; }

// Migración: navegadores con el formato viejo (string ISO suelto) se quedan
// con "por"/"desde"/"hasta" en null, sin perder la fecha ya registrada.
Object.keys(ULTIMA_DESCARGA_GASTOS).forEach(clave => {
  if (typeof ULTIMA_DESCARGA_GASTOS[clave] === 'string') {
    ULTIMA_DESCARGA_GASTOS[clave] = { fecha: ULTIMA_DESCARGA_GASTOS[clave], por: null, desde: null, hasta: null };
  }
});

function registrarUltimaDescargaGastos(usuario, tipo, desde, hasta) {
  const sesion = obtenerUsuarioActual();
  ULTIMA_DESCARGA_GASTOS[claveUltimaDescargaGastos(usuario, tipo)] = {
    fecha: new Date().toISOString(), por: sesion ? sesion.usuario : null, desde: desde || null, hasta: hasta || null
  };
  tgGuardarCatalogo('ultimaDescargaGastosData', ULTIMA_DESCARGA_GASTOS);
}

function obtenerUltimaDescargaGastos(usuario, tipo) {
  return ULTIMA_DESCARGA_GASTOS[claveUltimaDescargaGastos(usuario, tipo)] || null;
}

function textoUltimaDescargaGastos(usuario, tipo) {
  const registro = obtenerUltimaDescargaGastos(usuario, tipo);
  if (!registro) return 'Sin descargas registradas';
  const f = new Date(registro.fecha);
  const fechaHora = `${f.toLocaleDateString('es-PE')} ${f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
  const porTexto = registro.por ? ` por ${nombreColaboradorGastos(registro.por)}` : '';
  const periodoTexto = (registro.desde && registro.hasta) ? ` — período ${fechaISOaDDMMYYYY(registro.desde)} al ${fechaISOaDDMMYYYY(registro.hasta)}` : '';
  return `Última descarga: ${fechaHora}${porTexto}${periodoTexto}`;
}

// Más reciente de los 3 tipos (Alimentos/Movilidad/Días a Bordo) de un
// operador — columna "Última Descarga" de la grilla principal.
function textoUltimaDescargaGastosOperador(usuario) {
  const registros = TIPOS_GASTO_PREVIEW
    .map(tipo => obtenerUltimaDescargaGastos(usuario, tipo))
    .filter(Boolean)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!registros.length) return 'Sin descargas registradas';
  const f = new Date(registros[0].fecha);
  const porTexto = registros[0].por ? ` por ${nombreColaboradorGastos(registros[0].por)}` : '';
  return `${f.toLocaleDateString('es-PE')} ${f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}${porTexto}`;
}
