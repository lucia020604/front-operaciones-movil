// =================================================
// OLVIDO-PASSWORD.JS
// Flujo "Olvidé mi contraseña" desde el login, con verificación por
// código OTP (6 dígitos) enviado al correo del usuario.
//
// NOTA (prototipo sin backend): al no existir un servicio de correo real,
// el código OTP se genera en el navegador y se muestra como una pista
// visual "Modo demostración" dentro del propio modal, además de quedar
// registrado en la consola. En integración real, este paso lo resuelve
// el backend (generar código, enviarlo por correo, validar contra sesión).
// =================================================

const OTP_DURACION_SEGUNDOS = 300;
const OTP_LARGO = 6;

let olvidoUsuarioActivo = null;   // usuario demo identificado en el paso 1
let olvidoCodigoOtp = null;       // código vigente para ese intento
let olvidoTimerInterval = null;
let olvidoSegundosRestantes = 0;

// El mismo flujo se reutiliza desde el login de escritorio (campos "usuario"/
// "password") y desde el login de la app móvil (campos "usuarioMovil"/
// "passwordMovil") — se resuelve el campo que exista en la página actual.
function olvidoCampoLoginUsuario() {
  return document.getElementById('usuarioMovil') || document.getElementById('usuario');
}

function olvidoCampoLoginPassword() {
  return document.getElementById('passwordMovil') || document.getElementById('password');
}

/* =================================================
   APERTURA / CIERRE DEL MODAL
================================================= */

function abrirModalOlvidoPassword(e) {
  if (e) e.preventDefault();

  const campoUsuario = olvidoCampoLoginUsuario();
  document.getElementById('olvidoUsuario').value = (campoUsuario && campoUsuario.value) || '';
  ocultarErrorOlvido('olvidoUsuarioError');

  mostrarPasoOlvido('usuario');
  document.getElementById('modalOlvidoPassword').classList.add('open');
  setTimeout(() => document.getElementById('olvidoUsuario').focus(), 50);
}

function cerrarModalOlvidoPassword() {
  document.getElementById('modalOlvidoPassword').classList.remove('open');
  detenerTimerOtp();
  olvidoUsuarioActivo = null;
  olvidoCodigoOtp = null;
}

function mostrarPasoOlvido(paso) {
  ['usuario', 'otp', 'nueva'].forEach(p => {
    const el = document.getElementById('olvidoStep' + p.charAt(0).toUpperCase() + p.slice(1));
    el.style.display = (p === paso) ? '' : 'none';
  });
}

/* =================================================
   PASO 1: IDENTIFICAR USUARIO Y ENVIAR CÓDIGO
================================================= */

function enviarCodigoOtp() {
  const input = document.getElementById('olvidoUsuario');
  const usuario = input.value.trim();
  ocultarErrorOlvido('olvidoUsuarioError');

  if (!usuario) {
    mostrarErrorOlvido('olvidoUsuarioError', 'olvidoUsuarioErrorTexto', 'Ingresa tu usuario para continuar.');
    input.focus();
    return;
  }

  const encontrado = obtenerUsuarioPorNombre(usuario);
  if (!encontrado || encontrado.estado === 'inactivo') {
    mostrarErrorOlvido('olvidoUsuarioError', 'olvidoUsuarioErrorTexto', 'Usuario no encontrado. Verifica e intenta nuevamente.');
    input.focus();
    return;
  }

  olvidoUsuarioActivo = encontrado;
  document.getElementById('olvidoEmailMasked').textContent = enmascararEmail(encontrado.email);

  generarYEnviarOtp();
  mostrarPasoOlvido('otp');
  limpiarCasillasOtp();
  setTimeout(() => enfocarCasillaOtp(0), 50);
}

function enmascararEmail(email) {
  const partes = String(email).split('@');
  if (partes.length !== 2) return email;
  const [usuarioCorreo, dominio] = partes;
  const visibles = usuarioCorreo.slice(0, Math.min(2, usuarioCorreo.length));
  const oculto = '*'.repeat(Math.max(usuarioCorreo.length - visibles.length, 3));
  return `${visibles}${oculto}@${dominio}`;
}

