import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

let nextId = 0;

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add(type: ToastType, title: string, message?: string, duration = 3000) {
    const id = nextId++;
    const toast: Toast = { id, type, title, message, duration };
    
    update(toasts => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }

    return id;
  }

  function remove(id: number) {
    update(toasts => toasts.filter(t => t.id !== id));
  }

  return {
    subscribe,
    success: (title: string, message?: string) => add('success', title, message),
    error: (title: string, message?: string) => add('error', title, message, 5000),
    warning: (title: string, message?: string) => add('warning', title, message, 4000),
    info: (title: string, message?: string) => add('info', title, message),
    remove
  };
}

export const toast = createToastStore();
