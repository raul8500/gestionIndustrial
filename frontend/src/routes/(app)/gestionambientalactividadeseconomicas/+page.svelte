<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import { toast } from '$lib/stores/toast';
  import { confirmDelete } from '$lib/utils/confirmDialog';

  interface ActividadEconomica {
    _id: string;
    nombre: string;
    status?: number;
  }

  let actividades: ActividadEconomica[] = $state([]);
  let loading = $state(true);

  let showModal = $state(false);
  let modalTitle = $state('Nueva Actividad Económica');
  let editingId = $state<string | null>(null);
  let form = $state({ nombre: '', status: 1 as number });

  onMount(() => {
    fetchActividades();
  });

  async function fetchActividades() {
    loading = true;
    try {
      const data = await api.get<ActividadEconomica[]>('/gestionambiental/actividades-economicas');
      actividades = data || [];
    } catch {
      toast.error('Error', 'No se pudieron cargar las actividades económicas');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Nueva Actividad Económica';
    form = { nombre: '', status: 1 };
    showModal = true;
  }

  function openEditModal(actividad: ActividadEconomica) {
    editingId = actividad._id;
    modalTitle = 'Editar Actividad Económica';
    form = { nombre: actividad.nombre, status: actividad.status ?? 1 };
    showModal = true;
  }

  async function handleSubmit() {
    try {
      if (editingId) {
        await api.put(`/gestionambiental/actividades-economicas/${editingId}`, form);
        toast.success('Actividad económica actualizada');
      } else {
        await api.post('/gestionambiental/actividades-economicas', form);
        toast.success('Actividad económica creada');
      }
      showModal = false;
      fetchActividades();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar');
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete('actividad economica'))) return;
    try {
      await api.delete(`/gestionambiental/actividades-economicas/${id}`);
      toast.success('Actividad económica eliminada');
      fetchActividades();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo eliminar');
    }
  }
</script>

<svelte:head>
  <title>Actividades Económicas - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-briefcase"></i> Catálogo: Actividades Económicas</h1>
  <button class="btn btn-primary" onclick={openCreateModal}>
    <i class="fas fa-plus"></i> Nueva Actividad
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
        {#each actividades as actividad, i}
          <tr>
            <td>{i + 1}</td>
            <td>{actividad.nombre}</td>
            <td>
              <span class="badge" class:badge-success={actividad.status === 1} class:badge-danger={actividad.status !== 1}>
                {actividad.status === 1 ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick={() => openEditModal(actividad)} title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(actividad._id)} title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="text-center text-muted" style="padding: 2rem;">
              No se encontraron actividades económicas
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
      <label class="form-label">Nombre *
        <input class="form-input" bind:value={form.nombre} required />
      </label>
    </div>
    <div class="form-group">
      <label class="form-label">Estatus
        <select class="form-select" bind:value={form.status}>
          <option value={1}>Activo</option>
          <option value={0}>Inactivo</option>
        </select>
      </label>
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
