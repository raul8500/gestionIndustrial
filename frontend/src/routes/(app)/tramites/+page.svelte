<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { toast } from '$lib/stores/toast';
  import { auth } from '$lib/stores/auth';
  import { getSocket } from '$lib/socket';
  import type { Socket } from 'socket.io-client';

  // Current user ID for lock ownership checks
  let currentUserId = $state<string | null>(null);
  $effect(() => {
    const unsub = auth.subscribe(s => {
      currentUserId = s.user?.id || s.user?._id || null;
    });
    return unsub;
  });

  interface Tramite {
    _id: string;
    folio?: string;
    empresa?: { _id: string; razonSocial: string } | string;
    empresaNombre?: string;
    fechaEntrada?: string;
    fechaSalida?: string;
    tipo?: string;
    asunto?: string;
    status?: string;
    paginas?: number;
    tecnicos?: string[];
    observaciones?: string;
    lockedBy?: string | { _id: string; name?: string; username?: string };
    lockedByName?: string;
  }

  let tramites: Tramite[] = $state([]);
  let loading = $state(true);
  let searchTerm = $state('');
  let statusFilter = $state('');
  let currentPage = $state(1);
  let perPage = $state(10);
  let totalTramites = $state(0);

  // Stats
  let stats = $state({ total: 0, pendientes: 0, completados: 0 });
  let statusStats = $state<Record<string, number>>({});

  // Modal
  let showModal = $state(false);
  let modalTitle = $state('Nuevo Trámite');
  let editingId = $state<string | null>(null);
  let form = $state<Partial<Tramite>>({
    folio: '', empresa: '', fechaEntrada: '', fechaSalida: '',
    tipo: '', asunto: '', status: 'Ingresado', paginas: 0,
    sector: '', actividadEconomica: '',
    tecnicos: [], observaciones: ''
  });

  // Catalogs
  let empresasList: { _id: string; razonSocial: string }[] = $state([]);
  let tecnicosList: { _id: string; nombre: string }[] = $state([]);
  let sectoresList: { _id: string; nombre: string }[] = $state([]);
  let actividadesList: { _id: string; nombre: string }[] = $state([]);

  const statusOptions = ['Ingresado', 'Turnado', 'Firma', 'Dirección', 'Resguardo', 'Notificado'];

  let socket: Socket | null = null;

  onMount(() => {
    fetchTramites();
    fetchEmpresas();
    fetchTecnicos();
    fetchSectores();
    fetchActividades();
    setupSocket();
  });

  onDestroy(() => {
    // Remove listeners but keep the shared connection alive
    if (socket) {
      socket.off('tramite:create');
      socket.off('tramite:update');
      socket.off('tramite:delete');
      socket.off('tramite:lock');
      socket.off('tramite:unlock');
    }
  });

  function setupSocket() {
    socket = getSocket();
    if (!socket) return;

    socket.on('tramite:create', ({ tramite }: any) => {
      if (!tramite) return;
      // Add to list and refresh
      tramites = [tramite, ...tramites];
      totalTramites++;
      stats.total = totalTramites;
      toast.info('Nuevo trámite creado en tiempo real');
    });

    socket.on('tramite:update', ({ tramite }: any) => {
      if (!tramite?._id) return;
      const idx = tramites.findIndex(t => t._id === tramite._id);
      if (idx >= 0) {
        tramites[idx] = tramite;
        tramites = [...tramites]; // trigger reactivity
      } else {
        tramites = [tramite, ...tramites];
      }
    });

    socket.on('tramite:delete', ({ id }: any) => {
      if (!id) return;
      const idx = tramites.findIndex(t => t._id === id);
      if (idx >= 0) {
        tramites = tramites.filter(t => t._id !== id);
        totalTramites = Math.max(0, totalTramites - 1);
        stats.total = totalTramites;
      }
    });

    socket.on('tramite:lock', ({ id, user }: any) => {
      const t = tramites.find(x => x._id === id);
      if (t) {
        t.lockedBy = user || 'locked';
        t.lockedByName = user?.name || user?.username || 'Otro usuario';
        tramites = [...tramites];
      }
    });

    socket.on('tramite:unlock', ({ id }: any) => {
      const t = tramites.find(x => x._id === id);
      if (t) {
        t.lockedBy = undefined;
        t.lockedByName = undefined;
        tramites = [...tramites];
      }
    });
  }

  async function fetchTramites() {
    loading = true;
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(perPage)
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const data = await api.get<any>('/gestionambiental/tramites/', params);
      tramites = data.tramites || data;
      totalTramites = data.total || tramites.length;
      
      // Calculate stats
      stats.total = totalTramites;
      stats.pendientes = data.pendientes || 0;
      stats.completados = data.completados || 0;
      
      // Status stats
      if (data.statusStats) {
        statusStats = data.statusStats;
      }
    } catch (err) {
      toast.error('Error', 'No se pudieron cargar los trámites');
    } finally {
      loading = false;
    }
  }

  async function fetchEmpresas() {
    try {
      const data = await api.get<any>('/gestionambiental/empresas/');
      empresasList = (data.empresas || data).map((e: any) => ({ _id: e._id, razonSocial: e.razonSocial }));
    } catch { /* silent */ }
  }

  async function fetchTecnicos() {
    try {
      const data = await api.get<any>('/gestionambiental/tecnicos-ambientales');
      tecnicosList = data || [];
    } catch { /* silent */ }
  }

  async function fetchSectores() {
    try {
      const data = await api.get<any>('/gestionambiental/sectores');
      sectoresList = data || [];
    } catch { /* silent */ }
  }

  async function fetchActividades() {
    try {
      const data = await api.get<any>('/gestionambiental/actividades-economicas');
      actividadesList = data || [];
    } catch { /* silent */ }
  }

  function handleSearch() {
    currentPage = 1;
    fetchTramites();
  }

  function handlePageChange(page: number) {
    currentPage = page;
    fetchTramites();
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Nuevo Trámite';
    form = {
      folio: '', empresa: '', fechaEntrada: '', fechaSalida: '',
      tipo: '', asunto: '', status: 'Ingresado', paginas: 0,
      sector: '', actividadEconomica: '',
      tecnicos: [], observaciones: ''
    };
    showModal = true;
  }

  async function openEditModal(tramite: Tramite) {
    // Try to lock the tramite first — block editing if lock fails for ANY reason
    try {
      await api.post(`/gestionambiental/tramites/${tramite._id}/lock`, {});
    } catch (err: any) {
      if (err?.status === 423) {
        toast.warning('Bloqueado', 'Este trámite está siendo editado por otro usuario');
      } else {
        toast.error('Error', err?.message || 'No se pudo bloquear el trámite para edición');
      }
      return; // NEVER open modal if lock failed
    }

    editingId = tramite._id;
    modalTitle = 'Editar Trámite';
    form = {
      ...tramite,
      empresa: typeof tramite.empresa === 'object' ? tramite.empresa?._id : tramite.empresa,
      fechaEntrada: tramite.fechaEntrada ? tramite.fechaEntrada.split('T')[0] : '',
      fechaSalida: tramite.fechaSalida ? tramite.fechaSalida.split('T')[0] : ''
    };
    showModal = true;
  }

  async function closeModal() {
    // Unlock if we were editing
    if (editingId) {
      try {
        await api.post(`/gestionambiental/tramites/${editingId}/unlock`, {});
      } catch {
        // silent — server will auto-expire the lock
      }
    }
    showModal = false;
    editingId = null;
  }

  async function handleSubmit() {
    try {
      if (editingId) {
        await api.put(`/gestionambiental/tramites/${editingId}`, form);
        toast.success('Trámite actualizado correctamente');
      } else {
        await api.post('/gestionambiental/tramites/', form);
        toast.success('Trámite creado correctamente');
      }
      // No need to unlock manually — backend unlocks on save
      showModal = false;
      editingId = null;
      fetchTramites();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar el trámite');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este trámite?')) return;
    try {
      await api.delete(`/gestionambiental/tramites/${id}`);
      toast.success('Trámite eliminado');
      fetchTramites();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo eliminar');
    }
  }

  function getEmpresaNombre(tramite: Tramite): string {
    if (tramite.empresaNombre) return tramite.empresaNombre;
    if (typeof tramite.empresa === 'object' && tramite.empresa) return tramite.empresa.razonSocial;
    return '-';
  }

  function getStatusClass(status: string): string {
    switch (status) {
      case 'Ingresado': return 'badge-info';
      case 'Turnado': return 'badge-primary';
      case 'Firma': return 'badge-warning';
      case 'Dirección': return 'badge-warning';
      case 'Resguardo': return 'badge-danger';
      case 'Notificado': return 'badge-success';
      default: return 'badge-info';
    }
  }

  function isLockedByOther(tramite: Tramite): boolean {
    if (!tramite.lockedBy) return false;
    // If we are currently editing this tramite in our modal, it's not locked for us
    if (editingId === tramite._id) return false;
    // Compare with current user ID (for page-load populated locks)
    if (currentUserId && typeof tramite.lockedBy === 'object' && tramite.lockedBy) {
      if (tramite.lockedBy._id === currentUserId) return false;
    }
    return true;
  }

  function getLockedByName(tramite: Tramite): string {
    if (tramite.lockedByName) return tramite.lockedByName;
    if (typeof tramite.lockedBy === 'object' && tramite.lockedBy) {
      return tramite.lockedBy.name || tramite.lockedBy.username || 'Otro usuario';
    }
    return 'Otro usuario';
  }

  function toggleTecnico(id: string) {
    if (!form.tecnicos) form.tecnicos = [];
    const idx = form.tecnicos.indexOf(id);
    if (idx >= 0) {
      form.tecnicos = form.tecnicos.filter(t => t !== id);
    } else {
      form.tecnicos = [...form.tecnicos, id];
    }
  }

  let totalPages = $derived(Math.ceil(totalTramites / perPage));
