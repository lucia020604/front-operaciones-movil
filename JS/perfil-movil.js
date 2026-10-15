// =================================================
// PERFIL-MOVIL.JS
// Módulo Perfil de la App Móvil. Nombre, Apellido, Rol(es), Locación
// Principal y Celular vienen del mismo USUARIOS_DEMO / mantenedor de
// Usuarios que usa el sistema web (un usuario puede tener más de un rol,
// ver obtenerIdsRolesUsuario en data-usuarios.js); DNI es un dato propio
// de esta fase (ver PERFIL_MOVIL_EXTRA_DEMO en data-movil.js).
// La "Actualización de Ubicación" es una simulación de geolocalización
// (decisión del usuario: sin usar la API real del navegador) que devuelve
// una dirección demo cada vez que se presiona el botón.
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

function cargarPerfilMovil() {
  const sesion = obtenerUsuarioActual();
  if (!sesion) { window.location.href = 'login-movil.html'; return; }

  const usuario = obtenerUsuarioPorNombre(sesion.usuario);
  const extra = PERFIL_MOVIL_EXTRA_DEMO[sesion.usuario] || { dni: '—' };

  // Un usuario puede tener más de un rol asignado (rolesIds) — se muestran
  // todos, igual que en Configuración > Usuarios.
  const rolesUsuario = usuario ? obtenerIdsRolesUsuario(usuario).map(obtenerRolPorId).filter(Boolean) : [];

  const iniciales = (sesion.nombre.charAt(0) + sesion.apellido.charAt(0)).toUpperCase();
  document.getElementById('perfilAvatar').textContent = iniciales;
  document.getElementById('perfilNombre').textContent = `${sesion.nombre} ${sesion.apellido}`;
  document.getElementById('perfilRol').textContent = rolesUsuario.length
    ? rolesUsuario.map(r => r.nombre).join(' · ')
    : '—';
  document.getElementById('perfilLocacion').textContent = usuario && usuario.locacionPrincipal ? usuario.locacionPrincipal : '—';
  document.getElementById('perfilDni').textContent = extra.dni;
  document.getElementById('perfilCelular').textContent = usuario ? usuario.celular : '—';
  document.getElementById('perfilCorreo').textContent = usuario ? usuario.email : '—';

  const firma = obtenerFirmaUsuario(usuario);
  const box = document.getElementById('perfilFirmaBox');
  box.innerHTML = firma
    ? `<img src="${firma}" alt="Firma">`
    : `<span class="perfil-firma-vacio">Aún no tienes una firma registrada. Se carga desde Configuración &gt; Usuarios.</span>`;
}

// Simulación de geolocalización: no usa la API real del navegador, solo
// rota entre direcciones demo (ver decisión de "Simulado con datos demo").
let ubicacionMovilIndice = 0;
function actualizarUbicacionPerfil() {
  const btn = document.getElementById('btnActualizarUbicacion');
  const texto = document.getElementById('perfilUbicacionTexto');
  btn.disabled = true;
  btn.textContent = 'Obteniendo ubicación…';

  setTimeout(() => {
    texto.textContent = UBICACIONES_DEMO_MOVIL[ubicacionMovilIndice % UBICACIONES_DEMO_MOVIL.length].texto;
    ubicacionMovilIndice++;
    btn.disabled = false;
    btn.textContent = 'Actualizar Ubicación';
    mostrarModalConfirmacionMovil('Ubicación actualizada correctamente.');
  }, 900);
}

function cerrarSesionMovil() {
  confirmarAccion('¿Deseas cerrar tu sesión?', () => {
    // Para pruebas: reinicia la jornada de este usuario al cerrar sesión
    // (además de al volver a iniciarla, ver login-movil.js) — así se puede
    // repetir el flujo de "Comenzar/Finalizar el día" sin limpiar
    // localStorage a mano. Se lee el usuario ANTES de cerrar la sesión.
    const sesion = obtenerUsuarioActual();
    if (sesion && typeof reiniciarJornadaDeHoy === 'function') reiniciarJornadaDeHoy(sesion.usuario);
    cerrarSesion();
    window.location.href = 'login-movil.html';
  });
}

document.addEventListener('DOMContentLoaded', cargarPerfilMovil);
