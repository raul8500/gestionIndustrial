<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import { toast } from '$lib/stores/toast';

  interface Usuario {
    _id: string;
    name: string;
    username: string;
    status?: string;
    rolGestionAmbiental?: number;
  }

  let usuarios: Usuario[] = $state([]);
  let loading = $state(true);

  // Modal state
  let showModal = $state(false);
  let showPasswordModal = $state(false);
  let modalTitle = $state('Registrar Usuario');
  let editingId = $state<string | null>(null);

  let form = $state({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    status: 'Activo',
    rolGestionAmbiental: 1
  });

  let passwordForm = $state({
    userId: '',
    newPassword: '',
    confirmPassword: ''
  });

  const rolTypes = [
    { value: 1, label: 'Tipo 1 - Consulta' },
    { value: 2, label: 'Tipo 2 - Captura' },
    { value: 3, label: 'Tipo 3 - Administrador' },
    { value: 4, label: 'Tipo 4 - Supervisor' }
  ];

  onMount(() => {
    fetchUsuarios();
  });

  async function fetchUsuarios() {
    loading = true;
    try {
      const data = await api.get<any>('/gestionambiental/usuarios/');
      usuarios = data || [];
    } catch (err) {
      toast.error('Error', 'No se pudieron cargar los usuarios');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Registrar Usuario';
    form = { name: '', username: '', password: '', confirmPassword: '', status: 'Activo', rolGestionAmbiental: 1 };
    showModal = true;
  }

  function openEditModal(usuario: Usuario) {
    editingId = usuario._id;
    modalTitle = 'Editar Usuario';
    form = {
      name: usuario.name,
      username: usuario.username,
      password: '',
      confirmPassword: '',
      status: usuario.status || 'Activo',
      rolGestionAmbiental: usuario.rolGestionAmbiental || 1
    };
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
        await api.put(`/gestionambiental/usuarios/${editingId}`, {
          name: form.name,
          username: form.username,
          status: form.status,
          rolGestionAmbiental: form.rolGestionAmbiental
        });
        toast.success('Usuario actualizado');
      } else {
        if (form.password.length < 6) {
          toast.error('Error', 'La contraseña debe tener al menos 6 caracteres');
          return;
        }
        await api.post('/gestionambiental/usuarios/', {
          name: form.name,
          username: form.username,
          password: form.password,
          status: form.status,
          rolGestionAmbiental: form.rolGestionAmbiental
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
    if (passwordForm.newPassword.length < 6) {
      toast.error('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await api.put(`/gestionambiental/usuarios/password/${passwordForm.userId}`, {
        password: passwordForm.newPassword
      });
      toast.success('Contraseña actualizada');
      showPasswordModal = false;
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo actualizar la contraseña');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/gestionambiental/usuarios/${id}`);
      toast.success('Usuario eliminado');
      fetchUsuarios();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo eliminar');
    }
  }
</script>

<svelte:head>
  <title>Gestión de Usuarios - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-users"></i> Gestión de Usuarios</h1>
  <button class="btn btn-primary" onclick={openCreateModal}>
    <i class="fas fa-user-plus"></i> Registrar Usuario
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
                <button class="btn btn-sm btn-warning" onclick={() => openPasswordModal(usuario)} title="Cambiar contraseña">
                  <i class="fas fa-key"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(usuario._id)} title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="text-center text-muted" style="padding: 2rem;">
              No se encontraron usuarios
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- Create/Edit Modal -->
<Modal open={showModal} title={modalTitle} onclose={() => showModal = false}>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="form-group">
      <label class="form-label">Nombre completo *</label>
      <input class="form-input" bind:value={form.name} required />
    </div>
    <div class="form-group">
      <label class="form-label">Nombre de usuario *</label>
      <input class="form-input" bind:value={form.username} required />
    </div>
    {#if !editingId}
      <div class="form-group">
        <label class="form-label">Contraseña *</label>
        <input class="form-input" type="password" bind:value={form.password} required minlength="6" />
        <small class="text-muted">Mínimo 6 caracteres</small>
      </div>
      <div class="form-group">
        <label class="form-label">Confirmar contraseña *</label>
        <input class="form-input" type="password" bind:value={form.confirmPassword} required />
      </div>
    {/if}
    <div class="form-group">
      <label class="form-label">Estado</label>
      <select class="form-select" bind:value={form.status}>
        <option value="Activo">Activo</option>
        <option value="Inactivo">Inactivo</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tipo de Rol</label>
      <select class="form-select" bind:value={form.rolGestionAmbiental}>
        {#each rolTypes as rol}
          <option value={rol.value}>{rol.label}</option>
        {/each}
      </select>
    </div>

    <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--gray-200); margin-top: 1rem;">
      <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>Cancelar</button>
      <button type="submit" class="btn btn-primary">
        <i class="fas fa-save"></i> Guardar
      </button>
    </div>
  </form>
</Modal>

<!-- Password Modal -->
<Modal open={showPasswordModal} title="Cambiar Contraseña" onclose={() => showPasswordModal = false}>
  <form onsubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}>
    <div class="form-group">
      <label class="form-label">Nueva contraseña *</label>
      <input class="form-input" type="password" bind:value={passwordForm.newPassword} required minlength="6" />
      <small class="text-muted">Mínimo 6 caracteres</small>
    </div>
    <div class="form-group">
      <label class="form-label">Confirmar contraseña *</label>
      <input class="form-input" type="password" bind:value={passwordForm.confirmPassword} required />
    </div>

    <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--gray-200); margin-top: 1rem;">
      <button type="button" class="btn btn-secondary" onclick={() => showPasswordModal = false}>Cancelar</button>
      <button type="submit" class="btn btn-primary">
        <i class="fas fa-key"></i> Cambiar Contraseña
      </button>
    </div>
  </form>
</Modal>

<style>
  .action-buttons {
    display: flex;
    gap: 0.25rem;
  }
</style>
