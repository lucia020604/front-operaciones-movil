// =================================================
// DATA-DISPONIBILIDAD.JS
// Datos y reglas de "Disponibilidad del Personal" — mismos datos y mismo
// criterio que la página web (Operaciones > Disponibilidad del Personal,
// ASSETS/JS/disponibilidad-personal.js): cada operario tiene vacaciones,
// descansos médicos, permisos especiales y asignaciones a proyectos; un día
// sin ninguno de esos eventos cuenta como "Disponible".
// =================================================
const DISP_PERFILES = {
  1: {
    nombre: 'Sandra', apellido: 'Echavarria', roles: ['Supervisor'],
    vacaciones: [
      { inicio: '2026-08-01', fin: '2026-08-15', motivo: 'Vacaciones anuales programadas.' },
      { inicio: '2025-01-06', fin: '2025-01-20', motivo: 'Vacaciones de verano.' }
    ],
    descansos: [
      { inicio: '2026-07-05', fin: '2026-07-12', motivo: 'Reposo por intervención odontológica.', archivos: ['Certificado_medico.pdf'] },
      { inicio: '2024-11-02', fin: '2024-11-06', motivo: 'Reposo por gripe estacional.', archivos: ['Descanso_nov2024.pdf', 'Receta.jpg'] }
    ],
    permisos: [
      { inicio: '2026-11-24', fin: '2026-11-25', motivo: 'Permiso por trámite personal.' },
      { inicio: '2026-09-14', fin: '2026-09-15', motivo: 'Permiso por trámite personal.' }
    ]
  },
  2: {
    nombre: 'Bandy', apellido: 'Jimenez', roles: ['Administrador', 'Supervisor'],
    vacaciones: [
      { inicio: '2026-11-16', fin: '2026-11-27', motivo: 'Vacaciones de fin de año.' },
      { inicio: '2025-12-01', fin: '2025-12-15', motivo: 'Vacaciones de fin de año.' }
    ],
    descansos: [],
    permisos: []
  },
  3: {
    nombre: 'Josue', apellido: 'Ramos', roles: ['Jefe de Area', 'Supervisor'],
    vacaciones: [
      { inicio: '2026-09-10', fin: '2026-09-24', motivo: 'Vacaciones familiares.' },
      { inicio: '2025-03-01', fin: '2025-03-10', motivo: 'Vacaciones cortas.' }
    ],
    descansos: [
      { inicio: '2026-11-10', fin: '2026-11-14', motivo: 'Reposo por cuadro viral.', archivos: ['Descanso_nov2026.pdf'] },
      { inicio: '2026-06-20', fin: '2026-06-27', motivo: 'Reposo por lumbalgia.', archivos: ['Informe_medico.pdf'] }
    ],
    permisos: [
      { inicio: '2026-07-28', fin: '2026-07-28', motivo: 'Permiso por capacitación externa.' }
    ]
  }
};

// Asignaciones de proyecto: determinan el estado "Programado".
const DISP_ASIGNACIONES = {
  1: [
    { inicio: '2026-11-09', fin: '2026-11-20', proyecto: 'Operación 4902', horario: '08:00 - 17:00', supervisor: 'Juan E.', observaciones: 'Turno diurno en terminal Callao.' },
    { inicio: '2026-07-13', fin: '2026-07-24', proyecto: 'Operación 4821', horario: '08:00 - 17:00', supervisor: 'Juan E.', observaciones: 'Turno diurno en muelle norte.' }
  ],
  2: [
    { inicio: '2026-11-02', fin: '2026-11-13', proyecto: 'Operación 4870', horario: '09:00 - 18:00', supervisor: 'Sandra E.', observaciones: '' },
    { inicio: '2026-07-06', fin: '2026-07-17', proyecto: 'Operación 3190', horario: '09:00 - 18:00', supervisor: 'Sandra E.', observaciones: '' }
  ],
  3: [
    { inicio: '2026-11-17', fin: '2026-11-30', proyecto: 'Operación 5711', horario: '07:00 - 16:00', supervisor: 'Juan E.', observaciones: 'Cobertura de fin de mes.' },
    { inicio: '2026-07-01', fin: '2026-07-31', proyecto: 'Operación 5620', horario: '07:00 - 16:00', supervisor: 'Juan E.', observaciones: 'Cobertura completa del mes.' }
  ]
};

const DISP_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DISP_DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DISP_ESTADO_LABEL = { programado: 'Programado', vacaciones: 'Vacaciones', descanso: 'Descanso Médico', permiso: 'Permiso Especial', disponible: 'Disponible' };
const DISP_ESTADO_COLOR = { programado: '#1D4ED8', vacaciones: '#D97706', descanso: '#DC2626', permiso: '#7C3AED', disponible: '#16A34A' };

function dispFormatearFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function dispFechaEnRango(fecha, inicio, fin) { return fecha >= inicio && fecha <= fin; }

function dispISO(anio, mes, dia) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Estado de un operario en un día, en orden de prioridad: vacaciones y
// descanso médico (eventos ya registrados) priman sobre una asignación.
function dispEstadoDia(id, fechaISO) {
  const p = DISP_PERFILES[id];
  const vac = (p.vacaciones || []).find(v => dispFechaEnRango(fechaISO, v.inicio, v.fin));
  if (vac) return { estado: 'vacaciones', detalle: `${dispFormatearFecha(vac.inicio)} al ${dispFormatearFecha(vac.fin)}`, motivo: vac.motivo };
  const desc = (p.descansos || []).find(d => dispFechaEnRango(fechaISO, d.inicio, d.fin));
  if (desc) return { estado: 'descanso', detalle: `${dispFormatearFecha(desc.inicio)} al ${dispFormatearFecha(desc.fin)}`, motivo: desc.motivo };
  const permiso = (p.permisos || []).find(pe => dispFechaEnRango(fechaISO, pe.inicio, pe.fin));
  if (permiso) return { estado: 'permiso', detalle: `${dispFormatearFecha(permiso.inicio)} al ${dispFormatearFecha(permiso.fin)}`, motivo: permiso.motivo };
  const asig = (DISP_ASIGNACIONES[id] || []).find(a => dispFechaEnRango(fechaISO, a.inicio, a.fin));
  if (asig) return { estado: 'programado', detalle: `${dispFormatearFecha(asig.inicio)} al ${dispFormatearFecha(asig.fin)}`, asignacion: asig };
  return { estado: 'disponible', detalle: null };
}

function dispContarEstadosMes(id, anio, mes) {
  const total = new Date(anio, mes + 1, 0).getDate();
  const conteo = { programado: 0, vacaciones: 0, descanso: 0, permiso: 0, disponible: 0 };
  for (let d = 1; d <= total; d++) conteo[dispEstadoDia(id, dispISO(anio, mes, d)).estado]++;
  return conteo;
}
