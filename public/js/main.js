// Configuración base y verificación de token
const verifyToken = '/api/verifySesion';
const obtenerFunciones = '/api/auth/functions/';

const nameRol = document.getElementById('name');
const rol = document.getElementById('rol');
const options = document.getElementById('options');
const profilePicture = document.getElementById('profilePicture');
let infoUser = '';
verificarTokenYMostrar();

function verificarTokenYMostrar() {
    fetch(verifyToken)
        .then(response => response.json())
        .then(data => {
            infoUser = data;
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
    nameRol.textContent = data.name;
    rol.textContent = obtenerNombreRol(data.rol);
    profilePicture.setAttribute("src", `img/sedemalogo.png`);

    if (infoUser.rol === 1) {
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

        default:
            return "Rol desconocido";
    }
}


function mostrarFunciones(data) {
  const rol = data.rol;

  fetch(obtenerFunciones + obtenerNombreRol(rol))
    .then(response => response.json())
    .then(data => {
      renderizarFuncionesEnCards(data.functions);
    })
    .catch(error => console.log(error));
}

async function renderizarFuncionesEnCards(data) {
  const contenedor = document.getElementById('contenedor-funciones');
  if (!contenedor) return; // 🚫 Si no existe, salimos sin hacer nada

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

const dropdownMenu = document.querySelector('#notificationDropdown + .dropdown-menu');
dropdownMenu.innerHTML = `
  <li class="dropdown-header text-dark fw-semibold">Notificaciones</li>
  <li><hr class="dropdown-divider"></li>
  ${notificaciones.map(n => `<li class="px-2 py-1 small">${n}</li>`).join('')}
`;
