// =================================================
// LOGIN-MOVIL.JS
// Inicio de Sesión de la App Móvil. Reutiliza exactamente el mismo origen de
// datos y de sesión que el login de escritorio (USUARIOS_DEMO,
// obtenerUsuarioPorLogin, guardarSesionUsuario / sessionStorage.sesionUsuario)
// — es el mismo sistema, visto desde el dispositivo del colaborador en
// campo, por lo que un usuario que ya existe en Configuración > Usuarios
// puede iniciar sesión aquí con las mismas credenciales.
//
// También reutiliza el mismo flujo de contraseña por vencer/vencida del login
// de escritorio (ver index.js), con los mismos usuarios demo: l.paredes y
// s.echavarria (por vencer) y m.rojas y j.solis (vencida).
// =================================================

const DESTINO_LOGIN_MOVIL = 'operaciones-movil.html';

// =================================================
// PANTALLA DE CARGA (SPLASH) — se muestra un momento al abrir la app y luego
// se desvanece sola, revelando el login que ya está renderizado debajo.
// =================================================
const SPLASH_DURACION_MS = 1800;

function ocultarSplashMovil() {
  const splash = document.getElementById('movilSplash');
  if (!splash) return;
  splash.classList.add('movil-splash--oculto');
  setTimeout(() => splash.remove(), 550);
}
setTimeout(ocultarSplashMovil, SPLASH_DURACION_MS);

function actualizarHoraStatusBar() {
  const el = document.getElementById('horaStatusBar');
  if (!el) return;
  const ahora = new Date();
  const pad = n => String(n).padStart(2, '0');
  el.textContent = horaA12(`${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`);
}
actualizarHoraStatusBar();
setInterval(actualizarHoraStatusBar, 15000);

