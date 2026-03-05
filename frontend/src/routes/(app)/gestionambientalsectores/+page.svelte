<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import { toast } from '$lib/stores/toast';

  interface Sector {
    _id: string;
    nombre: string;
    status?: number;
  }

  let sectores: Sector[] = $state([]);
  let loading = $state(true);

  let showModal = $state(false);
  let modalTitle = $state('Nuevo Sector');
  let editingId = $state<string | null>(null);
  let form = $state({ nombre: '', status: 1 as number });

  onMount(() => {
    fetchSectores();
  });

  async function fetchSectores() {
    loading = true;
    try {
      const data = await api.get<Sector[]>('/gestionambiental/sectores');
      sectores = data || [];
    } catch {
      toast.error('Error', 'No se pudieron cargar los sectores');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Nuevo Sector';
    form = { nombre: '', status: 1 };
    showModal = true;
  }

  function openEditModal(sector: Sector) {
    editingId = sector._id;
    modalTitle = 'Editar Sector';
    form = { nombre: sector.nombre, status: sector.status ?? 1 };
    showModal = true;
  }

  async function handleSubmit() {
    try {
      if (editingId) {
        await api.put(`/gestionambiental/sectores/${editingId}`, form);
        toast.success('Sector actualizado');
      } else {
        await api.post('/gestionambiental/sectores', form);
        toast.success('Sector creado');
      }
      showModal = false;
      fetchSectores();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este sector?')) return;
    try {
      await api.delete(`/gestionambiental/sectores/${id}`);
      toast.success('Sector eliminado');
      fetchSectores();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo eliminar');
    }
  }
</script>

<svelte:head>
  <title>Sectores - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-industry"></i> Catálogo: Sectores</h1>
  <button class="btn btn-primary" onclick={openCreateModal}>
    <i class="fas fa-plus"></i> Nuevo Sector
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
        {#each sectores as sector, i}
          <tr>
            <td>{i + 1}</td>
            <td>{sector.nombre}</td>
            <td>
              <span class="badge" class:badge-success={sector.status === 1} class:badge-danger={sector.status !== 1}>
                {sector.status === 1 ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick={() => openEditModal(sector)} title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(sector._id)} title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="text-center text-muted" style="padding: 2rem;">
              No se encontraron sectores
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
