let fechaSeleccionada = null;

document.addEventListener('DOMContentLoaded', function() {
  const calendarEl = document.getElementById('calendarSalidas');
  const modalSalida = new bootstrap.Modal(document.getElementById('modalSalida'));
  const formSalida = document.getElementById('formSalida');
  const btnNuevaSalida = document.getElementById('btnNuevaSalida');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'es',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    events: '/calendario/salidas',
    eventClick: function(info) {
      fetch(`/calendario/salidas/${info.event.id}`)
        .then(res => res.json())
        .then(data => {
          alert(`Título: ${data.title}\nDescripción: ${data.description || 'Sin descripción'}\nFecha: ${new Date(data.date).toLocaleDateString()}`);
        });
    },
    dateClick: function(info) {
      fechaSeleccionada = info.dateStr;
      formSalida.reset();
      formSalida.date.value = fechaSeleccionada;
      modalSalida.show();
    }
  });
  calendar.render();

  btnNuevaSalida.addEventListener('click', function() {
    fechaSeleccionada = null;
    formSalida.reset();
    modalSalida.show();
  });

  formSalida.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      title: formSalida.title.value,
      description: formSalida.description.value,
      date: formSalida.date.value
    };
    fetch('/calendario/salidas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(() => {
      modalSalida.hide();
      calendar.refetchEvents();
    });
  });
});