function generarYEnviarOtp() {
  olvidoCodigoOtp = String(Math.floor(100000 + Math.random() * 900000));

  // En un backend real este console.log no existiría: aquí simula el envío
  // del correo y deja el código visible para pruebas de QA.
  console.info(`[OTP DEMO] Código enviado a ${olvidoUsuarioActivo.email}: ${olvidoCodigoOtp}`);
  const hint = document.getElementById('otpDemoHint');
  if (hint) hint.textContent = `Modo demostración — código de prueba: ${olvidoCodigoOtp}`;

  iniciarTimerOtp();
}

function reenviarCodigoOtp(e) {
  e.preventDefault();
  if (!olvidoUsuarioActivo) return;
  ocultarErrorOlvido('olvidoOtpError');
  limpiarCasillasOtp();
  generarYEnviarOtp();
  enfocarCasillaOtp(0);
}

function volverAUsuario(e) {
  e.preventDefault();
  detenerTimerOtp();
  olvidoCodigoOtp = null;
  ocultarErrorOlvido('olvidoOtpError');
  mostrarPasoOlvido('usuario');
  setTimeout(() => document.getElementById('olvidoUsuario').focus(), 50);
}

/* =================================================
   TEMPORIZADOR DE REENVÍO
================================================= */

function iniciarTimerOtp() {
  detenerTimerOtp();
  olvidoSegundosRestantes = OTP_DURACION_SEGUNDOS;
  document.getElementById('otpTimerTexto').style.display = '';
  document.getElementById('otpResendLink').style.display = 'none';
  actualizarTextoTimer();

  olvidoTimerInterval = setInterval(() => {
    olvidoSegundosRestantes--;
    if (olvidoSegundosRestantes <= 0) {
      detenerTimerOtp();
      document.getElementById('otpTimerTexto').style.display = 'none';
      document.getElementById('otpResendLink').style.display = '';
      return;
    }
    actualizarTextoTimer();
  }, 1000);
}

function detenerTimerOtp() {
  if (olvidoTimerInterval) {
    clearInterval(olvidoTimerInterval);
    olvidoTimerInterval = null;
  }
}

function actualizarTextoTimer() {
  const min = String(Math.floor(olvidoSegundosRestantes / 60)).padStart(2, '0');
  const seg = String(olvidoSegundosRestantes % 60).padStart(2, '0');
  document.getElementById('otpTimer').textContent = `${min}:${seg}`;
}

/* =================================================
   PASO 2: CASILLAS OTP (INPUT DE 6 DÍGITOS)
================================================= */

function obtenerCasillasOtp() {
  return Array.from(document.querySelectorAll('#otpInputGroup .otp-box'));
}

function limpiarCasillasOtp() {
  obtenerCasillasOtp().forEach(box => {
    box.value = '';
    box.classList.remove('otp-error');
  });
}

function enfocarCasillaOtp(indice) {
  const casillas = obtenerCasillasOtp();
  if (casillas[indice]) casillas[indice].focus();
}

function leerCodigoOtpIngresado() {
  return obtenerCasillasOtp().map(box => box.value).join('');
}

document.addEventListener('input', function (e) {
  if (!e.target.classList || !e.target.classList.contains('otp-box')) return;

  const box = e.target;
  box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
  box.classList.remove('otp-error');
  ocultarErrorOlvido('olvidoOtpError');

  const casillas = obtenerCasillasOtp();
  const indice = casillas.indexOf(box);

  if (box.value && indice < casillas.length - 1) {
    casillas[indice + 1].focus();
  }

  if (indice === casillas.length - 1 && box.value && leerCodigoOtpIngresado().length === OTP_LARGO) {
    validarCodigoOtp();
  }
});

document.addEventListener('keydown', function (e) {
  if (!e.target.classList || !e.target.classList.contains('otp-box')) return;

  const casillas = obtenerCasillasOtp();
  const indice = casillas.indexOf(e.target);

  if (e.key === 'Backspace' && !e.target.value && indice > 0) {
    casillas[indice - 1].focus();
  } else if (e.key === 'ArrowLeft' && indice > 0) {
    casillas[indice - 1].focus();
  } else if (e.key === 'ArrowRight' && indice < casillas.length - 1) {
    casillas[indice + 1].focus();
  }
});

document.addEventListener('paste', function (e) {
  if (!e.target.classList || !e.target.classList.contains('otp-box')) return;
  e.preventDefault();

  const texto = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, OTP_LARGO);
  const casillas = obtenerCasillasOtp();
  texto.split('').forEach((digito, i) => {
    if (casillas[i]) casillas[i].value = digito;
  });
  if (texto.length) enfocarCasillaOtp(Math.min(texto.length, casillas.length - 1));
  if (texto.length === OTP_LARGO) validarCodigoOtp();
});

