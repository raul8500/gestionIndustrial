import { writable } from 'svelte/store';
import api from '$lib/api';

export interface UserInfo {
  name: string;
  rol: number;
  area?: number;
  puedeCrearUsuarios?: boolean;
  id?: string;
  _id?: string;
}

export interface FunctionItem {
  name: string;
  description?: string;
  path: string;
}

export interface FunctionArea {
  area: string;
  items: FunctionItem[];
}

function createAuthStore() {
  const { subscribe, set, update } = writable<{
    user: UserInfo | null;
    functions: FunctionArea[];
    loading: boolean;
    authenticated: boolean;
  }>({
    user: null,
    functions: [],
    loading: true,
    authenticated: false
  });

  return {
    subscribe,

    async verifySession() {
      try {
        const data = await api.get<UserInfo>('/verifySesion');
        const rolName = getRoleName(data.rol);
        const funcData = await api.get<{ functions: FunctionArea[] }>(`/auth/functions/${rolName}`);
        
        update(state => ({
          ...state,
          user: data,
          functions: funcData?.functions || [],
          loading: false,
          authenticated: true
        }));
        return true;
      } catch {
        update(state => ({
          ...state,
          user: null,
          functions: [],
          loading: false,
          authenticated: false
        }));
        return false;
      }
    },

    async login(username: string, password: string) {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.status === 200) {
        return { success: true };
      } else if (response.status === 403) {
        const data = await response.json();
        return { success: false, error: data.error || 'Tu cuenta está inactiva.' };
      } else if (response.status === 401) {
        return { success: false, error: 'Credenciales incorrectas.' };
      } else {
        return { success: false, error: 'Error en la comunicación con el servidor.' };
      }
    },

    async logout() {
      try {
        await fetch('/logout', { credentials: 'include' });
      } catch {
        // ignore
      }
      set({ user: null, functions: [], loading: false, authenticated: false });
    },

    reset() {
      set({ user: null, functions: [], loading: false, authenticated: false });
    }
  };
}

export function getRoleName(rol: number): string {
  switch (rol) {
    case 1: return 'Administrador';
    case 2: return 'Supervisor';
    case 3: return 'Oficialia';
    case 4: return 'Tramites';
    case 5: return 'Notificaciones';
    default: return 'Rol desconocido';
  }
}

export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const auth = createAuthStore();
