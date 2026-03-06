<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import { toast } from '$lib/stores/toast';
   import { confirmDelete } from '$lib/utils/confirmDialog';

  interface TipoEmpresa {
    _id: string;
    nombre: string;
    estatus?: string;
  }

  let tipos: TipoEmpresa[] = $state([]);
  let loading = $state(true);

  let showModal = $state(false);
  let modalTitle = $state('Nuevo Tipo de Empresa');
  let editingId = $state<string | null>(null);
  let form = $state({ nombre: '', estatus: 'Activo' });

  onMount(() => {
    fetchTipos();
  });

  async function fetchTipos() {
    loading = true;
    try {
      const data = await api.get<TipoEmpresa[]>('/gestionambiental/tipos-empresa');
      tipos = data || [];
    } catch {
      toast.error('Error', 'No se pudieron cargar los tipos de empresa');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Nuevo Tipo de Empresa';
    form = { nombre: '', estatus: 'Activo' };
    showModal = true;
  }

  function openEditModal(tipo: TipoEmpresa) {
    editingId = tipo._id;
    modalTitle = 'Editar Tipo de Empresa';
    form = { nombre: tipo.nombre, estatus: tipo.estatus || 'Activo' };
    showModal = true;
  }

  async function handleSubmit() {
    try {
      if (editingId) {
        await api.put(`/gestionambiental/tipos-empresa/${editingId}`, form);
        toast.success('Tipo de empresa actualizado');
      } else {
        await api.post('/gestionambiental/tipos-empresa', form);
        toast.success('Tipo de empresa creado');
      }
      showModal = false;
      fetchTipos();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar');
    }
  }

  async function handleDelete(id: string) {
      if (!(await confirmDelete('tipo de empresa'))) return;
    try {
      await api.delete(`/gestionambiental/tipos-empresa/${id}`);
      toast.success('Tipo de empresa eliminado');
      fetchTipos();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo eliminar');
    }
  }
</script>

<svelte:head>
  <title>Tipos de Empresa - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-tags"></i> Catálogo: Tipos de Empresa</h1>
  <button class="btn btn-primary" onclick={openCreateModal}>
    <i class="fas fa-plus"></i> Nuevo Tipo
  </button>
</div>
</div>

{#if loading}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Cargando...</p>
  </div>
{:else}
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Nombre</th>
          <th>Estatus</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each tipos as tipo, i}
          <tr>
            <td>{i + 1}</td>
            <td>{tipo.nombre}</td>
            <td>
              <span class="badge" class:badge-success={tipo.estatus === 'Activo'} class:badge-danger={tipo.estatus !== 'Activo'}>
                {tipo.estatus || 'N/A'}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick={() => openEditModal(tipo)} title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(tipo._id)} title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="text-center text-muted" style="padding: 2rem;">
              No se encontraron tipos de empresa
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
      <input class="form-input" bind:value={form.nombre} required />
    </div>
    <div class="form-group">
      <label class="form-label">Estatus</label>
      <select class="form-select" bind:value={form.estatus}>
        <option value="Activo">Activo</option>
        <option value="Inactivo">Inactivo</option>
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

<style>
  .action-buttons {
    display: flex;
    gap: 0.25rem;
  }
</style>
