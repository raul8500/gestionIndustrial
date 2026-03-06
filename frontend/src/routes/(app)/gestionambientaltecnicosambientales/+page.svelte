<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import { toast } from '$lib/stores/toast';
  import { confirmDelete } from '$lib/utils/confirmDialog';

  interface Tecnico {
    _id: string;
    nombre: string;
    estatus?: string;
  }

  let tecnicos: Tecnico[] = $state([]);
  let loading = $state(true);

  let showModal = $state(false);
  let modalTitle = $state('Nuevo Técnico');
  let editingId = $state<string | null>(null);
  let form = $state({ nombre: '', estatus: 'Activo' });

  onMount(() => {
    fetchTecnicos();
  });

  async function fetchTecnicos() {
    loading = true;
    try {
      const data = await api.get<Tecnico[]>('/gestionambiental/tecnicos-ambientales');
      tecnicos = data || [];
    } catch {
      toast.error('Error', 'No se pudieron cargar los técnicos');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Nuevo Técnico Ambiental';
    form = { nombre: '', estatus: 'Activo' };
    showModal = true;
  }

  function openEditModal(tecnico: Tecnico) {
    editingId = tecnico._id;
    modalTitle = 'Editar Técnico Ambiental';
    form = { nombre: tecnico.nombre, estatus: tecnico.estatus || 'Activo' };
    showModal = true;
  }

  async function handleSubmit() {
    try {
      if (editingId) {
        await api.put(`/gestionambiental/tecnicos-ambientales/${editingId}`, form);
        toast.success('Técnico actualizado');
      } else {
        await api.post('/gestionambiental/tecnicos-ambientales', form);
        toast.success('Técnico creado');
      }
      showModal = false;
      fetchTecnicos();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar');
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete('tecnico'))) return;
    try {
      await api.delete(`/gestionambiental/tecnicos-ambientales/${id}`);
      toast.success('Técnico eliminado');
      fetchTecnicos();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo eliminar');
    }
  }
</script>

<svelte:head>
  <title>Técnicos Ambientales - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-user-tie"></i> Técnicos Ambientales</h1>
  <button class="btn btn-primary" onclick={openCreateModal}>
    <i class="fas fa-plus"></i> Nuevo Técnico
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
        {#each tecnicos as tecnico, i}
          <tr>
            <td>{i + 1}</td>
            <td>{tecnico.nombre}</td>
            <td>
              <span class="badge" class:badge-success={tecnico.estatus === 'Activo'} class:badge-danger={tecnico.estatus !== 'Activo'}>
                {tecnico.estatus || 'N/A'}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick={() => openEditModal(tecnico)} title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(tecnico._id)} title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="text-center text-muted" style="padding: 2rem;">
              No se encontraron técnicos ambientales
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
