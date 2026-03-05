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
    status?: number;
    area?: number;
  }

  let usuarios: Usuario[] = $state([]);
  let loading = $state(true);

  let showModal = $state(false);
  let showPasswordModal = $state(false);
  let showStatusModal = $state(false);
  let statusTarget = $state<Usuario | null>(null);
  let modalTitle = $state('');
  let editingId = $state<string | null>(null);

  let form = $state({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    rol: 1,
    status: 1 as number
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
      2: 'Supervisor',
      3: 'Oficialía',
      4: 'Trámites',
      5: 'Notificaciones'
    };
    return roles[rol] || `Rol ${rol}`;
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Registrar Usuario';
    form = { name: '', username: '', password: '', confirmPassword: '', rol: 1, status: 1 as number };
    showModal = true;
  }

  function openEditModal(usuario: Usuario) {
    editingId = usuario._id;
    modalTitle = 'Editar Usuario';
    form = { name: usuario.name, username: usuario.username, password: '', confirmPassword: '', rol: usuario.rol, status: usuario.status ?? 1 };
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
      await api.put(`/auth/users/passwords/${passwordForm.userId}`, { newPassword: passwordForm.newPassword });
      toast.success('Contraseña actualizada');
      showPasswordModal = false;
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo cambiar');
    }
  }

  async function toggleStatus(usuario: Usuario) {
    const newStatus = usuario.status === 1 ? 0 : 1;
    try {
      await api.put(`/auth/users/status/${usuario._id}`, { status: newStatus });
      toast.success(`Usuario ${newStatus === 1 ? 'activado' : 'desactivado'}`);
      showStatusModal = false;
      statusTarget = null;
      fetchUsuarios();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  }

  function openStatusModal(usuario: Usuario) {
    statusTarget = usuario;
    showStatusModal = true;
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
              <span class="badge" class:badge-success={usuario.status === 1} class:badge-danger={usuario.status !== 1}>
                {usuario.status === 1 ? 'Activo' : usuario.status === 0 ? 'Inactivo' : 'N/A'}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="action-btn action-edit" onclick={() => openEditModal(usuario)} title="Editar usuario">
                  <i class="fas fa-pen-to-square"></i>
                </button>
                <button class="action-btn action-password" onclick={() => openPasswordModal(usuario)} title="Cambiar contraseña">
                  <i class="fas fa-lock"></i>
                </button>
                <button class="action-btn" class:action-deactivate={usuario.status === 1} class:action-activate={usuario.status !== 1} onclick={() => openStatusModal(usuario)} title={usuario.status === 1 ? 'Desactivar usuario' : 'Activar usuario'}>
                  <i class="fas" class:fa-toggle-off={usuario.status === 1} class:fa-toggle-on={usuario.status !== 1}></i>
                </button>
                <button class="action-btn action-delete" onclick={() => handleDelete(usuario._id)} title="Eliminar usuario">
                  <i class="fas fa-trash-can"></i>
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
        <option value={2}>Supervisor</option>
        <option value={3}>Oficialía</option>
        <option value={4}>Trámites</option>
        <option value={5}>Notificaciones</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Estado</label>
      <select class="form-select" bind:value={form.status}>
        <option value={1}>Activo</option>
        <option value={0}>Inactivo</option>
      </select>
    </div>
    <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--gray-200); margin-top: 1rem;">
      <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>Cancelar</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
    </div>
  </form>
</Modal>

<Modal open={showStatusModal} title={statusTarget?.status === 1 ? 'Desactivar Usuario' : 'Activar Usuario'} onclose={() => { showStatusModal = false; statusTarget = null; }}>
  {#if statusTarget}
    <div class="status-modal-content">
      <div class="status-icon" class:status-icon-danger={statusTarget.status === 1} class:status-icon-success={statusTarget.status !== 1}>
        <i class="fas" class:fa-user-slash={statusTarget.status === 1} class:fa-user-check={statusTarget.status !== 1}></i>
      </div>
      <p class="status-message">
        {#if statusTarget.status === 1}
          ¿Estás seguro de que deseas <strong>desactivar</strong> la cuenta de este usuario? Ya no podrá acceder al sistema y su sesión se cerrará automáticamente.
        {:else}
          ¿Estás seguro de que deseas <strong>activar</strong> la cuenta de este usuario? Podrá acceder al sistema nuevamente.
        {/if}
      </p>
      <div class="status-user-card">
        <div class="status-user-info">
          <span class="status-user-name"><i class="fas fa-user"></i> {statusTarget.name}</span>
          <span class="status-user-detail"><i class="fas fa-at"></i> {statusTarget.username}</span>
          <span class="status-user-detail"><i class="fas fa-id-badge"></i> {getRolLabel(statusTarget.rol)}</span>
        </div>
        <span class="badge" class:badge-success={statusTarget.status === 1} class:badge-danger={statusTarget.status !== 1}>
          {statusTarget.status === 1 ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div class="status-modal-footer">
        <button type="button" class="btn btn-secondary" onclick={() => { showStatusModal = false; statusTarget = null; }}>Cancelar</button>
        {#if statusTarget.status === 1}
          <button type="button" class="btn btn-danger" onclick={() => statusTarget && toggleStatus(statusTarget)}>
            <i class="fas fa-user-slash"></i> Desactivar
          </button>
        {:else}
          <button type="button" class="btn btn-success" onclick={() => statusTarget && toggleStatus(statusTarget)}>
            <i class="fas fa-user-check"></i> Activar
          </button>
        {/if}
      </div>
    </div>
  {/if}
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
    gap: 0.4rem;
    justify-content: center;
  }

  .action-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    position: relative;
  }

  .action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 8px rgba(0,0,0,0.15);
  }

  .action-btn:active {
    transform: translateY(0);
  }

  .action-edit {
    background: #eff6ff;
    color: #2563eb;
  }
  .action-edit:hover {
    background: #2563eb;
    color: #fff;
  }

  .action-password {
    background: #fefce8;
    color: #ca8a04;
  }
  .action-password:hover {
    background: #ca8a04;
    color: #fff;
  }

  .action-deactivate {
    background: #f1f5f9;
    color: #64748b;
  }
  .action-deactivate:hover {
    background: #64748b;
    color: #fff;
  }

  .action-activate {
    background: #dcfce7;
    color: #16a34a;
  }
  .action-activate:hover {
    background: #16a34a;
    color: #fff;
  }

  .action-delete {
    background: #fef2f2;
    color: #dc2626;
  }
  .action-delete:hover {
    background: #dc2626;
    color: #fff;
  }

  .status-modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }

  .status-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
  }

  .status-icon-danger {
    background: #fee2e2;
    color: #dc2626;
  }

  .status-icon-success {
    background: #dcfce7;
    color: #16a34a;
  }

  .status-message {
    font-size: 0.95rem;
    color: var(--gray-700, #374151);
    line-height: 1.5;
    margin: 0;
    max-width: 360px;
  }

  .status-user-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: var(--gray-50, #f9fafb);
    border: 1px solid var(--gray-200, #e5e7eb);
    border-radius: 8px;
    padding: 0.85rem 1rem;
  }

  .status-user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }

  .status-user-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--gray-900, #111827);
  }

  .status-user-detail {
    font-size: 0.8rem;
    color: var(--gray-500, #6b7280);
  }

  .status-user-detail i,
  .status-user-name i {
    width: 16px;
    text-align: center;
    margin-right: 0.35rem;
  }

  .status-modal-footer {
    display: flex;
    gap: 0.75rem;
    width: 100%;
    justify-content: flex-end;
    padding-top: 0.75rem;
    border-top: 1px solid var(--gray-200, #e5e7eb);
    margin-top: 0.25rem;
  }
</style>
