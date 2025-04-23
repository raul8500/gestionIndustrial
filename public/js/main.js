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
            return "Supervisor";
        case 3:
            return "AuxiliarAdministrativo";

        default:
            return "Rol desconocido";
    }
}

function mostrarFunciones(data) {
    const rol = data.rol;

    fetch(obtenerFunciones + obtenerNombreRol(rol))
        .then(response => response.json())
        .then(data => {
            funciones(data.functions);
        })
        .catch(error => console.log(error));
}

async function funciones(data) {
    let resultados = '';

    const fetches = data.map(async item => {
        if (item.subFunctions && item.subFunctions.length > 0) {
            // Si hay subfunciones, crea un menú desplegable
            resultados += `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="navbarDropdownMenu${item.name.replace(/\s+/g, '')}" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        ${item.name}
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="navbarDropdownMenu${item.name.replace(/\s+/g, '')}">
                        ${item.subFunctions.map(subFunc => `
                            <li><a class="dropdown-item" href="${subFunc.path}">${subFunc.name}</a></li>
                        `).join('')}
                    </ul>
                </li>
            `;
        } else {
            // Elemento simple sin notificación
            resultados += `
                <li class="nav-item">
                    <a class="nav-link" href="${item.path}">${item.name}</a>
                </li>
            `;
        }
    });

    // Esperar todos los fetches
    await Promise.all(fetches);

    // Una sola vez se actualiza el DOM
    document.getElementById('options').innerHTML = resultados;
}
