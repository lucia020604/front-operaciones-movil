// =================================================
// DATA-PRECINTOS.JS
// Fuente única de datos del módulo Precintos (prototipo sin backend).
// La usan: control-precintos.js y reporte-precintos.js.
// =================================================

/* =================================================
   UTILIDADES DE FECHA (dd/mm/yyyy ⇄ yyyy-mm-dd, formato de <input type="date">)
   Compartidas por control-precintos.js y reporte-precintos.js.
================================================= */
function fechaISOaDDMMYYYY(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fechaDDMMYYYYaISO(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
}

// Extrae el número final de un código de precinto (ej. "A-10010" → 10010),
// para ordenar precintos y calcular rangos. Compartida por control-precintos.js
// y reporte-precintos.js.
function numeroDePrecinto(codigo) {
  const match = String(codigo).match(/(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : NaN;
}

// Agrupa una lista de precintos en rangos contiguos para mostrarlos de forma
// compacta (ej. ['A-10001','A-10002','A-10003','A-10005'] → "A-10001 - A-10003, A-10005")
// — la usa la vista "Por lote" de Ver detalle de Asignación (asignacion-precintos.js)
// para no listar precinto por precinto cuando son varias decenas.
function formatearRangosPrecintos(precintos) {
  if (!precintos || !precintos.length) return '';
  const ordenados = [...precintos].sort((a, b) => numeroDePrecinto(a) - numeroDePrecinto(b));
  const grupos = [];
  let inicio = ordenados[0];
  let anterior = ordenados[0];

  for (let i = 1; i <= ordenados.length; i++) {
    const actual = ordenados[i];
    if (actual !== undefined && numeroDePrecinto(actual) === numeroDePrecinto(anterior) + 1) {
      anterior = actual;
      continue;
    }
    grupos.push(inicio === anterior ? inicio : `${inicio} - ${anterior}`);
    inicio = actual;
    anterior = actual;
  }
  return grupos.join(', ');
}

// Divide una lista de precintos en sub-grupos por Material y, dentro de
// cada material, por corrida consecutiva — dos precintos del mismo material
// pero no correlativos (o de materiales distintos) son grupos separados,
// nunca uno solo con huecos. Cada sub-grupo ya trae su propio texto de
// numeración listo para mostrar, ej. "A-0301 al A-0303 (3)" (un solo
// precinto no lleva el "al ... (n)"). La usan Asignación de Precintos
// (detalle y tabla de agregados) y Reporte de Precintos (cartola y descarga
// del Registro de Control) — vive acá porque ambas páginas la necesitan.
function dividirPorMaterialYCorrelatividad(precintos) {
  const porMaterial = new Map();
  precintos.forEach(p => {
    const material = obtenerLoteDePrecinto(p)?.material || '—';
    if (!porMaterial.has(material)) porMaterial.set(material, []);
    porMaterial.get(material).push(p);
  });

  const subgrupos = [];
  porMaterial.forEach((codigos, material) => {
    const ordenados = [...codigos].sort((a, b) => numeroDePrecinto(a) - numeroDePrecinto(b));
    let corrida = [ordenados[0]];
    for (let i = 1; i <= ordenados.length; i++) {
      const actual = ordenados[i];
      if (actual !== undefined && numeroDePrecinto(actual) === numeroDePrecinto(corrida[corrida.length - 1]) + 1) {
        corrida.push(actual);
        continue;
      }
      const texto = corrida.length > 1 ? `${corrida[0]} al ${corrida[corrida.length - 1]} (${corrida.length})` : corrida[0];
      subgrupos.push({ material, precintos: corrida, texto, cantidad: corrida.length });
      corrida = [actual];
    }
  });
  return subgrupos;
}

// Datos no editables del encabezado en "Generar Registro de Precintos".
const EMPRESA_PRECINTOS = {
  razonSocial: 'Intertek Testing Services Peru S.A.',
  ruc: '20100123456'
};

// Grilla principal de "Control de Precintos": cada fila es un lote registrado
// (código + fecha + estado) — el módulo solo maneja ingresos. "ingresadoPor"
// es quién hizo ESE registro puntual (el supervisor que cargó el stock), no
// quién lo asigna después — eso vive en ASIGNACIONES_PRECINTOS_DEMO.entregadoPor.
const PRECINTOS_REGISTROS_SEED = [
  // Lotes de HOY con más precintos y de los 3 materiales, para probar el
  // reporte de "Finalizar el día" con varios rangos (ver ASG26000014-017).
  { codigo: 'PRE26000022', fecha: '12/10/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria',
    precintos: ['K-90001', 'K-90002', 'K-90003', 'K-90004', 'K-90005', 'K-90006', 'K-90007', 'K-90008', 'K-90009', 'K-90010',
      'K-90011', 'K-90012', 'K-90013', 'K-90014', 'K-90015', 'K-90016', 'K-90017', 'K-90018', 'K-90019', 'K-90020'] },
  { codigo: 'PRE26000023', fecha: '12/10/2026', estado: 'Registrado', material: 'Metálico',
    ingresadoPor: 's.echavarria',
    precintos: ['M-91001', 'M-91002', 'M-91003', 'M-91004', 'M-91005', 'M-91006', 'M-91007', 'M-91008', 'M-91009', 'M-91010'] },
  { codigo: 'PRE26000024', fecha: '12/10/2026', estado: 'Registrado', material: 'Circular',
    ingresadoPor: 's.echavarria',
    precintos: ['N-92001', 'N-92002', 'N-92003', 'N-92004', 'N-92005', 'N-92006', 'N-92007', 'N-92008'] },
  // Lote de hoy para pruebas móvil (asignado pero sin reportar Uso a
  // propósito, igual que E-50005/E-50006 más abajo): 20 precintos, 5 para
  // cada uno de los 4 operadores de prueba (ver ASG26000010-013).
  { codigo: 'PRE26000019', fecha: '12/10/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria',
    precintos: ['F-70001', 'F-70002', 'F-70003', 'F-70004', 'F-70005', 'F-70006', 'F-70007', 'F-70008', 'F-70009', 'F-70010',
      'F-70011', 'F-70012', 'F-70013', 'F-70014', 'F-70015', 'F-70016', 'F-70017', 'F-70018', 'F-70019', 'F-70020'] },
  // Caso de prueba "reporte por material" (octubre 2026): un lote de cada
  // material, entregados juntos a r.bravo en ASG26000090 — ver nota ahí.
  // Códigos altos (…090/…091/…092) a propósito, para no chocar con lotes
  // que ya se hayan creado a mano en el navegador.
  { codigo: 'PRE26000090', fecha: '05/10/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria',
    precintos: ['H-80001', 'H-80002', 'H-80003', 'H-80004', 'H-80005', 'H-80006'] },
  { codigo: 'PRE26000091', fecha: '05/10/2026', estado: 'Registrado', material: 'Metálico',
    ingresadoPor: 's.echavarria',
    precintos: ['F-60001', 'F-60002', 'F-60003', 'F-60004', 'F-60005'] },
  { codigo: 'PRE26000092', fecha: '05/10/2026', estado: 'Registrado', material: 'Circular',
    ingresadoPor: 's.echavarria',
    precintos: ['G-70001', 'G-70002', 'G-70003', 'G-70004'] },

  // Lote de prueba del mes en curso (octubre 2026): junto con ASG26000009 y
  // GRP26000051 más abajo, arma un caso completo móvil→web para probar en
  // un solo vistazo, sin tener que tocar los filtros de fecha (que por
  // defecto muestran el mes en curso): un rango ancho reportado junto
  // ("E-50001 al E-50004 (4)"), un corte en la numeración dentro del mismo
  // viaje/día ("E-50007" queda en línea aparte), scrap consecutivo
  // reportado junto ("E-50009 al E-50010 (2)"), y 2 precintos (E-50005,
  // E-50006) que quedan sin reportar a propósito.
  { codigo: 'PRE26000018', fecha: '01/10/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria',
    precintos: ['E-50001', 'E-50002', 'E-50003', 'E-50004', 'E-50005', 'E-50006', 'E-50007', 'E-50008', 'E-50009', 'E-50010'] },

  { codigo: 'PRE26000017', fecha: '12/09/2026', estado: 'Registrado', material: 'Circular',
    ingresadoPor: 's.echavarria',
    precintos: ['D-40001', 'D-40002', 'D-40003', 'D-40004'] },

  { codigo: 'PRE26000016', fecha: '08/09/2026', estado: 'Registrado', material: 'Metálico',
    ingresadoPor: 's.echavarria',
    precintos: ['C-30001', 'C-30002', 'C-30003', 'C-30004', 'C-30005', 'C-30006'] },

  { codigo: 'PRE26000015', fecha: '02/09/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria',
    precintos: ['B-20001', 'B-20002', 'B-20003', 'B-20004', 'B-20005', 'B-20006', 'B-20007', 'B-20008'] },

  { codigo: 'PRE26000014', fecha: '20/08/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria',
    precintos: ['A-10021', 'A-10022', 'A-10023', 'A-10024', 'A-10025'] },

  { codigo: 'PRE26000013', fecha: '15/08/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria',
    precintos: ['A-10001', 'A-10002', 'A-10003', 'A-10004', 'A-10005', 'A-10006', 'A-10007', 'A-10008', 'A-10009', 'A-10010'] },

  { codigo: 'PRE26000012', fecha: '02/08/2026', estado: 'Finalizado', material: 'Circular',
    ingresadoPor: 's.echavarria',
    precintos: ['A-09950', 'A-09951', 'A-09952', 'A-09953'] },

  { codigo: 'PRE26000011', fecha: '20/07/2026', estado: 'Finalizado', material: 'Metálico',
    ingresadoPor: 's.echavarria',
    precintos: ['A-09900', 'A-09901', 'A-09902', 'A-09903', 'A-09904', 'A-09905'] }
];
const PRECINTOS_REGISTROS_DEMO = tgCargarCatalogo('precintosRegistrosData', PRECINTOS_REGISTROS_SEED);
// Migración: tgCargarCatalogo solo usa el seed si no hay nada guardado, así
// que los lotes/asignaciones de prueba agregados después no llegarían a un
// navegador con datos previos — se suman acá si faltan.
['PRE26000022', 'PRE26000023', 'PRE26000024'].forEach(codigo => {
  if (PRECINTOS_REGISTROS_DEMO.some(r => r.codigo === codigo)) return;
  PRECINTOS_REGISTROS_DEMO.push(JSON.parse(JSON.stringify(PRECINTOS_REGISTROS_SEED.find(r => r.codigo === codigo))));
  tgGuardarCatalogo('precintosRegistrosData', PRECINTOS_REGISTROS_DEMO);
});

// Asignaciones registradas (Precintos > Asignación de Precintos).
// "registroCodigos" enlaza con PRECINTOS_REGISTROS_DEMO.codigo — es un
// arreglo porque una misma asignación puede juntar precintos de más de un
// lote (se deriva de los lotes de origen de "precintos", ver
// obtenerLoteDePrecinto). Una asignación no es para una sola persona: cada
// entregado/recibido es un registro independiente, para no mezclar en un
// mismo registro a colaboradores distintos. La asignación es ante todo un
// conjunto de precintos ("precintos"/"cantidad") entregado de una sola vez;
// no lleva PER — cada Asignación tiene su propio Detalle/GRP de uso (ver
// asegurarReportePrecinto), relación 1 a 1. "entregadoPor" y "recibidoPor"
// son usuarios del sistema (USUARIOS_DEMO): Supervisor y Inspector
// respectivamente. No lleva un campo "estado" propio: se calcula a partir de
// su Detalle/GRP (ver calcularEstadoAsignacion más abajo) — 'Registrado'
// mientras nadie reportó ningún uso, 'En proceso' con uso parcial reportado
// y 'Finalizado' cuando ya se reportó todo o el Detalle/GRP quedó cerrado.
const ASIGNACIONES_PRECINTOS_SEED = [
  // Más precintos de HOY (sin uso reportado) para probar rangos, cortes de
  // numeración y varios materiales en el reporte de Finalizar el día.
  { id: 17, codigo: 'ASG26000017', registroCodigos: ['PRE26000022'], fecha: '12/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.gomez',
    precintos: ['K-90013', 'K-90014', 'K-90015', 'K-90016', 'K-90017', 'K-90018', 'K-90019', 'K-90020'],
    cantidad: 8, motivo: 'Servicio de descarga M/N Cordillera', observaciones: '' },
  { id: 16, codigo: 'ASG26000016', registroCodigos: ['PRE26000024'], fecha: '12/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.torres',
    precintos: ['N-92001', 'N-92002', 'N-92003', 'N-92004', 'N-92005', 'N-92006', 'N-92007', 'N-92008'],
    cantidad: 8, motivo: 'Servicio de descarga M/N Naviera del Sur', observaciones: '' },
  { id: 15, codigo: 'ASG26000015', registroCodigos: ['PRE26000023'], fecha: '12/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'r.bravo',
    precintos: ['M-91001', 'M-91002', 'M-91003', 'M-91004', 'M-91005', 'M-91006', 'M-91007', 'M-91008', 'M-91009', 'M-91010'],
    cantidad: 10, motivo: 'Servicio de descarga M/N Costa Azul', observaciones: '' },
  { id: 14, codigo: 'ASG26000014', registroCodigos: ['PRE26000022'], fecha: '12/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'e.allccaco',
    precintos: ['K-90001', 'K-90002', 'K-90003', 'K-90004', 'K-90005', 'K-90006', 'K-90007', 'K-90008', 'K-90009', 'K-90010', 'K-90011', 'K-90012'],
    cantidad: 12, motivo: 'Servicio de carga M/N Stena Polar', observaciones: '' },

  // Asignaciones de HOY sin ningún Uso reportado todavía — a propósito, para
  // probar desde la app móvil el flujo completo de un operador real:
  // abrir "Precinto" en su operación asignada, marcar Uso/Scrap, Finalizar
  // el día (reporte de precintos) y seguir a Gastos. Una por cada operador
  // de prueba: e.allccaco (OP-2026-041, V-2201), r.bravo (OP-2026-052,
  // V-2214), j.torres (OP-2026-074, V-2287) y j.gomez (OP-2026-063, V-2401
  // — además de E-50005/E-50006 de ASG26000009, que siguen sin usar).
  { id: 13, codigo: 'ASG26000013', registroCodigos: ['PRE26000019'], fecha: '12/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.gomez',
    precintos: ['F-70016', 'F-70017', 'F-70018', 'F-70019', 'F-70020'],
    cantidad: 5,
    motivo: 'Servicio de descarga M/N Cordillera', observaciones: '' },

  { id: 12, codigo: 'ASG26000012', registroCodigos: ['PRE26000019'], fecha: '12/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.torres',
    precintos: ['F-70011', 'F-70012', 'F-70013', 'F-70014', 'F-70015'],
    cantidad: 5,
    motivo: 'Servicio de descarga M/N Naviera del Sur', observaciones: '' },

  { id: 11, codigo: 'ASG26000011', registroCodigos: ['PRE26000019'], fecha: '12/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'r.bravo',
    precintos: ['F-70006', 'F-70007', 'F-70008', 'F-70009', 'F-70010'],
    cantidad: 5,
    motivo: 'Servicio de descarga M/N Costa Azul', observaciones: '' },

  { id: 10, codigo: 'ASG26000010', registroCodigos: ['PRE26000019'], fecha: '12/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'e.allccaco',
    precintos: ['F-70001', 'F-70002', 'F-70003', 'F-70004', 'F-70005'],
    cantidad: 5,
    motivo: 'Servicio de carga M/N Stena Polar', observaciones: '' },
  // Caso de prueba "reporte por material": r.bravo recibe los 3 materiales
  // en una sola entrega y tiene uso Y scrap en cada uno este mes, con
  // cantidades distintas por material para poder comprobarlas a simple
  // vista (Usado / Scrap / Libres para reportar desde el móvil):
  //   Plástico  H-80001..H-80006 → 3 / 1 / 2 (H-80005, H-80006)
  //   Metálico  F-60001..F-60005 → 2 / 2 / 1 (F-60005)
  //   Circular  G-70001..G-70004 → 1 / 1 / 2 (G-70003, G-70004)
  // Uso en GRP26000090 (viaje V-2214, mismo de su operación móvil
  // OP-2026-052).
  { id: 90, codigo: 'ASG26000090', registroCodigos: ['PRE26000090', 'PRE26000091', 'PRE26000092'], fecha: '05/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'r.bravo',
    precintos: ['H-80001', 'H-80002', 'H-80003', 'H-80004', 'H-80005', 'H-80006',
                'F-60001', 'F-60002', 'F-60003', 'F-60004', 'F-60005',
                'G-70001', 'G-70002', 'G-70003', 'G-70004'],
    cantidad: 15,
    scrap: [
      { precinto: 'H-80004', fecha: '05/10/2026', colaborador: 'r.bravo', motivo: 'Cuerpo plástico roto al retirarlo del empaque.' },
      { precinto: 'F-60003', fecha: '06/10/2026', colaborador: 'r.bravo', motivo: 'Cable metálico deshilachado, no aseguraba.' },
      { precinto: 'F-60004', fecha: '06/10/2026', colaborador: 'r.bravo', motivo: 'Cable metálico deshilachado, no aseguraba.' },
      { precinto: 'G-70002', fecha: '06/10/2026', colaborador: 'r.bravo', motivo: 'Mecanismo de cierre del precinto circular no engancha.' }
    ],
    motivo: 'Servicio de descarga Pesquera Costa Azul',
    observaciones: 'Entrega con los 3 materiales para probar el reporte por material.' },

  // Datos de prueba móvil→web del mes en curso — ver nota en
  // PRECINTOS_REGISTROS_SEED (PRE26000018) y el Detalle/GRP de abajo
  // (GRP26000051). E-50009 y E-50010 llegaron juntos como scrap (mismo
  // motivo y fecha) para probar que el scrap también agrupa por corrida
  // consecutiva en Reporte de Precintos, igual que un Uso.
  { id: 9, codigo: 'ASG26000009', registroCodigos: ['PRE26000018'], fecha: '02/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.gomez',
    precintos: ['E-50001', 'E-50002', 'E-50003', 'E-50004', 'E-50005', 'E-50006', 'E-50007', 'E-50008', 'E-50009', 'E-50010'],
    cantidad: 10,
    scrap: [
      { precinto: 'E-50009', fecha: '03/10/2026', colaborador: 'j.gomez', motivo: 'Cierre de seguridad trabado, no cerraba correctamente.' },
      { precinto: 'E-50010', fecha: '03/10/2026', colaborador: 'j.gomez', motivo: 'Cierre de seguridad trabado, no cerraba correctamente.' }
    ],
    motivo: 'Servicio de descarga M/N Cordillera', observaciones: '' },

  // A-09951 quedó marcado como scrap aunque esta Asignación sigue
  // "Registrado" (su Detalle/GRP todavía no tiene nada reportado): un
  // precinto puede llegar dañado y reportarse como scrap desde la app móvil
  // antes de instalarse, sin que eso implique que ya se "usó". Sirve para
  // ver cómo se bloquea ese precinto puntual en "Editar" (no se puede
  // quitar) mientras el resto de la Asignación se sigue pudiendo editar.
  { id: 8, codigo: 'ASG26000008', registroCodigos: ['PRE26000012'], fecha: '20/09/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.torres',
    precintos: ['A-09950', 'A-09951', 'A-09952', 'A-09953'],
    cantidad: 4,
    scrap: [{ precinto: 'A-09951', fecha: '21/09/2026', colaborador: 'j.torres', motivo: 'Cuerpo plástico agrietado al momento de revisarlo; no se pudo instalar.' }],
    motivo: 'Servicio de descarga M/N Naviera del Sur', observaciones: '' },

  // Ejemplo de una Asignación con más de un material de precinto para el
  // mismo receptor en una sola entrega (Metálico + Circular, de dos lotes
  // distintos) — no solo mezcla de lotes del mismo material como ASG26000006.
  // D-40002 (Circular) quedó marcado como scrap: sirve para ver la vista
  // "Por material" de Ver Detalle con el conteo de scrap repartido entre
  // los dos materiales de la misma Asignación (Metálico en 0, Circular en 1).
  { id: 7, codigo: 'ASG26000007', registroCodigos: ['PRE26000016', 'PRE26000017'], fecha: '16/09/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.gomez',
    precintos: ['C-30001', 'C-30002', 'C-30003', 'D-40001', 'D-40002'],
    cantidad: 5,
    scrap: [{ precinto: 'D-40002', fecha: '17/09/2026', colaborador: 'j.gomez', motivo: 'Mecanismo de cierre del precinto circular no engancha.' }],
    motivo: 'Servicio de estiba M/N Coloso',
    observaciones: 'Entrega con precintos metálicos (contenedores) y circulares (válvulas) para el mismo servicio.' },

  { id: 6, codigo: 'ASG26000006', registroCodigos: ['PRE26000014', 'PRE26000015'], fecha: '17/09/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'r.bravo',
    precintos: ['A-10024', 'A-10025', 'B-20006', 'B-20007', 'B-20008'],
    cantidad: 5,
    motivo: 'Servicio de descarga M/N Puelche', observaciones: 'Asignación que mezcla el saldo de dos lotes de origen.' },

  // B-20004 quedó marcado como scrap este mes — para que e.allccaco también
  // aparezca en Reporte de Precintos con el filtro de fecha por defecto
  // (mes en curso), igual que los otros 3 operadores de prueba.
  { id: 5, codigo: 'ASG26000005', registroCodigos: ['PRE26000015'], fecha: '10/09/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'e.allccaco',
    precintos: ['B-20001', 'B-20002', 'B-20003', 'B-20004', 'B-20005'],
    cantidad: 5,
    scrap: [{ precinto: 'B-20004', fecha: '04/10/2026', colaborador: 'e.allccaco', motivo: 'Cuerpo dañado por humedad durante el transporte.' }],
    motivo: 'Servicio de carga M/N Cabo Froward', observaciones: '' },

  { id: 4, codigo: 'ASG26000004', registroCodigos: ['PRE26000014'], fecha: '04/09/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.gomez',
    precintos: ['A-10021', 'A-10022', 'A-10023'],
    cantidad: 3,
    motivo: 'Servicio de descarga M/N Bahía Azul', observaciones: '' },

  // A-10003 quedó marcado como scrap: es el mismo precinto que el Detalle/GRP
  // de esta Asignación (ver GENERAR_REGISTROS_PRECINTOS_DEMO, GRP26000045)
  // anota como "reemplazado por rotura" — ejemplo de un precinto dañado
  // reportado por el operador desde la app móvil.
  { id: 1, codigo: 'ASG26000001', registroCodigos: ['PRE26000013'], fecha: '16/08/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'j.gomez',
    precintos: ['A-10001', 'A-10002', 'A-10003', 'A-10004', 'A-10005', 'A-10006', 'A-10007', 'A-10008', 'A-10009', 'A-10010'],
    cantidad: 10,
    scrap: [{ precinto: 'A-10003', fecha: '18/08/2026', colaborador: 'j.gomez', motivo: 'Se rompió al momento de instalarlo; se reemplazó por otro de la misma asignación.' }],
    motivo: 'Servicio de descarga M/N Megara', observaciones: '' },

  { id: 2, codigo: 'ASG26000002', registroCodigos: ['PRE26000011'], fecha: '21/07/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'e.allccaco',
    precintos: ['A-09900', 'A-09901', 'A-09902'],
    cantidad: 3,
    motivo: 'Servicio de carga M/N Stena Impression', observaciones: 'Entrega parcial, saldo en almacén.' },

  { id: 3, codigo: 'ASG26000003', registroCodigos: ['PRE26000011'], fecha: '21/07/2026',
    entregadoPor: 's.echavarria', recibidoPor: 'r.bravo',
    precintos: ['A-09903', 'A-09904', 'A-09905'],
    cantidad: 3,
    motivo: 'Servicio de carga M/N Stena Impression', observaciones: 'Entrega parcial, saldo en almacén.' }
];
const ASIGNACIONES_PRECINTOS_DEMO = tgCargarCatalogo('precintosAsignacionesData', ASIGNACIONES_PRECINTOS_SEED);
[14, 15, 16, 17].forEach(id => {
  if (ASIGNACIONES_PRECINTOS_DEMO.some(a => a.id === id)) return;
  ASIGNACIONES_PRECINTOS_DEMO.push(JSON.parse(JSON.stringify(ASIGNACIONES_PRECINTOS_SEED.find(a => a.id === id))));
  tgGuardarCatalogo('precintosAsignacionesData', ASIGNACIONES_PRECINTOS_DEMO);
});

// Recarga de precintos para pruebas en el móvil (pedida de nuevo: los
// operadores de prueba ya consumieron el lote anterior, PRE26000019/
// ASG26000010-013, de tanto marcar Uso/Scrap) — mismo top-up que los
// bloques de arriba, pero con un lote y precintos NUEVOS (código/prefijo
// que nunca se usó antes en todo el seed) para que de verdad lleguen
// "disponibles" sin pisar nada ya creado a mano en el navegador. 5 cada
// uno para e.allccaco/r.bravo/j.gomez/j.torres, sin ningún Uso/Scrap
// reportado todavía.
if (!PRECINTOS_REGISTROS_DEMO.some(r => r.codigo === 'PRE26000095')) {
  PRECINTOS_REGISTROS_DEMO.push({
    codigo: 'PRE26000095', fecha: '13/10/2026', estado: 'Registrado', material: 'Plástico',
    ingresadoPor: 's.echavarria',
    precintos: ['P-95001', 'P-95002', 'P-95003', 'P-95004', 'P-95005', 'P-95006', 'P-95007', 'P-95008',
      'P-95009', 'P-95010', 'P-95011', 'P-95012', 'P-95013', 'P-95014', 'P-95015', 'P-95016',
      'P-95017', 'P-95018', 'P-95019', 'P-95020']
  });
  tgGuardarCatalogo('precintosRegistrosData', PRECINTOS_REGISTROS_DEMO);
}
[
  { id: 18, codigo: 'ASG26000018', recibidoPor: 'e.allccaco', motivo: 'Servicio de carga M/N Stena Polar', precintos: ['P-95001', 'P-95002', 'P-95003', 'P-95004', 'P-95005'] },
  { id: 19, codigo: 'ASG26000019', recibidoPor: 'r.bravo', motivo: 'Servicio de descarga M/N Costa Azul', precintos: ['P-95006', 'P-95007', 'P-95008', 'P-95009', 'P-95010'] },
  { id: 20, codigo: 'ASG26000020', recibidoPor: 'j.gomez', motivo: 'Servicio de descarga M/N Cordillera', precintos: ['P-95011', 'P-95012', 'P-95013', 'P-95014', 'P-95015'] },
  { id: 21, codigo: 'ASG26000021', recibidoPor: 'j.torres', motivo: 'Servicio de descarga M/N Naviera del Sur', precintos: ['P-95016', 'P-95017', 'P-95018', 'P-95019', 'P-95020'] }
].forEach(a => {
  if (ASIGNACIONES_PRECINTOS_DEMO.some(x => x.id === a.id)) return;
  ASIGNACIONES_PRECINTOS_DEMO.push({
    id: a.id, codigo: a.codigo, registroCodigos: ['PRE26000095'], fecha: '13/10/2026',
    entregadoPor: 's.echavarria', recibidoPor: a.recibidoPor,
    precintos: a.precintos, cantidad: a.precintos.length,
    motivo: a.motivo, observaciones: ''
  });
  tgGuardarCatalogo('precintosAsignacionesData', ASIGNACIONES_PRECINTOS_DEMO);
});

// Migración: navegadores que ya tenían "precintosAsignacionesData" guardado
// en localStorage de antes de que "scrap" pasara de ser un arreglo de
// códigos (['A-09951']) a un arreglo de objetos ({precinto, fecha,
// colaborador, motivo}) se quedan con el formato viejo cacheado —
// tgCargarCatalogo solo usa el seed nuevo si no hay nada guardado todavía.
// Sin esto, cualquier código que lea "scrap" como objeto (Reporte de
// Precintos, Asignación de Precintos) rompe apenas encuentra el string
// suelto.
ASIGNACIONES_PRECINTOS_DEMO.forEach(a => {
  if (a.scrap && a.scrap.length && typeof a.scrap[0] === 'string') {
    a.scrap = a.scrap.map(precinto => ({ precinto, fecha: a.fecha, colaborador: a.recibidoPor, motivo: '' }));
  }
});

// Migración: Asignaciones de antes de que se empezara a rastrear "rangos"
// (qué precintos se agregaron juntos con "Desde"+"Hasta" — ver
// asignarPrecintos/agruparPrecintosPorOrigen en asignacion-precintos.js) se
// quedan sin ese campo. Sin esto, el Detalle de una Asignación vieja (todo
// el seed, y cualquier dato ya guardado en el navegador de antes de este
// cambio) mostraría cada precinto en su propia línea aunque numéricamente
// formen una corrida consecutiva — se infiere un "rango" para cada corrida
// ya consecutiva de su lista de precintos (mismo criterio que antes se
// aplicaba siempre, dividirPorMaterialYCorrelatividad), así las Asignaciones
// existentes se siguen viendo agrupadas como un rango; las que se creen o
// editen de acá en adelante usan el rastreo real por origen.
ASIGNACIONES_PRECINTOS_DEMO.forEach(a => {
  if (!a.rangos) {
    a.rangos = dividirPorMaterialYCorrelatividad(a.precintos)
      .filter(g => g.cantidad > 1)
      .map(g => g.precintos);
  }
});

// Grilla de "Reporte de Precintos" (Precintos > Reporte de Precintos).
// Un Reporte de Precintos solo existe si su Asignación ya quedó registrada
// (ver asegurarReportePrecinto más abajo, disparada desde
// guardarAsignacionPrecintos en control-precintos.js) — por eso no hay acá
// una Asignación "suelta" sin ningún Detalle detrás; eso dejaría el código
// GRP y el supervisor de la grilla sin nada que mostrar.
const REPORTES_PRECINTOS_SEED = [
  { id: 13, asignacionId: 13, fechaInicio: '12/10/2026', fechaFin: '', estado: 'pendiente' },
  { id: 12, asignacionId: 12, fechaInicio: '12/10/2026', fechaFin: '', estado: 'pendiente' },
  { id: 11, asignacionId: 11, fechaInicio: '12/10/2026', fechaFin: '', estado: 'pendiente' },
  { id: 10, asignacionId: 10, fechaInicio: '12/10/2026', fechaFin: '', estado: 'pendiente' },
  { id: 90, asignacionId: 90, fechaInicio: '05/10/2026', fechaFin: '', estado: 'pendiente' },
  { id: 9, asignacionId: 9, fechaInicio: '02/10/2026', fechaFin: '', estado: 'pendiente' },
  { id: 8, asignacionId: 8, fechaInicio: '20/09/2026', fechaFin: '', estado: 'pendiente' },
  { id: 7, asignacionId: 7, fechaInicio: '16/09/2026', fechaFin: '', estado: 'pendiente' },
  { id: 6, asignacionId: 6, fechaInicio: '17/09/2026', fechaFin: '', estado: 'pendiente' },
  { id: 5, asignacionId: 5, fechaInicio: '10/09/2026', fechaFin: '', estado: 'pendiente' },
  { id: 4, asignacionId: 4, fechaInicio: '04/09/2026', fechaFin: '', estado: 'pendiente' },
  { id: 1, asignacionId: 1, fechaInicio: '16/08/2026', fechaFin: '', estado: 'pendiente' },
  { id: 2, asignacionId: 2, fechaInicio: '21/07/2026', fechaFin: '25/07/2026', estado: 'finalizado' },
  { id: 3, asignacionId: 3, fechaInicio: '21/07/2026', fechaFin: '25/07/2026', estado: 'finalizado' }
];
const REPORTES_PRECINTOS_DEMO = tgCargarCatalogo('precintosReportesData', REPORTES_PRECINTOS_SEED);

// "Generar Registro de Precintos" (Detalle): registros de uso de precintos
// por Asignación, uno por operario (campo "colaborador" — el que realmente
// usó/cerró ese precinto, no una pareja fija), cargados desde la app móvil
// (Sprint 4 retiró el formulario web "Agregar uso de precinto" — ver
// asegurarReportePrecinto, que sigue creando el registro vacío cuando hace
// falta). Cada Asignación (ver ASIGNACIONES_PRECINTOS_DEMO) genera un único
// Detalle propio — relación 1 a 1 (campo "asignacionId") — aunque comparta
// alguno de los "registroCodigos" de los lotes de origen (un Detalle puede
// tener precintos de más de un lote, si la Asignación mezcló varios).
// "numero" (código GRP) es el identificador único de cada Detalle. "estado"
// y "fechaFin" quedan en el dato por compatibilidad, pero ya no los lee
// ningún cálculo: el estado Finalizado/En proceso/Registrado de la
// Asignación se deriva de usados+scrap (ver calcularEstadoAsignacion).
const GENERAR_REGISTROS_PRECINTOS_SEED = [
  // Caso de prueba "reporte por material" — ver ASG26000090. Mismo viaje/
  // terminal/operación que OP-2026-052 en el móvil, igual que si r.bravo lo
  // hubiera reportado desde ahí.
  { registroCodigos: ['PRE26000090', 'PRE26000091', 'PRE26000092'], numero: 'GRP26000090', fechaEmision: '05/10/2026',
    fechaInicio: '05/10/2026', fechaFin: '', asignacionId: 90, estado: 'Pendiente',
    detalle: [
      { colaborador: 'r.bravo', precinto: 'H-80001', viaje: 'V-2214', fecha: '05/10/2026', observacion: '', tipoOperacion: 'Descarga', terminal: 'Supe' },
      { colaborador: 'r.bravo', precinto: 'H-80002', viaje: 'V-2214', fecha: '05/10/2026', observacion: '', tipoOperacion: 'Descarga', terminal: 'Supe' },
      { colaborador: 'r.bravo', precinto: 'H-80003', viaje: 'V-2214', fecha: '05/10/2026', observacion: '', tipoOperacion: 'Descarga', terminal: 'Supe' },
      { colaborador: 'r.bravo', precinto: 'F-60001', viaje: 'V-2214', fecha: '05/10/2026', observacion: 'Contenedor refrigerado', tipoOperacion: 'Descarga', terminal: 'Supe' },
      { colaborador: 'r.bravo', precinto: 'F-60002', viaje: 'V-2214', fecha: '06/10/2026', observacion: '', tipoOperacion: 'Descarga', terminal: 'Supe' },
      { colaborador: 'r.bravo', precinto: 'G-70001', viaje: 'V-2214', fecha: '06/10/2026', observacion: 'Válvula de descarga', tipoOperacion: 'Descarga', terminal: 'Supe' }
    ] },

  // Caso de prueba móvil→web del mes en curso — ver notas en
  // PRECINTOS_REGISTROS_SEED (PRE26000018) y ASIGNACIONES_PRECINTOS_SEED
  // (ASG26000009). E-50001 a E-50004 se reportaron juntos en el mismo viaje
  // (consecutivos → agrupan en "E-50001 al E-50004 (4)" en Reporte de
  // Precintos); E-50007 es del MISMO viaje/fecha/terminal pero no es
  // consecutivo con el anterior (falta E-50005/E-50006, que quedan sin
  // reportar) → debe salir en su propia línea, no junto a los otros 4;
  // E-50008 es de un viaje distinto, ese mismo día.
  { registroCodigos: ['PRE26000018'], numero: 'GRP26000051', fechaEmision: '03/10/2026',
    fechaInicio: '02/10/2026', fechaFin: '', asignacionId: 9, estado: 'Pendiente',
    detalle: [
      { colaborador: 'j.gomez', precinto: 'E-50001', viaje: 'V-2401', fecha: '03/10/2026', observacion: '', tipoOperacion: 'Descarga / M/N Cordillera', terminal: 'Terminal Norte' },
      { colaborador: 'j.gomez', precinto: 'E-50002', viaje: 'V-2401', fecha: '03/10/2026', observacion: '', tipoOperacion: 'Descarga / M/N Cordillera', terminal: 'Terminal Norte' },
      { colaborador: 'j.gomez', precinto: 'E-50003', viaje: 'V-2401', fecha: '03/10/2026', observacion: '', tipoOperacion: 'Descarga / M/N Cordillera', terminal: 'Terminal Norte' },
      { colaborador: 'j.gomez', precinto: 'E-50004', viaje: 'V-2401', fecha: '03/10/2026', observacion: '', tipoOperacion: 'Descarga / M/N Cordillera', terminal: 'Terminal Norte' },
      { colaborador: 'j.gomez', precinto: 'E-50007', viaje: 'V-2401', fecha: '03/10/2026', observacion: 'Corte en la numeración: reportado aparte del rango E-50001 al E-50004', tipoOperacion: 'Descarga / M/N Cordillera', terminal: 'Terminal Norte' },
      { colaborador: 'j.gomez', precinto: 'E-50008', viaje: 'V-2402', fecha: '03/10/2026', observacion: '', tipoOperacion: 'Descarga / M/N Cordillera', terminal: 'Terminal Sur' }
    ] },

  // A-09952 se reportó recién este mes (mismo viaje que su operación móvil
  // OP-2026-074) — para que j.torres también aparezca en Reporte de
  // Precintos con el filtro de fecha por defecto (mes en curso), igual que
  // los otros 3 operadores de prueba.
  { registroCodigos: ['PRE26000012'], numero: 'GRP26000050', fechaEmision: '20/09/2026',
    fechaInicio: '20/09/2026', fechaFin: '', asignacionId: 8, estado: 'Pendiente',
    detalle: [
      { colaborador: 'j.torres', precinto: 'A-09952', viaje: 'V-2287', fecha: '04/10/2026', observacion: '', tipoOperacion: 'Descarga', terminal: 'Terminal Norte' }
    ] },

  { registroCodigos: ['PRE26000016', 'PRE26000017'], numero: 'GRP26000049', fechaEmision: '17/09/2026',
    fechaInicio: '16/09/2026', fechaFin: '', asignacionId: 7, estado: 'Pendiente',
    detalle: [] },

  // Ejemplo con dos precintos ya reportados (de los 5 entregados) para
  // mostrar más detalle al abrir "Ver Detalle/GRP" — el resto queda "Sin
  // reportar" en el aviso de completitud. B-20007 se agregó este mes para
  // que r.bravo también aparezca en Reporte de Precintos con el filtro de
  // fecha por defecto (mes en curso).
  { registroCodigos: ['PRE26000014', 'PRE26000015'], numero: 'GRP26000048', fechaEmision: '18/09/2026',
    fechaInicio: '17/09/2026', fechaFin: '', asignacionId: 6, estado: 'Pendiente',
    detalle: [
      { colaborador: 'r.bravo', precinto: 'A-10024', viaje: 'V-2318', fecha: '18/09/2026', observacion: '', tipoOperacion: 'Descarga / M/N Puelche', terminal: 'Terminal Norte' },
      { colaborador: 'r.bravo', precinto: 'B-20006', viaje: 'V-2318', fecha: '18/09/2026', observacion: '', tipoOperacion: 'Descarga / M/N Puelche', terminal: 'Terminal Norte' },
      { colaborador: 'r.bravo', precinto: 'B-20007', viaje: 'V-2318', fecha: '04/10/2026', observacion: '', tipoOperacion: 'Descarga / M/N Puelche', terminal: 'Terminal Norte' }
    ] },

  // Ejemplo con tres precintos reportados (de los 5 entregados), uno con
  // observación — más detalle para "Ver Detalle/GRP".
  { registroCodigos: ['PRE26000015'], numero: 'GRP26000047', fechaEmision: '11/09/2026',
    fechaInicio: '10/09/2026', fechaFin: '', asignacionId: 5, estado: 'Pendiente',
    detalle: [
      { colaborador: 'e.allccaco', precinto: 'B-20001', viaje: 'V-2305', fecha: '11/09/2026', observacion: '', tipoOperacion: 'Carga / M/N Cabo Froward', terminal: 'Terminal Sur' },
      { colaborador: 'e.allccaco', precinto: 'B-20002', viaje: 'V-2305', fecha: '11/09/2026', observacion: '', tipoOperacion: 'Carga / M/N Cabo Froward', terminal: 'Terminal Sur' },
      { colaborador: 'e.allccaco', precinto: 'B-20003', viaje: 'V-2306', fecha: '12/09/2026', observacion: 'Contenedor con retraso en muelle', tipoOperacion: 'Carga / M/N Cabo Froward', terminal: 'Terminal Sur' }
    ] },

  // Ejemplo de asignación de septiembre con uso parcial: de los 3 precintos
  // entregados, el operador reportó 2 como usados — el resto queda en su
  // stock a la espera de la operación en la que decida usarlo (no todo lo
  // asignado se consume en el mismo mes).
  { registroCodigos: ['PRE26000014'], numero: 'GRP26000046', fechaEmision: '05/09/2026',
    fechaInicio: '04/09/2026', fechaFin: '', asignacionId: 4, estado: 'Pendiente',
    detalle: [
      { colaborador: 'j.gomez', precinto: 'A-10021', viaje: 'V-2310', fecha: '09/09/2026', observacion: '', tipoOperacion: 'Descarga / M/N Bahía Azul', terminal: 'Terminal Norte' },
      { colaborador: 'j.gomez', precinto: 'A-10022', viaje: 'V-2311', fecha: '10/09/2026', observacion: '', tipoOperacion: 'Descarga / M/N Bahía Azul', terminal: 'Terminal Norte' }
    ] },

  { registroCodigos: ['PRE26000013'], numero: 'GRP26000045', fechaEmision: '17/08/2026',
    fechaInicio: '16/08/2026', fechaFin: '', asignacionId: 1, estado: 'Pendiente',
    detalle: [
      { colaborador: 'j.gomez', precinto: 'A-10001', viaje: 'V-2201', fecha: '16/08/2026', observacion: '', tipoOperacion: 'Descarga / M/N Megara', terminal: 'Terminal Norte' },
      { colaborador: 'j.gomez', precinto: 'A-10002', viaje: 'V-2201', fecha: '16/08/2026', observacion: '', tipoOperacion: 'Descarga / M/N Megara', terminal: 'Terminal Norte' },
      { colaborador: 'j.gomez', precinto: 'A-10003', viaje: 'V-2202', fecha: '17/08/2026', observacion: 'Precinto reemplazado por rotura', tipoOperacion: 'Descarga / M/N Megara', terminal: 'Terminal Norte' }
    ] },

  { registroCodigos: ['PRE26000011'], numero: 'GRP26000038', fechaEmision: '26/07/2026',
    fechaInicio: '21/07/2026', fechaFin: '25/07/2026', asignacionId: 2, estado: 'Finalizado',
    // A-09902 quedó en esta Asignación (ver ASIGNACIONES_PRECINTOS_DEMO id 2)
    // pero nunca se reportó como usado — se deja así a propósito: es el caso
    // real de "Precintos sin reportar" (reporte-precintos.js), un precinto
    // entregado que nunca se reportó como usado ni scrap.
    detalle: [
      { colaborador: 'e.allccaco', precinto: 'A-09900', viaje: 'V-2150', fecha: '21/07/2026', observacion: '', tipoOperacion: 'Carga / M/N Stena Impression', terminal: 'Terminal Sur' },
      { colaborador: 'e.allccaco', precinto: 'A-09901', viaje: 'V-2150', fecha: '22/07/2026', observacion: '', tipoOperacion: 'Carga / M/N Stena Impression', terminal: 'Terminal Sur' }
    ] },

  // Otra Asignación del mismo lote de origen (PRE26000011) pero para otro
  // receptor: demuestra que cada Asignación conserva su propio Detalle, con
  // sus propios colaboradores y precintos utilizados.
  { registroCodigos: ['PRE26000011'], numero: 'GRP26000039', fechaEmision: '26/07/2026',
    fechaInicio: '21/07/2026', fechaFin: '25/07/2026', asignacionId: 3, estado: 'Finalizado',
    detalle: [
      { colaborador: 'r.bravo', precinto: 'A-09903', viaje: 'V-2151', fecha: '23/07/2026', observacion: '', tipoOperacion: 'Carga / M/N Stena Impression', terminal: 'Terminal Sur' }
    ] }
];
const GENERAR_REGISTROS_PRECINTOS_DEMO = tgCargarCatalogo('precintosGenerarRegistrosData', GENERAR_REGISTROS_PRECINTOS_SEED);

// Migración GENÉRICA: tgCargarCatalogo solo usa el seed nuevo si no hay
// nada guardado todavía en localStorage — cualquier navegador que ya haya
// abierto antes alguna página de Precintos se queda con las 4 estructuras
// viejas cacheadas y nunca ve nada agregado al seed después (nuevos lotes,
// Asignaciones u operadores de prueba, como el caso móvil→web de octubre
// 2026 o los operadores agregados más tarde). En vez de parchar a mano cada
// registro puntual (lo que se quedaba desactualizado cada vez que se sumaba
// uno nuevo — fue exactamente lo que le pasó a un operador que dejó de
// aparecer en Reporte de Precintos), se compara CADA seed contra lo
// cacheado por su clave única y se inyecta lo que falte, sin tocar nada que
// el usuario ya haya creado/editado en su propia sesión.
function inyectarSeedFaltante(demo, seed, clave) {
  const faltantes = seed.filter(item => !demo.some(x => x[clave] === item[clave]));
  if (faltantes.length) demo.unshift(...faltantes);
}
inyectarSeedFaltante(PRECINTOS_REGISTROS_DEMO, PRECINTOS_REGISTROS_SEED, 'codigo');
inyectarSeedFaltante(ASIGNACIONES_PRECINTOS_DEMO, ASIGNACIONES_PRECINTOS_SEED, 'codigo');
inyectarSeedFaltante(REPORTES_PRECINTOS_DEMO, REPORTES_PRECINTOS_SEED, 'asignacionId');
inyectarSeedFaltante(GENERAR_REGISTROS_PRECINTOS_DEMO, GENERAR_REGISTROS_PRECINTOS_SEED, 'numero');

// Parches puntuales sobre registros que YA existían cacheados — la
// migración genérica de arriba solo agrega registros NUEVOS por clave; un
// GRP o una Asignación que ya estaba cacheada no se vuelve a tocar aunque
// el seed le haya sumado un detalle/scrap nuevo (caso de j.torres, r.bravo
// y e.allccaco con actividad de octubre, para que los 4 operadores de
// prueba aparezcan en Reporte de Precintos con el filtro por defecto). Solo
// agrega si falta, nunca pisa lo que el usuario ya haya reportado.
const grpTorres = GENERAR_REGISTROS_PRECINTOS_DEMO.find(r => r.numero === 'GRP26000050');
if (grpTorres && !grpTorres.detalle.some(d => d.precinto === 'A-09952')) {
  grpTorres.detalle.push({ colaborador: 'j.torres', precinto: 'A-09952', viaje: 'V-2287', fecha: '04/10/2026', observacion: '', tipoOperacion: 'Descarga', terminal: 'Terminal Norte' });
}
const grpBravo = GENERAR_REGISTROS_PRECINTOS_DEMO.find(r => r.numero === 'GRP26000048');
if (grpBravo && !grpBravo.detalle.some(d => d.precinto === 'B-20007')) {
  grpBravo.detalle.push({ colaborador: 'r.bravo', precinto: 'B-20007', viaje: 'V-2318', fecha: '04/10/2026', observacion: '', tipoOperacion: 'Descarga / M/N Puelche', terminal: 'Terminal Norte' });
}
const asigAllccaco = ASIGNACIONES_PRECINTOS_DEMO.find(a => a.codigo === 'ASG26000005');
if (asigAllccaco) {
  if (!asigAllccaco.scrap) asigAllccaco.scrap = [];
  if (!asigAllccaco.scrap.some(s => s.precinto === 'B-20004')) {
    asigAllccaco.scrap.push({ precinto: 'B-20004', fecha: '04/10/2026', colaborador: 'e.allccaco', motivo: 'Cuerpo dañado por humedad durante el transporte.' });
  }
}

guardarEstadoPrecintos();

// Persiste las 4 estructuras del módulo en localStorage (mismo mecanismo que
// tgCargarCatalogo/tgGuardarCatalogo ya usa el resto del sistema para sus
// mantenedores). Sin esto, cada página (Control / Asignación / Reporte de
// Precintos) arranca su propio script de datos desde cero al navegar entre
// ellas — lo que se registraba en una quedaba solo en memoria de esa página
// y desaparecía al entrar a la siguiente. Se llama explícitamente al final
// de cada acción que guarda/edita/elimina algo (ver guardarRegistroPrecinto,
// guardarAsignacionPrecintos, eliminarAsignacion), y además una vez más al
// salir de la página (beforeunload) como red de seguridad.
function guardarEstadoPrecintos() {
  tgGuardarCatalogo('precintosRegistrosData', PRECINTOS_REGISTROS_DEMO);
  tgGuardarCatalogo('precintosAsignacionesData', ASIGNACIONES_PRECINTOS_DEMO);
  tgGuardarCatalogo('precintosReportesData', REPORTES_PRECINTOS_DEMO);
  tgGuardarCatalogo('precintosGenerarRegistrosData', GENERAR_REGISTROS_PRECINTOS_DEMO);
}

window.addEventListener('beforeunload', guardarEstadoPrecintos);

function obtenerAsignacionPorId(id) {
  return ASIGNACIONES_PRECINTOS_DEMO.find(a => a.id === id);
}

// Asignación a la que pertenece un precinto puntual — los códigos de
// precinto son únicos entre asignaciones, así que alcanza con buscar en cuál
// aparece. La usa operaciones-movil.js para saber en qué Detalle/GRP debe
// quedar cada precinto que el operador marca como usado.
function obtenerAsignacionDePrecinto(precinto) {
  return ASIGNACIONES_PRECINTOS_DEMO.find(a => a.precintos.includes(precinto));
}

// Motivo registrado al marcar un precinto como scrap — única fuente
// (asignacion.scrap[]) para que no se pierda al pasar por distintas
// pantallas (ficha del precinto, cartola del Reporte, descarga PDF/Excel,
// detalle de Asignación, historial de Control), Sprint 4 "reporte usado/
// scrap + motivo".
function obtenerMotivoScrap(codigoPrecinto) {
  const asignacion = obtenerAsignacionDePrecinto(codigoPrecinto);
  const registro = asignacion?.scrap?.find(s => s.precinto === codigoPrecinto);
  return registro?.motivo || null;
}

// Para un grupo/rango de precintos (ya agrupados por material y
// correlatividad, ver dividirPorMaterialYCorrelatividad) arma el texto de
// los motivos de scrap únicos presentes — para tooltips donde se muestra un
// rango completo en vez de un precinto puntual (Asignación, Control).
function textoMotivosScrap(precintos) {
  const motivos = [...new Set(precintos.map(obtenerMotivoScrap).filter(Boolean))];
  return motivos.length ? motivos.join(' / ') : null;
}

function obtenerRegistroPrecintoPorCodigo(codigo) {
  return PRECINTOS_REGISTROS_DEMO.find(r => r.codigo === codigo);
}

// Lote (Registro de Precintos) al que pertenece un precinto puntual — los
// códigos de precinto son únicos entre lotes, así que alcanza con buscar en
// cuál lote aparece. Es la base para saber de qué lote vino cada precinto
// dentro de una Asignación que ahora puede mezclar varios lotes.
function obtenerLoteDePrecinto(precinto) {
  return PRECINTOS_REGISTROS_DEMO.find(r => r.precintos.includes(precinto));
}

// Arma una lista secuencial de precintos entre "desde" y "hasta" conservando
// el prefijo y el relleno de ceros del valor "desde" (ej. A-10021 → A-10030
// genera A-10021, A-10022, ..., A-10030). Compartida por Registro
// (control-precintos.js) y Asignación (asignacion-precintos.js).
function generarRangoPrecintos(desde, hasta) {
  const matchDesde = String(desde).match(/^(.*?)(\d+)\s*$/);
  const matchHasta = String(hasta).match(/(\d+)\s*$/);
  if (!matchDesde || !matchHasta) return null;

  const prefijo = matchDesde[1];
  const ancho = matchDesde[2].length;
  const nDesde = parseInt(matchDesde[2], 10);
  const nHasta = parseInt(matchHasta[1], 10);
  if (isNaN(nDesde) || isNaN(nHasta) || nHasta < nDesde) return null;

  const lista = [];
  for (let n = nDesde; n <= nHasta; n++) {
    lista.push(`${prefijo}${String(n).padStart(ancho, '0')}`);
  }
  return lista;
}

// Precintos del lote que ya fueron asignados en alguna Asignación (a
// cualquier receptor), para no ofrecerlos de nuevo al crear una nueva. Al
// editar una Asignación existente se excluye su propio id, porque sus
// precintos siguen siendo "suyos" mientras se edita (si no, desaparecerían
// de las opciones disponibles). Usada por Control de Precintos (bloquear
// precintos ya asignados al editar un Registro) y por Asignación de
// Precintos (armar el pool de precintos disponibles de un lote).
function obtenerPrecintosAsignadosDeLote(codigo, excluirId = null) {
  const asignados = new Set();
  ASIGNACIONES_PRECINTOS_DEMO
    .filter(a => a.registroCodigos.includes(codigo) && a.id !== excluirId)
    .forEach(a => a.precintos.forEach(p => asignados.add(p)));
  return asignados;
}

// Precintos del lote (Registro de Precintos) que todavía no fueron
// asignados a nadie, ordenados de menor a mayor numeración. Una Asignación
// solo puede repartir precintos que ya existan en ese lote — no crea
// precintos nuevos ni permite escribir cualquier código a mano.
function obtenerPrecintosDisponiblesDeLote(codigo, excluirId = null) {
  const registro = obtenerRegistroPrecintoPorCodigo(codigo);
  if (!registro) return [];
  const asignados = obtenerPrecintosAsignadosDeLote(codigo, excluirId);
  return registro.precintos
    .filter(p => !asignados.has(p))
    .sort((a, b) => numeroDePrecinto(a) - numeroDePrecinto(b));
}

// Estado del lote: se calcula a partir de sus asignaciones, sin depender de
// ningún botón "Finalizar" manual (Sprint 4). "Anulado" queda como valor
// posible del dato (ningún flujo de UI actual lo pone, pero Asignación de
// Precintos lo sigue rechazando si el supervisor teclea un precinto de un
// lote anulado — ver asignarPrecintos en asignacion-precintos.js).
// "Finalizado" se deriva: TODAS las Asignaciones que tocan este lote deben
// estar Finalizadas (usados + scrap = asignado en cada una, ver
// calcularEstadoAsignacion) — mismo criterio que antes ponía el botón
// manual, ahora recalculado en el momento.
function calcularEstadoLote(codigo) {
  const registro = obtenerRegistroPrecintoPorCodigo(codigo);
  if (!registro) return null;
  if (registro.estado === 'Anulado') return registro.estado;

  const asignacionesDelLote = ASIGNACIONES_PRECINTOS_DEMO.filter(a => a.registroCodigos.includes(codigo));
  if (!asignacionesDelLote.length) return 'Registrado';

  if (asignacionesDelLote.every(a => calcularEstadoAsignacion(a.id) === 'Finalizado')) return 'Finalizado';

  return obtenerPrecintosDisponiblesDeLote(codigo).length > 0 ? 'Parcialmente asignado' : 'Asignado';
}

// Vista agregada de "Control de Precintos": una fila por material con el
// total y el disponible sumados de todos sus lotes — la grilla no muestra un
// lote por fila, sino el almacén consolidado (ver renderTablaControlPrecintos
// en control-precintos.js). El módulo solo registra ingresos, así que "Fecha
// de Registro" es el lote más antiguo de ese material (cuándo se empezó a
// llevar) y "Última Actualización" el más reciente (el último ingreso que
// le sumó stock); "Ingresado por" es quién hizo ese último ingreso.
function obtenerMaterialesControlPrecintos() {
  const porMaterial = {};
  PRECINTOS_REGISTROS_DEMO.forEach(lote => {
    if (!porMaterial[lote.material]) {
      porMaterial[lote.material] = {
        material: lote.material, fecha: lote.fecha, fechaUltimaActualizacion: lote.fecha,
        ingresadoPor: lote.ingresadoPor, total: 0, disponible: 0
      };
    }
    const grupo = porMaterial[lote.material];
    grupo.total += lote.precintos.length;
    grupo.disponible += obtenerPrecintosDisponiblesDeLote(lote.codigo).length;
    if (fechaDDMMYYYYaISO(lote.fecha) < fechaDDMMYYYYaISO(grupo.fecha)) grupo.fecha = lote.fecha;
    if (fechaDDMMYYYYaISO(lote.fecha) > fechaDDMMYYYYaISO(grupo.fechaUltimaActualizacion)) {
      grupo.fechaUltimaActualizacion = lote.fecha;
      grupo.ingresadoPor = lote.ingresadoPor;
    }
  });
  return Object.values(porMaterial).sort((a, b) => fechaDDMMYYYYaISO(b.fechaUltimaActualizacion).localeCompare(fechaDDMMYYYYaISO(a.fechaUltimaActualizacion)));
}

// Consolida cada precinto de todos los lotes con su estado real —
// "disponible" (en el lote, sin ninguna Asignación todavía — "Por asignar"
// en Reporte de Precintos), "asignado" (entregado a alguien pero aún sin
// reportarse como usado), "usado" (ya aparece en el Detalle/GRP de alguna
// Asignación) o "scrap" (el operador lo reportó dañado — ver
// ASIGNACIONES_PRECINTOS_DEMO.scrap; manda sobre "usado" si el mismo
// precinto quedó reportado en ambos) — junto con el detalle de esa
// asignación/uso. Es la base de Reporte de Precintos > Por Precinto: tanto
// para consultar dónde/quién usó un precinto puntual como para listar los
// que quedaron sueltos sin reportar.
function obtenerTodosLosPrecintosConEstado() {
  return PRECINTOS_REGISTROS_DEMO.flatMap(lote => lote.precintos.map(precinto => {
    const asignacion = ASIGNACIONES_PRECINTOS_DEMO.find(a => a.precintos.includes(precinto));
    let detalleGrp = null, uso = null, scrapDetalle = null;
    if (asignacion) {
      // Cada Asignación tiene su propio Detalle/GRP (relación 1 a 1).
      detalleGrp = GENERAR_REGISTROS_PRECINTOS_DEMO.find(r => r.asignacionId === asignacion.id);
      if (detalleGrp) uso = detalleGrp.detalle.find(d => d.precinto === precinto);
      scrapDetalle = asignacion.scrap?.find(s => s.precinto === precinto) || null;
    }
    const estado = scrapDetalle ? 'scrap' : uso ? 'usado' : (asignacion ? 'asignado' : 'disponible');
    return { precinto, registroCodigo: lote.codigo, material: lote.material, asignacion, detalleGrp, uso, scrapDetalle, estado };
  }));
}

// Texto/badge del estado de un precinto puntual — compartido por Reporte de
// Precintos (ledger, ficha puntual) y Control de Precintos (detalle de
// material, ajuste §3), para no repetir el mismo mapa en cada archivo.
const ESTADO_PRECINTO_TEXTO = {
  disponible: 'Por asignar',
  asignado: 'Asignado',
  usado: 'Usado',
  scrap: 'Scrap'
};
const ESTADO_PRECINTO_BADGE = {
  disponible: 'badge-gris',
  asignado: 'badge-por-vencer',
  usado: 'badge-vigente',
  scrap: 'badge-inactivo'
};

// Fuente ÚNICA de Asignado/Usado/Scrap/Queda de un operador (Sprint 4,
// ajuste §1): antes "stock"/"queda" se calculaba en más de un lugar como
// `asignado - usado`, sin restar scrap — con 10 asignados, 3 usados y 2
// scrap mostraba "quedan 7" en vez de 5. Acá "estado" de cada precinto
// (asignado/usado/scrap, ya resuelto por obtenerTodosLosPrecintosConEstado)
// es la fuente de verdad: Queda = Asignado - Usado - Scrap, nunca negativo.
// La usan la grilla, la cartola, la descarga y "Mis precintos" del móvil —
// KPIs y "Sin reportar" ya contaban directo estado==='asignado', que es
// exactamente lo mismo que "Queda" a nivel de precinto, así que no hace
// falta que pasen por acá.
// "filtros" (opcional): { material, desde, hasta } — sin filtros, es el
// histórico completo del operador. La fecha de referencia de cada precinto
// es la de su evento más reciente: uso o scrap si ya se reportó, o la
// fecha de su propia Asignación (entrega) si sigue pendiente.
// Sprint 4, ajuste de consistencia: "Asignado" y "Queda" son saldos
// ACUMULADOS (hasta la fecha "hasta"), nunca acotados por "desde" — si se
// filtraran también por "desde", un operador sin movimientos dentro del
// rango (p.ej. asignado el mes pasado, sin nada reportado todavía)
// desaparecía de la grilla por completo, aunque sí tenga saldo real. Las
// cifras "Usado"/"Scrap" que se muestran SÍ son del período [desde, hasta]
// (para ver la actividad reciente), pero el saldo (Queda) se calcula con
// usado/scrap ACUMULADOS a "hasta", sin importar "desde" — por eso son dos
// cálculos distintos aunque compartan los mismos datos de origen.
// - Asignado: precintos con fecha de asignación ≤ hasta (todos si no hay hasta).
// - Usado/Scrap (los que se muestran): dentro de [desde, hasta].
// - Queda = Asignado(≤hasta) − Usado(≤hasta) − Scrap(≤hasta), nunca negativo.
// Sin fechas, las 4 cifras son el histórico completo del operador.
function calcularSaldoOperador(usuario, filtros = {}) {
  const { material, desde, hasta } = filtros;

  const precintosDelOperador = obtenerTodosLosPrecintosConEstado()
    .filter(f => f.asignacion && f.asignacion.recibidoPor === usuario)
    .filter(f => !material || f.material === material);

  const totalAsignado = precintosDelOperador.filter(f => {
    if (!hasta) return true;
    return fechaDDMMYYYYaISO(f.asignacion.fecha) <= hasta;
  }).length;

  const dentroDelPeriodo = fechaStr => {
    const fechaISO = fechaDDMMYYYYaISO(fechaStr);
    if (desde && fechaISO < desde) return false;
    if (hasta && fechaISO > hasta) return false;
    return true;
  };
  const hastaSolamente = fechaStr => !hasta || fechaDDMMYYYYaISO(fechaStr) <= hasta;

  const usados = precintosDelOperador.filter(f => f.estado === 'usado');
  const scrap = precintosDelOperador.filter(f => f.estado === 'scrap');

  const totalUsado = usados.filter(f => dentroDelPeriodo(f.uso.fecha)).length;
  const totalScrap = scrap.filter(f => dentroDelPeriodo(f.scrapDetalle.fecha)).length;
  const usadoAcumulado = usados.filter(f => hastaSolamente(f.uso.fecha)).length;
  const scrapAcumulado = scrap.filter(f => hastaSolamente(f.scrapDetalle.fecha)).length;

  return { totalAsignado, totalUsado, totalScrap, queda: Math.max(0, totalAsignado - usadoAcumulado - scrapAcumulado) };
}

// Última vez que se descargó el Registro de Control de un operador (Sprint
// 4, cierre §A.1) — los operadores no entran a la web, así que esto es para
// los SUPERVISORES: cuándo, quién y de qué rango fue la última descarga de
// cada uno, para no repetir ni dejar períodos sin descargar. Una descarga
// por Material o Rango de fecha puede incluir a varios operadores a la vez:
// se registra para cada uno con el MISMO rango (ver descargarRegistroControlPDF
// en reporte-precintos.js), no solo cuando se descarga por Operador. Solo
// se guarda la última (no un historial), pero la forma del objeto ya
// alcanza para agregar un arreglo "historial" más adelante si hiciera falta.
const ULTIMA_DESCARGA_CONTROL_DEMO = tgCargarCatalogo('ultimaDescargaControlPrecintosData', {});

// Migración: la versión anterior guardaba solo un string ISO (momento de la
// descarga) por operador — se envuelve en la forma nueva sin perder el
// dato, con el resto de campos (quién, qué rango, qué modo) en null porque
// esa versión no los tenía.
Object.keys(ULTIMA_DESCARGA_CONTROL_DEMO).forEach(usuario => {
  if (typeof ULTIMA_DESCARGA_CONTROL_DEMO[usuario] === 'string') {
    ULTIMA_DESCARGA_CONTROL_DEMO[usuario] = {
      fecha: ULTIMA_DESCARGA_CONTROL_DEMO[usuario], por: null, desde: null, hasta: null, modo: null, material: null, formato: null
    };
  }
});

// "opciones": { por, desde, hasta, modo, material, formato } — desde/hasta
// son los mismos valores crudos de los <input type="date"> (YYYY-MM-DD) que
// ya arma prepararDescarga/descargarRegistroControl, null si no se usaron.
function registrarUltimaDescargaControl(usuario, opciones = {}) {
  ULTIMA_DESCARGA_CONTROL_DEMO[usuario] = {
    fecha: new Date().toISOString(),
    por: opciones.por || null,
    desde: opciones.desde || null,
    hasta: opciones.hasta || null,
    modo: opciones.modo || null,
    material: opciones.material || null,
    formato: opciones.formato || null
  };
  tgGuardarCatalogo('ultimaDescargaControlPrecintosData', ULTIMA_DESCARGA_CONTROL_DEMO);
}

function obtenerUltimaDescargaControl(usuario) {
  return ULTIMA_DESCARGA_CONTROL_DEMO[usuario] || null;
}

// "Rango registrado = el que se usó realmente en esa descarga" — si no se
// eligieron fechas (por Operador o por Material sin rango), el período es
// todo el historial; si solo se eligió una punta, se nombra esa sola.
function textoPeriodoDescargaControl(registro) {
  if (registro.desde && registro.hasta) return `${fechaISOaDDMMYYYY(registro.desde)} – ${fechaISOaDDMMYYYY(registro.hasta)}`;
  if (registro.hasta) return `Hasta ${fechaISOaDDMMYYYY(registro.hasta)}`;
  if (registro.desde) return `Desde ${fechaISOaDDMMYYYY(registro.desde)}`;
  return 'Todo el historial';
}

// Precintos usados/scrap de un operador con fecha POSTERIOR a su última
// descarga (al "hasta" de esa descarga, o a la fecha de la descarga misma
// si fue "todo el historial" sin hasta) — el badge "N nuevos" de la grilla.
// Si nunca se descargó, cuenta todo lo que tenga usado/scrap.
function contarMovimientosNuevosControl(usuario) {
  const registro = obtenerUltimaDescargaControl(usuario);
  const comparar = registro ? (registro.hasta || registro.fecha.slice(0, 10)) : null;

  return obtenerTodosLosPrecintosConEstado()
    .filter(f => f.asignacion && f.asignacion.recibidoPor === usuario)
    .filter(f => f.estado === 'usado' || f.estado === 'scrap')
    .filter(f => {
      if (!comparar) return true;
      const fechaEvento = f.estado === 'scrap' ? f.scrapDetalle.fecha : f.uso.fecha;
      return fechaDDMMYYYYaISO(fechaEvento) > comparar;
    }).length;
}

// Detalle "Generar Registro" por código de lote (Control de Precintos > Ver
// etiquetas): si el lote tiene más de una Asignación, devuelve la primera;
// para abrir el Detalle exacto de una Asignación puntual usar
// obtenerGenerarRegistroPorAsignacion.
function obtenerGenerarRegistroPorCodigo(codigo) {
  return GENERAR_REGISTROS_PRECINTOS_DEMO.find(r => r.registroCodigos.includes(codigo));
}

// Detalle "Generar Registro" por Asignación (Reporte de Precintos > Ver):
// identifica sin ambigüedad el Detalle correspondiente, incluso si su lote de
// origen tiene más de una Asignación.
function obtenerGenerarRegistroPorAsignacion(asignacionId) {
  return GENERAR_REGISTROS_PRECINTOS_DEMO.find(r => r.asignacionId === asignacionId);
}

// Estado de la Asignación: igual que calcularEstadoLote con los lotes, no es
// un campo que se guarde ni se elija a mano — se deriva 100% de lo ya
// reportado (uso + scrap), sin depender de ningún botón "Finalizar" manual
// (Sprint 4 retiró ese flujo, ver generar-registro-precintos.js histórico).
// "Registrado": nada reportado todavía. "En proceso": algo reportado, pero
// falta. "Finalizado": usados + scrap = cantidad asignada.
function calcularEstadoAsignacion(idAsignacion) {
  const asignacion = obtenerAsignacionPorId(idAsignacion);
  if (!asignacion) return null;
  const detalleGrp = obtenerGenerarRegistroPorAsignacion(idAsignacion);
  const usados = detalleGrp ? detalleGrp.detalle.length : 0;
  const scrap = asignacion.scrap ? asignacion.scrap.length : 0;

  if (usados + scrap === 0) return 'Registrado';
  if (usados + scrap >= asignacion.cantidad) return 'Finalizado';
  return 'En proceso';
}

// Precintos scrap/dañados de una Asignación: cada uno vive en su propio
// campo "scrap" (ver ASIGNACIONES_PRECINTOS_DEMO) como un objeto {precinto,
// fecha, colaborador, motivo} — lo reporta el operador desde la app móvil
// (ver abrirModalAsignarPrecinto > pestaña "Scrap" en operaciones-movil.js).
function obtenerScrapDeAsignacion(idAsignacion) {
  const asignacion = obtenerAsignacionPorId(idAsignacion);
  return asignacion?.scrap?.length || 0;
}

// Códigos de precinto de una Asignación marcados como scrap — versión que
// devuelve solo los códigos (no el detalle completo), para las vistas que
// únicamente necesitan señalar cuáles son ("Ver detalle" y "Editar").
function obtenerCodigosScrapDeAsignacion(idAsignacion) {
  const asignacion = obtenerAsignacionPorId(idAsignacion);
  return (asignacion?.scrap || []).map(s => s.precinto);
}

// Precintos de una Asignación que ya tienen su uso reportado en el
// Detalle/GRP (ver GENERAR_REGISTROS_PRECINTOS_DEMO) — igual que los
// marcados como scrap, tampoco se pueden quitar de la Asignación desde
// "Editar": si se quitaran, ese reporte quedaría apuntando a un precinto
// que ya no está en la lista de la Asignación.
function obtenerPrecintosUsadosDeAsignacion(idAsignacion) {
  const detalleGrp = obtenerGenerarRegistroPorAsignacion(idAsignacion);
  return detalleGrp ? detalleGrp.detalle.map(d => d.precinto) : [];
}

// Próximo código correlativo para un nuevo registro, con el mismo formato
// que usa Nominaciones (ej. NOM26000001): prefijo + año de 2 dígitos +
// correlativo de 6 dígitos (ej. PRE26000015).
function generarCodigoRegistroPrecinto() {
  const anio = String(new Date().getFullYear()).slice(-2);
  const nums = PRECINTOS_REGISTROS_DEMO
    .map(r => {
      const match = String(r.codigo).match(/^PRE\d{2}(\d{6})$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter(n => !isNaN(n));
  const siguiente = (nums.length ? Math.max(...nums) : 0) + 1;
  return `PRE${anio}${String(siguiente).padStart(6, '0')}`;
}

// Próximo código GRP correlativo, mismo formato (ej. GRP26000046).
function generarCodigoGRP() {
  const anio = String(new Date().getFullYear()).slice(-2);
  const nums = GENERAR_REGISTROS_PRECINTOS_DEMO
    .map(r => {
      const match = String(r.numero).match(/^GRP\d{2}(\d{6})$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter(n => !isNaN(n));
  const siguiente = (nums.length ? Math.max(...nums) : 0) + 1;
  return `GRP${anio}${String(siguiente).padStart(6, '0')}`;
}

// Próximo código de Asignación correlativo, mismo formato (ej. ASG26000004).
function generarCodigoAsignacion() {
  const anio = String(new Date().getFullYear()).slice(-2);
  const nums = ASIGNACIONES_PRECINTOS_DEMO
    .map(a => {
      const match = String(a.codigo).match(/^ASG\d{2}(\d{6})$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter(n => !isNaN(n));
  const siguiente = (nums.length ? Math.max(...nums) : 0) + 1;
  return `ASG${anio}${String(siguiente).padStart(6, '0')}`;
}

// Crea el Reporte de Precintos de una Asignación (y su Detalle/GRP vacío) la
// primera vez que se guarda — antes de esto ninguno de los dos existía en
// ningún lado: Reporte de Precintos no lo mostraba y el operario no podía
// registrar nada desde el móvil para esa Asignación (abrirModalAsignarPrecinto
// en operaciones-movil.js mostraba "sin datos" al no encontrar su Detalle).
// Si ya existen (se está editando la misma Asignación), no hace nada — cada
// Asignación tiene un único Reporte/Detalle propio.
function asegurarReportePrecinto(asignacionId, registroCodigos) {
  const hoy = fechaISOaDDMMYYYY(new Date().toISOString().slice(0, 10));

  if (!obtenerGenerarRegistroPorAsignacion(asignacionId)) {
    GENERAR_REGISTROS_PRECINTOS_DEMO.unshift({
      registroCodigos: [...registroCodigos], numero: generarCodigoGRP(), fechaEmision: hoy,
      fechaInicio: hoy, fechaFin: '', asignacionId, estado: 'Pendiente',
      detalle: []
    });
  }

  if (!REPORTES_PRECINTOS_DEMO.some(r => r.asignacionId === asignacionId)) {
    const siguienteId = REPORTES_PRECINTOS_DEMO.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    REPORTES_PRECINTOS_DEMO.unshift({ id: siguienteId, asignacionId, fechaInicio: hoy, fechaFin: '', estado: 'pendiente' });
  }
}
