// =================================================
// DATA-DOCUMENTOS-MOVIL.JS
// Documentos del inspector (contrato, cursos, certificaciones, Lemon Card) y
// su vencimiento — mismo criterio que "Alertas de documentos" de la web
// (alertas-documentos.js): "Vencido" si la fecha de fin ya pasó y "Por
// vencer" si faltan menos días que los de aviso configurados para ese
// documento en Configuración de Documentos (30 por defecto, o el mayor de
// sus alertas). Prototipo sin backend: los vencimientos de ejemplo se
// calculan RELATIVOS a hoy para que siempre haya casos que mostrar.
// =================================================
const DIAS_AVISO_DOCUMENTO_DEFECTO = 30;

function documentoFechaRelativa(dias) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// [nombre, tipo, días hasta el vencimiento (negativo = ya venció), días de aviso]
const DOCUMENTOS_INSPECTOR_SEED = {
  'j.torres': [
    ['Contrato de Trabajo', 'Contrato', 24, 30],
    ['Curso de Seguridad Portuaria', 'Curso', 9, 30],
    ['Curso de Primeros Auxilios', 'Curso', -12, 20],
    ['Lemon Card LC-00231', 'Lemon Card', -3, 30],
    ['Certificación ISO 9001', 'Certificación', 410, 60],
    ['Inglés — Nivel Intermedio', 'Idioma', 900, 30]
  ],
  'e.allccaco': [
    ['Contrato de Trabajo', 'Contrato', 6, 30],
    ['Curso de Seguridad Portuaria', 'Curso', 320, 30],
    ['Certificación ISO 9001', 'Certificación', 540, 60]
  ],
  'r.bravo': [
    ['Contrato de Trabajo', 'Contrato', 380, 30],
    ['Curso de Seguridad Portuaria', 'Curso', 120, 30]
  ],
  'j.gomez': [
    ['Curso de Primeros Auxilios', 'Curso', -1, 20],
    ['Contrato de Trabajo', 'Contrato', 200, 30]
  ]
};

function textoDiasDocumento(dias) {
  if (dias < 0) return `venció hace ${-dias} día${dias === -1 ? '' : 's'}`;
  if (dias === 0) return 'vence hoy';
  return `vence en ${dias} día${dias === 1 ? '' : 's'}`;
}

// Documentos del usuario con su estado, de más urgente a menos.
function obtenerDocumentosInspector(usuario) {
  const filas = DOCUMENTOS_INSPECTOR_SEED[usuario] || [];
  return filas.map(([nombre, tipo, dias, aviso]) => {
    const estado = dias < 0 ? 'Vencido' : dias <= (aviso || DIAS_AVISO_DOCUMENTO_DEFECTO) ? 'Por Vencer' : 'Vigente';
    return { nombre, tipo, dias, aviso, fin: documentoFechaRelativa(dias), estado, texto: textoDiasDocumento(dias) };
  }).sort((a, b) => a.dias - b.dias);
}

// Solo los que requieren atención (vencidos y por vencer).
function obtenerAlertasDocumentosInspector(usuario) {
  return obtenerDocumentosInspector(usuario).filter(d => d.estado !== 'Vigente');
}
