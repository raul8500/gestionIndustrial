<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import { toast } from '$lib/stores/toast';

  interface Usuario {
    _id: string;
    name: string;
    username: string;
    rol: number;
    status?: string;
    area?: number;
  }

  let usuarios: Usuario[] = $state([]);
  let loading = $state(true);

  let showModal = $state(false);
  let showPasswordModal = $state(false);
  let modalTitle = $state('');
  let editingId = $state<string | null>(null);

  let form = $state({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    rol: 1,
    status: 'Activo'
  });

  let passwordForm = $state({ userId: '', newPassword: '', confirmPassword: '' });

  onMount(() => {
    fetchUsuarios();
  });

  async function fetchUsuarios() {
    loading = true;
    try {
      const data = await api.get<any>('/auth/users');
      usuarios = data.users || data || [];
    } catch {
      toast.error('Error', 'No se pudieron cargar los usuarios');
    } finally {
      loading = false;
    }
  }

  function getRolLabel(rol: number): string {
    const roles: Record<number, string> = {
      1: 'Administrador',
      2: 'Supervisor UA',
      3: 'Supervisor TI',
      4: 'Supervisor Secretaria',
      5: 'Financieros',
      6: 'Gestión Ambiental',
      7: 'Transparencia'
    };
    return roles[rol] || `Rol ${rol}`;
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Registrar Usuario';
    form = { name: '', username: '', password: '', confirmPassword: '', rol: 1, status: 'Activo' };
    showModal = true;
  }

  function openEditModal(usuario: Usuario) {
    editingId = usuario._id;
    modalTitle = 'Editar Usuario';
    form = { name: usuario.name, username: usuario.username, password: '', confirmPassword: '', rol: usuario.rol, status: usuario.status || 'Activo' };
    showModal = true;
  }

  function openPasswordModal(usuario: Usuario) {
    passwordForm = { userId: usuario._id, newPassword: '', confirmPassword: '' };
    showPasswordModal = true;
  }

  async function handleSubmit() {
    if (!editingId && form.password !== form.confirmPassword) {
      toast.error('Error', 'Las contraseñas no coinciden');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/auth/users/${editingId}`, {
          name: form.name, username: form.username, rol: form.rol, status: form.status
        });
        toast.success('Usuario actualizado');
      } else {
        await api.post('/auth/register', {
          name: form.name, username: form.username, password: form.password, rol: form.rol
        });
        toast.success('Usuario creado');
      }
      showModal = false;
      fetchUsuarios();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar');
    }
  }

  async function handlePasswordChange() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Error', 'Las contraseñas no coinciden');
      return;
    }
    try {
      await api.put(`/auth/users/passwords/${passwordForm.userId}`, { password: passwordForm.newPassword });
      toast.success('Contraseña actualizada');
      showPasswordModal = false;
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo cambiar');
    }
  }

  async function toggleStatus(usuario: Usuario) {
    const newStatus = usuario.status === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await api.put(`/auth/users/status/${usuario._id}`, { status: newStatus });
      toast.success(`Usuario ${newStatus === 'Activo' ? 'activado' : 'desactivado'}`);
      fetchUsuarios();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      toast.success('Usuario eliminado');
      fetchUsuarios();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo eliminar');
    }
  }
</script>

<svelte:head>
  <title>Administración de Usuarios - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-users-cog"></i> Administración de Usuarios</h1>
  <button class="btn btn-primary" onclick={openCreateModal}>
    <i class="fas fa-user-plus"></i> Nuevo Usuario
  </button>
</div>
</div>

{#if loading}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Cargando usuarios...</p>
  </div>
{:else}
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Nombre</th>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each usuarios as usuario, i}
          <tr>
            <td>{i + 1}</td>
            <td>{usuario.name}</td>
            <td>{usuario.username}</td>
            <td>{getRolLabel(usuario.rol)}</td>
            <td>
              <span class="badge" class:badge-success={usuario.status === 'Activo'} class:badge-danger={usuario.status !== 'Activo'}>
                {usuario.status || 'N/A'}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick={() => openEditModal(usuario)} title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick={() => openPasswordModal(usuario)} title="Contraseña">
                  <i class="fas fa-key"></i>
                </button>
                <button class="btn btn-sm" class:btn-success={usuario.status !== 'Activo'} class:btn-secondary={usuario.status === 'Activo'} onclick={() => toggleStatus(usuario)} title="Cambiar estado">
                  <i class="fas fa-power-off"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(usuario._id)} title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="text-center text-muted" style="padding: 2rem;">
              No se encontraron usuarios
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<Modal open={showModal} title={modalTitle} onclose={() => showModal = false}>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="form-group">
      <label class="form-label">Nombre *</label>
      <input class="form-input" bind:value={form.name} required />
    </div>
    <div class="form-group">
      <label class="form-label">Usuario *</label>
      <input class="form-input" bind:value={form.username} required />
    </div>
    {#if !editingId}
      <div class="form-group">
        <label class="form-label">Contraseña *</label>
        <input class="form-input" type="password" bind:value={form.password} required minlength="6" />
      </div>
      <div class="form-group">
        <label class="form-label">Confirmar contraseña *</label>
        <input class="form-input" type="password" bind:value={form.confirmPassword} required />
      </div>
    {/if}
    <div class="form-group">
      <label class="form-label">Rol</label>
      <select class="form-select" bind:value={form.rol}>
        <option value={1}>Administrador</option>
        <option value={2}>Supervisor UA</option>
        <option value={3}>Supervisor TI</option>
        <option value={4}>Supervisor Secretaria</option>
        <option value={5}>Financieros</option>
        <option value={6}>Gestión Ambiental</option>
        <option value={7}>Transparencia</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Estado</label>
      <select class="form-select" bind:value={form.status}>
        <option value="Activo">Activo</option>
        <option value="Inactivo">Inactivo</option>
      </select>
    </div>
    <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--gray-200); margin-top: 1rem;">
      <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>Cancelar</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
    </div>
  </form>
</Modal>

<Modal open={showPasswordModal} title="Cambiar Contraseña" onclose={() => showPasswordModal = false}>
  <form onsubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}>
    <div class="form-group">
      <label class="form-label">Nueva contraseña *</label>
      <input class="form-input" type="password" bind:value={passwordForm.newPassword} required minlength="6" />
    </div>
    <div class="form-group">
      <label class="form-label">Confirmar contraseña *</label>
      <input class="form-input" type="password" bind:value={passwordForm.confirmPassword} required />
    </div>
    <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--gray-200); margin-top: 1rem;">
      <button type="button" class="btn btn-secondary" onclick={() => showPasswordModal = false}>Cancelar</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-key"></i> Cambiar</button>
    </div>
  </form>
</Modal>

<style>
  .action-buttons {
    display: flex;
    gap: 0.25rem;
  }
</style>