function toggleCampoPass(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

function handleLoginMovil(e) {
  e.preventDefault();
  const btn = document.getElementById('loginMovilBtn');
  const btnTexto = document.getElementById('loginMovilBtnTexto');
  const err = document.getElementById('errorMsgMovil');
  err.classList.remove('show');

  btn.disabled = true;
  btnTexto.textContent = 'Ingresando…';

  setTimeout(() => {
    const user = document.getElementById('usuarioMovil').value.trim().toLowerCase();
    const pass = document.getElementById('passwordMovil').value;
    const encontrado = obtenerUsuarioPorLogin(user, pass);

    if (!encontrado) {
      btn.disabled = false;
      btnTexto.textContent = 'Iniciar Sesión';
      err.classList.add('show');
      return;
    }

    guardarUsuarioRecordadoMovil(user);

    if (encontrado.estadoPass === 'vigente') {
      guardarSesionUsuario(encontrado);
      if (typeof reiniciarJornadaDeHoy === 'function') reiniciarJornadaDeHoy(encontrado.usuario);
      window.location.href = DESTINO_LOGIN_MOVIL;
    } else {
      btn.disabled = false;
      btnTexto.textContent = 'Iniciar Sesión';
      abrirModalPassVencimientoMovil(encontrado);
    }
  }, 900);
}

// =================================================
// CONTRASEÑA POR VENCER / VENCIDA — mismo flujo y mismos usuarios demo que el
// login de escritorio (ver index.js). Aquí tampoco se deja pasar sin
// actualizarla cuando está vencida, igual que en escritorio.
// =================================================
let usuarioActivoMovil = null;

function abrirModalPassVencimientoMovil(usuarioDemo) {
  usuarioActivoMovil = usuarioDemo;
  const esVencida = usuarioDemo.estadoPass === 'vencida';

  const overlay = document.getElementById('modalPassVencimientoMovil');
  overlay.classList.toggle('pass-venc--vencida', esVencida);

  document.getElementById('passVencSkipMovil').style.display = esVencida ? 'none' : '';
  document.getElementById('passVencTituloMovil').textContent = esVencida ? 'Contraseña vencida' : 'Contraseña por vencer';
  document.getElementById('passVencUsuarioMovil').textContent = usuarioDemo.usuario;
  document.getElementById('passVencFechaMovil').textContent = usuarioDemo.fechaLabel;
  document.getElementById('passVencFooterMovil').textContent = esVencida
    ? 'No puedes acceder al sistema hasta actualizar tu contraseña.'
    : `Su contraseña vencerá en ${usuarioDemo.diasRestantes} días`;
  document.getElementById('passVencFooterMovil').classList.remove('pass-venc-footer-success');

  ['passVencActualMovil', 'passVencNuevaMovil', 'passVencConfirmarMovil'].forEach(id => {
    const input = document.getElementById(id);
    input.value = '';
    input.disabled = false;
    limpiarErrorInline(input);
  });
  document.getElementById('btnActualizarPassMovil').disabled = false;

  const fuerza = document.getElementById('fuerzaPassVencMovil');
  fuerza.classList.remove('f-debil', 'f-media', 'f-fuerte');
  fuerza.querySelector('.fuerza-texto').textContent = '';

  overlay.classList.add('open');
}

function saltarActualizacionPasswordMovil(e) {
  e.preventDefault();
  guardarSesionUsuario(usuarioActivoMovil);
  if (typeof reiniciarJornadaDeHoy === 'function') reiniciarJornadaDeHoy(usuarioActivoMovil.usuario);
  document.getElementById('modalPassVencimientoMovil').classList.remove('open');
  window.location.href = DESTINO_LOGIN_MOVIL;
}

function actualizarContrasenaLoginMovil() {
  const actualInput = document.getElementById('passVencActualMovil');
  const nuevaInput = document.getElementById('passVencNuevaMovil');
  const confirmarInput = document.getElementById('passVencConfirmarMovil');

  [actualInput, nuevaInput, confirmarInput].forEach(limpiarErrorInline);

  let valido = true;
  let primerCampoInvalido = null;

  if (!actualInput.value) {
    mostrarErrorInline(actualInput, 'Ingresa tu contraseña actual');
    primerCampoInvalido = actualInput;
    valido = false;
  } else if (actualInput.value !== usuarioActivoMovil.password) {
    mostrarErrorInline(actualInput, 'La contraseña actual no es correcta');
    primerCampoInvalido = actualInput;
    valido = false;
  }

  if (!nuevaInput.value) {
    mostrarErrorInline(nuevaInput, 'Ingresa tu nueva contraseña');
    if (!primerCampoInvalido) primerCampoInvalido = nuevaInput;
    valido = false;
  } else if (nuevaInput.value.length < 8) {
    mostrarErrorInline(nuevaInput, 'Mínimo 8 caracteres');
    if (!primerCampoInvalido) primerCampoInvalido = nuevaInput;
    valido = false;
  } else if (valido && nuevaInput.value === actualInput.value) {
    mostrarErrorInline(nuevaInput, 'La nueva contraseña debe ser distinta a la actual');
    if (!primerCampoInvalido) primerCampoInvalido = nuevaInput;
    valido = false;
  }

  if (!confirmarInput.value) {
    mostrarErrorInline(confirmarInput, 'Confirma tu nueva contraseña');
    if (!primerCampoInvalido) primerCampoInvalido = confirmarInput;
    valido = false;
  } else if (confirmarInput.value !== nuevaInput.value) {
    mostrarErrorInline(confirmarInput, 'Las contraseñas no coinciden');
    if (!primerCampoInvalido) primerCampoInvalido = confirmarInput;
    valido = false;
  }

  if (!valido) {
    primerCampoInvalido.focus();
    return;
  }

  usuarioActivoMovil.password = nuevaInput.value;
  registrarCambioPassword(usuarioActivoMovil, `${usuarioActivoMovil.nombre} ${usuarioActivoMovil.apellido}`);
  guardarSesionUsuario(usuarioActivoMovil);
  if (typeof reiniciarJornadaDeHoy === 'function') reiniciarJornadaDeHoy(usuarioActivoMovil.usuario);
  [actualInput, nuevaInput, confirmarInput].forEach(input => input.disabled = true);
  document.getElementById('btnActualizarPassMovil').disabled = true;

  const footer = document.getElementById('passVencFooterMovil');
  footer.textContent = 'Contraseña actualizada. Redirigiendo…';
  footer.classList.add('pass-venc-footer-success');

  setTimeout(() => {
    window.location.href = DESTINO_LOGIN_MOVIL;
  }, 900);
}

// =================================================
// RECORDAR USUARIO — igual que en el login de escritorio, es un toggle del
// prototipo; aquí además se usa para precargar el campo "Usuario" en el
// siguiente ingreso (no se guarda la contraseña).
// =================================================
const RECORDAR_USUARIO_MOVIL_KEY = 'recordarUsuarioMovil';

function guardarUsuarioRecordadoMovil(usuario) {
  const recordar = document.getElementById('recordarMovil');
  if (recordar && recordar.checked) {
    localStorage.setItem(RECORDAR_USUARIO_MOVIL_KEY, usuario);
  } else {
    localStorage.removeItem(RECORDAR_USUARIO_MOVIL_KEY);
  }
}

function precargarUsuarioRecordadoMovil() {
  const guardado = localStorage.getItem(RECORDAR_USUARIO_MOVIL_KEY);
  if (!guardado) return;
  const campoUsuario = document.getElementById('usuarioMovil');
  const recordar = document.getElementById('recordarMovil');
  if (campoUsuario) campoUsuario.value = guardado;
  if (recordar) recordar.checked = true;
}
precargarUsuarioRecordadoMovil();

// =================================================
// MEDIDOR DE FUERZA Y ERRORES INLINE — usados por el modal "Olvidé mi
// contraseña" (ASSETS/JS/olvido-password.js), igual que en el login de
// escritorio (ASSETS/JS/index.js).
// =================================================
function medirFuerzaLogin(inputId, contenedorId) {
  const valor = document.getElementById(inputId).value;
  const cont = document.getElementById(contenedorId);
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

function mostrarErrorInline(input, mensaje) {
  input.classList.add('input-error');
  let msg = input.closest('.form-group').querySelector('.pass-venc-field-error');
  if (!msg) {
    msg = document.createElement('span');
    msg.className = 'pass-venc-field-error';
    input.closest('.form-group').appendChild(msg);
  }
  msg.textContent = mensaje;
}

function limpiarErrorInline(input) {
  input.classList.remove('input-error');
  const msg = input.closest('.form-group').querySelector('.pass-venc-field-error');
  if (msg) msg.remove();
}
