const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const btnLogin = document.getElementById('btnLogin')

history.pushState(null, null, location.href);
window.onpopstate = function () {
  history.go(1);
};


function areFieldsNotEmpty() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  return username !== '' && password !== '';
}

btnLogin.addEventListener('click', (e) => {
    e.preventDefault();
  
    if (!areFieldsNotEmpty()) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor, completa todos los campos.',
        });
        return;
    }
  
    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        })
    })
    .then((response) => {
        const statusCode = response.status;
        if (statusCode === 200) {
            Swal.fire({
                position: 'center',
                icon: 'success',
                title: 'Inicio de sesión exitoso',
                showConfirmButton: false,
                timer: 2000
            });
            setTimeout(function() {
                location.href = '/main';
            }, 1500);
  
            window.history.pushState(null, null, window.location.href);
            window.onpopstate = function () {
                window.history.go(1);
            };
        } else if (statusCode === 403) {
            response.json().then((data) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso denegado',
                    text: data.error || 'Tu cuenta está inactiva.',
                });
            });
        } else if (statusCode === 401) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Credenciales incorrectas.',
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ha ocurrido un error en la comunicación con el servidor.',
            });
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ha ocurrido un error en la comunicación con el servidor.',
        });
    });
  });
  