/* =================================================
   VALIDACIÓN DEL CÓDIGO
================================================= */

function validarCodigoOtp() {
  const ingresado = leerCodigoOtpIngresado();
  ocultarErrorOlvido('olvidoOtpError');

  if (ingresado.length < OTP_LARGO) {
    mostrarErrorOlvido('olvidoOtpError', 'olvidoOtpErrorTexto', 'Ingresa los 6 dígitos del código.');
    return;
  }

  if (ingresado !== olvidoCodigoOtp) {
    mostrarErrorOlvido('olvidoOtpError', 'olvidoOtpErrorTexto', 'Código incorrecto. Intenta nuevamente.');
    obtenerCasillasOtp().forEach(box => box.classList.add('otp-error'));
    enfocarCasillaOtp(0);
    return;
  }

  detenerTimerOtp();
  prepararPasoNuevaPassword();
  mostrarPasoOlvido('nueva');
}

/* =================================================
   PASO 3: NUEVA CONTRASEÑA
================================================= */

function prepararPasoNuevaPassword() {
  ['olvidoPassNueva', 'olvidoPassConfirmar'].forEach(id => {
    const input = document.getElementById(id);
    input.value = '';
    input.disabled = false;
    limpiarErrorInline(input);
  });
  document.getElementById('btnGuardarNuevaPass').disabled = false;

  const fuerza = document.getElementById('fuerzaOlvidoPass');
  fuerza.classList.remove('f-debil', 'f-media', 'f-fuerte');
  fuerza.querySelector('.fuerza-texto').textContent = '';

  const footer = document.getElementById('olvidoFooter');
  footer.textContent = '';
  footer.classList.remove('pass-venc-footer-success');
}

function guardarNuevaPasswordOlvido() {
  const nuevaInput = document.getElementById('olvidoPassNueva');
  const confirmarInput = document.getElementById('olvidoPassConfirmar');

  [nuevaInput, confirmarInput].forEach(limpiarErrorInline);

  let valido = true;
  let primerCampoInvalido = null;

  if (!nuevaInput.value) {
    mostrarErrorInline(nuevaInput, 'Ingresa tu nueva contraseña');
    primerCampoInvalido = nuevaInput;
    valido = false;
  } else if (nuevaInput.value.length < 8) {
    mostrarErrorInline(nuevaInput, 'Mínimo 8 caracteres');
    primerCampoInvalido = nuevaInput;
    valido = false;
  } else if (nuevaInput.value === olvidoUsuarioActivo.password) {
    mostrarErrorInline(nuevaInput, 'La nueva contraseña debe ser distinta a la actual');
    primerCampoInvalido = nuevaInput;
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

  olvidoUsuarioActivo.password = nuevaInput.value;
  olvidoUsuarioActivo.estadoPass = 'vigente';
  registrarCambioPassword(olvidoUsuarioActivo, `${olvidoUsuarioActivo.nombre} ${olvidoUsuarioActivo.apellido} (restablecida por OTP)`);

  [nuevaInput, confirmarInput].forEach(input => input.disabled = true);
  document.getElementById('btnGuardarNuevaPass').disabled = true;

  const footer = document.getElementById('olvidoFooter');
  footer.textContent = 'Contraseña actualizada correctamente.';
  footer.classList.add('pass-venc-footer-success');

  const usuarioRestablecido = olvidoUsuarioActivo.usuario;

  setTimeout(() => {
    cerrarModalOlvidoPassword();
    const campoUsuario = olvidoCampoLoginUsuario();
    const campoPassword = olvidoCampoLoginPassword();
    if (campoUsuario) campoUsuario.value = usuarioRestablecido;
    if (campoPassword) {
      campoPassword.value = '';
      campoPassword.focus();
    }
  }, 1400);
}

/* =================================================
   AYUDANTES DE ERROR (paso usuario / paso otp)
================================================= */

function mostrarErrorOlvido(idContenedor, idTexto, mensaje) {
  document.getElementById(idTexto).textContent = mensaje;
  document.getElementById(idContenedor).classList.add('show');
}

function ocultarErrorOlvido(idContenedor) {
  document.getElementById(idContenedor).classList.remove('show');
}