</script>

<svelte:head>
  <title>Gestión de Trámites - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-file-alt"></i> Gestión de Trámites</h1>
  <button class="btn btn-primary" onclick={openCreateModal}>
    <i class="fas fa-plus"></i> Nuevo Trámite
  </button>
</div>
</div>

<!-- Stats -->
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">{stats.total}</div>
    <div class="stat-label">Total Trámites</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{stats.pendientes}</div>
    <div class="stat-label">Pendientes</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{stats.completados}</div>
    <div class="stat-label">Completados</div>
  </div>
</div>

<!-- Status detail cards -->
<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
  {#each statusOptions as status}
    <div class="stat-card" style="cursor: pointer;" onclick={() => { statusFilter = status; handleSearch(); }}>
      <div class="stat-value">{statusStats[status] || 0}</div>
      <div class="stat-label">{status}</div>
    </div>
  {/each}
</div>

<!-- Filters -->
<div class="filters-bar">
  <div class="search-wrapper">
    <i class="fas fa-search"></i>
    <input
      type="text"
      class="search-input"
      placeholder="Buscar por folio, asunto..."
      bind:value={searchTerm}
      onkeydown={(e) => e.key === 'Enter' && handleSearch()}
    />
  </div>
  <select class="form-select" style="max-width: 160px;" bind:value={statusFilter} onchange={handleSearch}>
    <option value="">Todos los status</option>
    {#each statusOptions as status}
      <option value={status}>{status}</option>
    {/each}
  </select>
  <select class="form-select" style="max-width: 100px;" bind:value={perPage} onchange={() => { currentPage = 1; fetchTramites(); }}>
    <option value={10}>10</option>
    <option value={25}>25</option>
    <option value={50}>50</option>
  </select>
  <button class="btn btn-primary" onclick={handleSearch}>
    <i class="fas fa-search"></i>
  </button>
  {#if statusFilter}
    <button class="btn btn-secondary" onclick={() => { statusFilter = ''; searchTerm = ''; handleSearch(); }}>
      <i class="fas fa-times"></i> Limpiar
    </button>
  {/if}
</div>

<!-- Table -->
{#if loading}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Cargando trámites...</p>
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
          <tr class:row-locked={isLockedByOther(tramite)}>
            <td><strong>{tramite.folio || '-'}</strong></td>
            <td>{getEmpresaNombre(tramite)}</td>
            <td>{tramite.fechaEntrada ? new Date(tramite.fechaEntrada).toLocaleDateString('es-MX') : '-'}</td>
            <td>{tramite.tipo || '-'}</td>
            <td>{tramite.asunto || '-'}</td>
            <td>
              <span class="badge {getStatusClass(tramite.status || '')}">{tramite.status || 'N/A'}</span>
              {#if isLockedByOther(tramite)}
                <span class="lock-indicator" title="Editando: {getLockedByName(tramite)}">
                  <i class="fas fa-lock"></i> {getLockedByName(tramite)}
                </span>
              {/if}
            </td>
            <td>
              <div class="action-buttons">
                {#if isLockedByOther(tramite)}
                  <button class="btn btn-sm btn-disabled" disabled title="Bloqueado por {getLockedByName(tramite)}">
                    <i class="fas fa-lock"></i>
                  </button>
                {:else}
                  <button class="btn btn-sm btn-primary" onclick={() => openEditModal(tramite)} title="Editar">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick={() => handleDelete(tramite._id)} title="Eliminar">
                    <i class="fas fa-trash"></i>
                  </button>
                {/if}
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
              No se encontraron trámites
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
{/if}

<!-- Create/Edit Modal -->
<Modal open={showModal} title={modalTitle} size="lg" onclose={closeModal}>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="row">
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Folio</label>
          <input class="form-input" bind:value={form.folio} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Empresa *</label>
          <select class="form-select" bind:value={form.empresa} required>
            <option value="">Seleccionar empresa...</option>
            {#each empresasList as empresa}
              <option value={empresa._id}>{empresa.razonSocial}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Fecha de Entrada</label>
          <input class="form-input" type="date" bind:value={form.fechaEntrada} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Fecha de Salida</label>
          <input class="form-input" type="date" bind:value={form.fechaSalida} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <input class="form-input" bind:value={form.tipo} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Asunto</label>
          <input class="form-input" bind:value={form.asunto} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Sector</label>
          <select class="form-select" bind:value={form.sector}>
            <option value="">Seleccionar...</option>
            {#each sectoresList as s}
              <option value={s._id}>{s.nombre}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Actividad Económica</label>
          <select class="form-select" bind:value={form.actividadEconomica}>
            <option value="">Seleccionar...</option>
            {#each actividadesList as act}
              <option value={act._id}>{act.nombre}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" bind:value={form.status}>
            {#each statusOptions as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Páginas</label>
          <input class="form-input" type="number" bind:value={form.paginas} min="0" />
        </div>
      </div>
    </div>

    <!-- Técnicos -->
    <div class="form-group">
      <label class="form-label">Técnicos Ambientales</label>
      <div class="tecnicos-grid">
        {#each tecnicosList as tecnico}
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              checked={form.tecnicos?.includes(tecnico._id)}
              onchange={() => toggleTecnico(tecnico._id)} 
            />
            {tecnico.nombre}
          </label>
        {/each}
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Observaciones</label>
      <textarea class="form-input" bind:value={form.observaciones} rows="3"></textarea>
    </div>

    <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--gray-200); margin-top: 1rem;">
      <button type="button" class="btn btn-secondary" onclick={closeModal}>Cancelar</button>
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

  .tecnicos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--gray-50);
    border-radius: var(--border-radius);
    border: 1px solid var(--gray-200);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
    color: var(--gray-600);
  }

  .checkbox-label input[type="checkbox"] {
    accent-color: var(--primary-color);
  }

  .row-locked {
    background-color: rgba(255, 193, 7, 0.08) !important;
  }

  .lock-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    color: var(--warning-color, #e67e22);
    margin-left: 0.35rem;
    font-weight: 500;
  }

  .lock-indicator i {
    font-size: 0.65rem;
  }

  .btn-disabled {
    background: var(--gray-300);
    color: var(--gray-500);
    cursor: not-allowed;
    border: none;
  }
</style>
