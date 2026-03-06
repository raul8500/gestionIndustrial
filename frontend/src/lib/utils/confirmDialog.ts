type SweetAlertIcon = 'warning' | 'error' | 'success' | 'info' | 'question';

interface ConfirmActionOptions {
  title?: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export async function confirmAction(options: ConfirmActionOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const Swal = (await import('sweetalert2')).default;
  const result = await Swal.fire({
    title: options.title || 'Confirmar accion',
    text: options.text || 'Esta accion no se puede deshacer.',
    icon: options.icon || 'warning',
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'Si, continuar',
    cancelButtonText: options.cancelButtonText || 'Cancelar',
    confirmButtonColor: '#7A1737',
    cancelButtonColor: '#64748B',
    reverseButtons: true,
    focusCancel: true
  });

  return !!result.isConfirmed;
}

export async function confirmDelete(entityLabel: string): Promise<boolean> {
  const safeLabel = entityLabel?.trim() || 'registro';
  return confirmAction({
    title: `Eliminar ${safeLabel}`,
    text: `Esta accion eliminara el ${safeLabel}.`,
    icon: 'warning',
    confirmButtonText: 'Si, eliminar',
    cancelButtonText: 'Cancelar'
  });
}
