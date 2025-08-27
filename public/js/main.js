// Configuración base y verificación de token
const verifyToken = '/api/verifySesion';
const obtenerFunciones = '/api/auth/functions/';

const nameRol = document.getElementById('name');
const rol = document.getElementById('rol');
const options = document.getElementById('options');
const profilePicture = document.getElementById('profilePicture');

// Variable para almacenar información del usuario (evitar conflictos)
let userInfo = '';

verificarTokenYMostrar();

function verificarTokenYMostrar() {
    fetch(verifyToken)
        .then(response => response.json())
        .then(data => {
            userInfo = data;
            mostrarRolUsuario(data); // Primero, muestra el rol del usuario
            return data; // Devuelve 'data' para poder usarlo en la siguiente promesa
        })
        .then(data => {
            mostrarFunciones(data); // Luego, muestra las funciones
        })
        .catch(error => console.log(error));
}

function mostrarRolUsuario(data) {
    data.name = capitalizeWords(data.name);
    if (nameRol) nameRol.textContent = data.name;
    if (rol) rol.textContent = obtenerNombreRol(data.rol);
    if (profilePicture) profilePicture.setAttribute("src", `img/sedemalogo.png`);

    if (userInfo.rol === 1) {
        const estadisticasMain = document.getElementById('estadisticasMain');

        if (estadisticasMain != null) {
            estadisticasMain.style.visibility = 'visible';
            mostrarInfoPanel();
        }
    }
}

function capitalizeWords(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const on = (element, event, selector, handler) => {
    element.addEventListener(event, e => {
        if (e.target.closest(selector)) {
            handler(e);
        }
    });
};

function obtenerNombreRol(rol) {
    switch (rol) {
        case 1:
            return "Administrador";
        case 2:
            return "Supervisor UA";
        case 3:
            return "Supervisor TI";
        case 4:
            return "Supervisor Secretaria";
        case 5:
            return "Financieros";
        case 6:
            return "Gestion Ambiental";
        default:
            return "Rol desconocido";
    }
}


function mostrarFunciones(data) {
  const rol = data.rol;
  const nombreRol = obtenerNombreRol(rol);
  
  console.log('🔍 Obteniendo funciones para rol:', rol, 'nombre:', nombreRol);
  console.log('👤 Usuario actual:', data);

  fetch(obtenerFunciones + nombreRol)
    .then(response => response.json())
    .then(data => {
      console.log('📋 Funciones obtenidas del servidor:', data);
      // Solo mostrar las funciones del rol específico del usuario
      if (data && data.functions) {
        console.log('✅ Funciones encontradas:', data.functions);
        renderizarFuncionesEnCards(data.functions);
      } else {
        console.log('❌ No se encontraron funciones para el rol:', nombreRol);
        renderizarFuncionesEnCards([]);
      }
    })
    .catch(error => {
      console.log('❌ Error al obtener funciones:', error);
      renderizarFuncionesEnCards([]);
    });
}

async function renderizarFuncionesEnCards(data) {

  const contenedor = document.getElementById('contenedor-funciones');
  if (!contenedor) return;

  console.log('🎨 Renderizando funciones en cards:', data);

  // Si no hay datos o está vacío, mostrar mensaje
  if (!data || data.length === 0) {
    console.log('📝 No hay funciones para renderizar, mostrando mensaje');
    contenedor.innerHTML = `
      <div class="text-center p-5">
        <i class="fas fa-info-circle fa-3x text-muted mb-3"></i>
        <h4 class="text-muted">No tienes funciones asignadas</h4>
        <p class="text-muted">Contacta al administrador para que te asigne las funciones correspondientes.</p>
      </div>
    `;
    return;
  }

  let html = '';

  for (const area of data) {
    const areaNombre = area.area || 'Sin área definida';

    html += `
      <div class="mb-5 p-4 border shadow-sm" style="background-color: rgb(255, 255, 255); border-radius: 1rem;">
        <div class="d-flex align-items-center mb-3">
          <i class="fas fa-layer-group me-2" style="font-size: 1.5rem; color: #7c1241;"></i>
          <h4 class="mb-0 text-dark fw-bold">${areaNombre}</h4>
        </div>
        <div class="row">
    `;

    area.items.forEach(func => {
      // Ocultar si es del área 5 o 6 y no puede crear usuarios, y el item se llama "Usuarios" o "Usuarios Financieros"
      if (
        (userInfo.area === 5 || userInfo.area === 6) &&
        userInfo.puedeCrearUsuarios === false &&
        (func.name === 'Usuarios' || func.name === 'Usuarios Financieros')
      ) {
        return; // ❌ No renderizar este item
      }

      const titulo = func.name;
      const descripcion = func.description || 'Accede y gestiona esta sección del sistema.';
      const ruta = func.path;

      html += `
        <div class="col-md-4 mb-4">
          <div class="card shadow-lg" style="background-color:rgba(255, 255, 255, 0.82);">
            <img src="/img/xamoraveracruz.png" class="fondo-imagen" alt="Fondo translúcido">
            <div class="card-body">
              <h4 class="card-title" style="color: rgb(0, 0, 0);">${titulo}</h4>
              <p class="card-text" style="color: rgb(0, 0, 0); font-size: 10pt;">
                ${descripcion}
              </p>
              <a href="${ruta}" class="btn" style="background-color: #7c1241; color: white;">Entrar</a>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
  }

  contenedor.innerHTML = html;
}


const notificaciones = [
  "En desarrollo"
];


/*
const dropdownMenu = document.querySelector('#notificationDropdown + .dropdown-menu');
dropdownMenu.innerHTML = `
  <li class="dropdown-header text-dark fw-semibold">Notificaciones</li>
  <li><hr class="dropdown-divider"></li>
  ${notificaciones.map(n => `<li class="px-2 py-1 small">${n}</li>`).join('')}
`;

*/

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'acceso') {
    Swal.fire({
      icon: 'warning',
      title: 'Acceso denegado',
      text: 'No tienes permiso para acceder a esta sección.'
    });
  }