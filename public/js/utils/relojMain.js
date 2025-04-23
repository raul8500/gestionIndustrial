function mueveReloj(){

    var today = new Date();
    var now = today.toLocaleTimeString('en-US');

    const fecha = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    document.form_fecha.fecha.value = fecha.toLocaleDateString('es-MX',opciones);

    document.form_reloj.reloj.value = now
    setTimeout("mueveReloj()",1000)
}

history.pushState(null, null, window.location.href);
        window.onpopstate = function () {
            history.go(1);
};
