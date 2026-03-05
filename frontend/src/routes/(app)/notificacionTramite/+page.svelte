<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import api from '$lib/api';
  import Pagination from '$lib/components/Pagination.svelte';
  import { toast } from '$lib/stores/toast';
  import { getSocket } from '$lib/socket';
  import type { Socket } from 'socket.io-client';

  interface Tramite {
    _id: string;
    folio?: string;
    empresa?: { _id: string; razonSocial: string } | string;
    empresaNombre?: string;
    fechaEntrada?: string;
    tipo?: string;
    asunto?: string;
    status?: string;
  }

  let tramites: Tramite[] = $state([]);
  let loading = $state(true);
  let searchTerm = $state('');
  let currentPage = $state(1);
  let perPage = $state(10);
  let totalTramites = $state(0);

  let socket: Socket | null = null;

  onMount(() => {
    fetchNotificaciones();
    setupSocket();
  });

  onDestroy(() => {
    if (socket) {
      socket.off('tramite:create');
      socket.off('tramite:update');
      socket.off('tramite:delete');
    }
  });

  function setupSocket() {
    socket = getSocket();
    if (!socket) return;

    // When a tramite is created/updated with status "Resguardo", it should appear here
    socket.on('tramite:create', ({ tramite }: any) => {
      if (!tramite || tramite.status !== 'Resguardo') return;
      tramites = [tramite, ...tramites];
      totalTramites++;
      toast.info('Nueva notificación recibida');
    });

    socket.on('tramite:update', ({ tramite }: any) => {
      if (!tramite?._id) return;
      const idx = tramites.findIndex(t => t._id === tramite._id);
      if (tramite.status === 'Resguardo') {
        if (idx >= 0) {
          tramites[idx] = tramite;
          tramites = [...tramites];
        } else {
          tramites = [tramite, ...tramites];
          totalTramites++;
        }
      } else {
        // Status changed away from Resguardo — remove from list
        if (idx >= 0) {
          tramites = tramites.filter(t => t._id !== tramite._id);
          totalTramites = Math.max(0, totalTramites - 1);
        }
      }
    });

    socket.on('tramite:delete', ({ id }: any) => {
      if (!id) return;
      const idx = tramites.findIndex(t => t._id === id);
      if (idx >= 0) {
        tramites = tramites.filter(t => t._id !== id);
        totalTramites = Math.max(0, totalTramites - 1);
      }
    });
  }

  async function fetchNotificaciones() {
    loading = true;
    try {
      const data = await api.get<any>('/gestionambiental/tramites/status/Resguardo', {
        page: String(currentPage),
        limit: String(perPage),
        search: searchTerm
      });
      tramites = data.tramites || data;
      totalTramites = data.total || tramites.length;
    } catch {
      toast.error('Error', 'No se pudieron cargar las notificaciones');
    } finally {
      loading = false;
    }
  }

  function handleSearch() {
    currentPage = 1;
    fetchNotificaciones();
  }

  function handlePageChange(page: number) {
    currentPage = page;
    fetchNotificaciones();
  }

  function getEmpresaNombre(tramite: Tramite): string {
    if (tramite.empresaNombre) return tramite.empresaNombre;
    if (typeof tramite.empresa === 'object' && tramite.empresa) return tramite.empresa.razonSocial;
    return '-';
  }

  async function handleNotificar(id: string) {
    if (!confirm('¿Marcar este trámite como Notificado?')) return;
    try {
      await api.put(`/gestionambiental/tramites/${id}`, { status: 'Notificado' });
      toast.success('Trámite marcado como Notificado');
      fetchNotificaciones();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo actualizar');
    }
  }

  let totalPages = $derived(Math.ceil(totalTramites / perPage));
</script>

<svelte:head>
  <title>Notificaciones - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-bell"></i> Notificaciones</h1>
</div>
</div>

<p class="text-muted mb-3">Trámites en resguardo pendientes de notificación.</p>

<!-- Search -->
<div class="filters-bar">
  <div class="search-wrapper">
    <i class="fas fa-search"></i>
    <input
      type="text"
      class="search-input"
      placeholder="Buscar por folio u observaciones..."
      bind:value={searchTerm}
      onkeydown={(e) => e.key === 'Enter' && handleSearch()}
    />
  </div>
  <button class="btn btn-primary" onclick={handleSearch}>
    <i class="fas fa-search"></i> Buscar
  </button>
</div>

{#if loading}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Cargando notificaciones...</p>
  </div>
{:else}
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Folio</th>
          <th>Empresa</th>
          <th>Fecha Entrada</th>
          <th>Tipo</th>
          <th>Asunto</th>
          <th>Status</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each tramites as tramite}
          <tr>
            <td><strong>{tramite.folio || '-'}</strong></td>
            <td>{getEmpresaNombre(tramite)}</td>
            <td>{tramite.fechaEntrada ? new Date(tramite.fechaEntrada).toLocaleDateString('es-MX') : '-'}</td>
            <td>{tramite.tipo || '-'}</td>
            <td>{tramite.asunto || '-'}</td>
            <td>
              <span class="badge badge-danger">{tramite.status || 'Resguardo'}</span>
            </td>
            <td>
              <button class="btn btn-sm btn-success" onclick={() => handleNotificar(tramite._id)} title="Marcar como Notificado">
                <i class="fas fa-check"></i> Notificar
              </button>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
              No hay trámites pendientes de notificación
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
{/if}
