<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { toast } from '$lib/stores/toast';

  interface Direccion {
    calle: string;
    noExterior: string;
    noInterior: string;
    colonia: string;
    cp: string;
    localidad: string;
    municipio: string;
    estado: string;
    latitud: string;
    longitud: string;
  }

  interface Notificaciones {
    calle: string;
    noExterior: string;
    noInterior: string;
    colonia: string;
    cp: string;
    localidad: string;
    municipio: string;
    telefono: string;
    correo: string;
  }

  interface RepresentanteLegal {
    nombre: string;
    correo: string;
    telefono: string;
  }

  interface Empresa {
    _id: string;
    codigo?: string;
    razonSocial: string;
    sucursal?: string;
    rfc: string;
    telefono: string;
    correo: string;
    direccion: Direccion;
    sector?: any;
    actividadEconomica?: any;
    notificaciones?: Notificaciones;
    representanteLegal: RepresentanteLegal;
    status?: number | string;
  }

  function isActivo(status: number | string | undefined): boolean {
    return status === 1 || status === '1' || status === 'Activo';
  }

  function statusLabel(status: number | string | undefined): string {
    if (status === 1 || status === '1' || status === 'Activo') return 'Activo';
    if (status === 0 || status === '0' || status === 2 || status === '2' || status === 'Inactivo') return 'Inactivo';
    return 'N/A';
  }

  let empresas: Empresa[] = $state([]);
  let loading = $state(true);
  let searchTerm = $state('');
  let currentPage = $state(1);
  let perPage = $state(10);
  let totalEmpresas = $state(0);
  let empresasActivas = $state(0);

  // Filter state
  let statusFilter = $state('');
  let sortOrder = $state('normal');

  // Modal state
  let showModal = $state(false);
  let showViewModal = $state(false);
  let modalTitle = $state('Nueva Empresa');
  let editingId = $state<string | null>(null);
  let viewingEmpresa = $state<Empresa | null>(null);

  // Form data
  let form = $state({
    razonSocial: '',
    sucursal: '',
    rfc: '',
    telefono: '',
    correo: '',
    sector: '',
    actividadEconomica: '',
    status: 1 as number,
    direccion: {
      calle: '', noExterior: '', noInterior: '', colonia: '',
      cp: '', localidad: '', municipio: '', estado: ''
    },
    notificaciones: {
      calle: '', noExterior: '', noInterior: '', colonia: '',
      cp: '', localidad: '', municipio: '', telefono: '', correo: ''
    },
    representanteLegal: {
      nombre: '', correo: '', telefono: ''
    }
  });

  let sectores: { _id: string; nombre: string }[] = $state([]);
  let actividadesEconomicas: { _id: string; nombre: string }[] = $state([]);

  function emptyForm() {
    return {
      razonSocial: '', sucursal: '', rfc: '', telefono: '', correo: '',
      sector: '', actividadEconomica: '', status: 1 as number,
      direccion: { calle: '', noExterior: '', noInterior: '', colonia: '', cp: '', localidad: '', municipio: '', estado: '', latitud: '', longitud: '' },
      notificaciones: { calle: '', noExterior: '', noInterior: '', colonia: '', cp: '', localidad: '', municipio: '', telefono: '', correo: '' },
      representanteLegal: { nombre: '', correo: '', telefono: '' }
    };
  }

  onMount(() => {
    fetchEmpresas();
    fetchSectores();
    fetchActividadesEconomicas();
  });

  async function fetchEmpresas() {
    loading = true;
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: String(perPage),
        busqueda: searchTerm,
        orden: sortOrder
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const data = await api.get<any>('/gestionambiental/empresas/', params);
      empresas = data.empresas || data;
      const pag = data.paginacion;
      totalEmpresas = pag?.totalRegistros ?? data.total ?? empresas.length;
      empresasActivas = data.activas || empresas.filter((e: Empresa) => isActivo(e.status)).length;
    } catch (err) {
      toast.error('Error', 'No se pudieron cargar las empresas');
    } finally {
      loading = false;
    }
  }

  async function fetchSectores() {
    try {
      const data = await api.get<any>('/gestionambiental/sectores');
      sectores = data || [];
    } catch {
      // silent
    }
  }

  async function fetchActividadesEconomicas() {
    try {
      const data = await api.get<any>('/gestionambiental/actividades-economicas');
      actividadesEconomicas = data || [];
    } catch {
      // silent
    }
  }

  function handleSearch() {
    currentPage = 1;
    fetchEmpresas();
  }

  function applyFilters() {
    currentPage = 1;
    fetchEmpresas();
  }

  function clearFilters() {
    searchTerm = '';
    statusFilter = '';
    sortOrder = 'normal';
    currentPage = 1;
    perPage = 10;
    fetchEmpresas();
  }

  function handlePageChange(page: number) {
    currentPage = page;
    fetchEmpresas();
  }

  function openCreateModal() {
    editingId = null;
    modalTitle = 'Nueva Empresa';
    form = emptyForm();
    showModal = true;
  }

  function openEditModal(empresa: Empresa) {
    editingId = empresa._id;
    modalTitle = 'Editar Empresa';
    form = {
      razonSocial: empresa.razonSocial || '',
      sucursal: empresa.sucursal || '',
      rfc: empresa.rfc || '',
      telefono: empresa.telefono || '',
      correo: empresa.correo || '',
      sector: empresa.sector?._id || empresa.sector || '',
      actividadEconomica: empresa.actividadEconomica?._id || empresa.actividadEconomica || '',
      status: typeof empresa.status === 'number' ? empresa.status : 1,
      direccion: {
        calle: empresa.direccion?.calle || '',
        noExterior: empresa.direccion?.noExterior || '',
        noInterior: empresa.direccion?.noInterior || '',
        colonia: empresa.direccion?.colonia || '',
        cp: empresa.direccion?.cp || '',
        localidad: empresa.direccion?.localidad || '',
        municipio: empresa.direccion?.municipio || '',
        estado: empresa.direccion?.estado || ''
      },
      notificaciones: {
        calle: empresa.notificaciones?.calle || '',
        noExterior: empresa.notificaciones?.noExterior || '',
        noInterior: empresa.notificaciones?.noInterior || '',
        colonia: empresa.notificaciones?.colonia || '',
        cp: empresa.notificaciones?.cp || '',
        localidad: empresa.notificaciones?.localidad || '',
        municipio: empresa.notificaciones?.municipio || '',
        telefono: empresa.notificaciones?.telefono || '',
        correo: empresa.notificaciones?.correo || ''
      },
      representanteLegal: {
        nombre: empresa.representanteLegal?.nombre || '',
        correo: empresa.representanteLegal?.correo || '',
        telefono: empresa.representanteLegal?.telefono || ''
      }
    };
    showModal = true;
  }

  function openViewModal(empresa: Empresa) {
    viewingEmpresa = empresa;
    showViewModal = true;
  }

  async function handleSubmit() {
    try {
      const payload: any = { ...form };
      // Send tipo as ObjectId or undefined
      if (!payload.tipo) delete payload.tipo;
      
      if (editingId) {
        await api.put(`/gestionambiental/empresas/${editingId}`, payload);
        toast.success('Empresa actualizada correctamente');
      } else {
        const data = await api.post('/gestionambiental/empresas/', payload) as any;
        toast.success('Empresa creada', `Código asignado: ${data.empresa?.codigo || ''}`);
      }
      showModal = false;
      fetchEmpresas();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar la empresa');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta empresa?')) return;
    try {
      await api.delete(`/gestionambiental/empresas/${id}`);
      toast.success('Empresa eliminada');
      fetchEmpresas();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo eliminar');
    }
  }

  function getSectorNombre(empresa: Empresa): string {
    if (empresa.sector && typeof empresa.sector === 'object' && empresa.sector.nombre) {
      return empresa.sector.nombre;
    }
    return '-';
  }

  function getActividadNombre(empresa: Empresa): string {
    if (empresa.actividadEconomica && typeof empresa.actividadEconomica === 'object' && empresa.actividadEconomica.nombre) {
      return empresa.actividadEconomica.nombre;
    }
    return '-';
  }

  let totalPages = $derived(Math.ceil(totalEmpresas / perPage));
</script>

<svelte:head>
  <title>Gestión de Empresas - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
  <div class="page-header">
    <h1><i class="fas fa-building"></i> Gestión de Empresas</h1>
    <button class="btn btn-primary" onclick={openCreateModal}>
      <i class="fas fa-plus"></i> Nueva Empresa
    </button>
  </div>
</div>

<!-- Stats -->
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">{totalEmpresas}</div>
    <div class="stat-label">Total Empresas</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{empresasActivas}</div>
    <div class="stat-label">Empresas Activas</div>
  </div>
</div>

<!-- Filters -->
<div class="filters-bar">
  <div class="search-wrapper">
    <i class="fas fa-search"></i>
    <input
      type="text"
      class="search-input"
      placeholder="Buscar empresa..."
      bind:value={searchTerm}
      onkeydown={(e) => e.key === 'Enter' && applyFilters()}
    />
  </div>
  <select class="form-select" style="max-width: 150px;" bind:value={statusFilter}>
    <option value="">Todos</option>
    <option value="1">Activos</option>
    <option value="2">Inactivos</option>
  </select>
  <select class="form-select" style="max-width: 150px;" bind:value={sortOrder}>
    <option value="normal">Normal</option>
    <option value="reciente">Reciente</option>
    <option value="antiguo">Antiguo</option>
  </select>
  <select class="form-select" style="max-width: 120px;" bind:value={perPage} onchange={() => { currentPage = 1; fetchEmpresas(); }}>
    <option value={10}>10</option>
    <option value={25}>25</option>
    <option value={50}>50</option>
  </select>
  <button class="btn btn-primary" onclick={applyFilters}>
    <i class="fas fa-filter"></i> Aplicar filtros
  </button>
  <button class="btn btn-secondary" onclick={clearFilters}>
    <i class="fas fa-times"></i> Limpiar
  </button>
</div>

<!-- Table -->
{#if loading}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Cargando empresas...</p>
  </div>
{:else}
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Razón Social</th>
          <th>RFC</th>
          <th>Teléfono</th>
          <th>Status</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each empresas as empresa}
          <tr>
            <td>{empresa.codigo || '-'}</td>
            <td>{empresa.razonSocial}</td>
            <td>{empresa.rfc || '-'}</td>
            <td>{empresa.telefono || '-'}</td>
            <td>
              <span class="badge" class:badge-success={isActivo(empresa.status)} class:badge-danger={!isActivo(empresa.status)}>
                {statusLabel(empresa.status)}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-outline" onclick={() => openViewModal(empresa)} title="Ver">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick={() => openEditModal(empresa)} title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick={() => handleDelete(empresa._id)} title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="text-center text-muted" style="padding: 2rem;">
              No se encontraron empresas
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />
{/if}

<!-- Create/Edit Modal -->
<Modal open={showModal} title={modalTitle} size="lg" onclose={() => showModal = false}>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

    <!-- Información General -->
    <div class="form-section">
      <div class="form-section-header">
        <i class="fas fa-building"></i> Información General
      </div>
      <div class="form-section-body">
        <div class="form-grid cols-2">
          <div class="form-group">
            <label class="form-label">Razón Social *</label>
            <input class="form-input" bind:value={form.razonSocial} required />
          </div>
          <div class="form-group">
            <label class="form-label">RFC *</label>
            <input class="form-input" bind:value={form.rfc} required maxlength="13" style="text-transform: uppercase;" />
          </div>
        </div>
        <div class="form-grid cols-3">
          <div class="form-group">
            <label class="form-label">Sucursal</label>
            <input class="form-input" bind:value={form.sucursal} />
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono *</label>
            <input class="form-input" type="tel" bind:value={form.telefono} required />
          </div>
          <div class="form-group">
            <label class="form-label">Correo Electrónico *</label>
            <input class="form-input" type="email" bind:value={form.correo} required />
          </div>
        </div>
        <div class="form-grid cols-2">
          <div class="form-group">
            <label class="form-label">Sector</label>
            <select class="form-select" bind:value={form.sector}>
              <option value="">Seleccionar...</option>
              {#each sectores as s}
                <option value={s._id}>{s.nombre}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Actividad Económica</label>
            <select class="form-select" bind:value={form.actividadEconomica}>
              <option value="">Seleccionar...</option>
              {#each actividadesEconomicas as act}
                <option value={act._id}>{act.nombre}</option>
              {/each}
            </select>
          </div>
        </div>
        {#if editingId}
          <div class="form-grid cols-3">
            <div class="form-group">
              <label class="form-label">Estatus</label>
              <select class="form-select" bind:value={form.status}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Dirección -->
    <div class="form-section">
      <div class="form-section-header">
        <i class="fas fa-map-marker-alt"></i> Dirección
      </div>
      <div class="form-section-body">
        <div class="form-grid cols-2-1-1">
          <div class="form-group">
            <label class="form-label">Calle *</label>
            <input class="form-input" bind:value={form.direccion.calle} required />
          </div>
          <div class="form-group">
            <label class="form-label">No. Ext.</label>
            <input class="form-input" bind:value={form.direccion.noExterior} />
          </div>
          <div class="form-group">
            <label class="form-label">No. Int.</label>
            <input class="form-input" bind:value={form.direccion.noInterior} />
          </div>
        </div>
        <div class="form-grid cols-3">
          <div class="form-group">
            <label class="form-label">Colonia *</label>
            <input class="form-input" bind:value={form.direccion.colonia} required />
          </div>
          <div class="form-group">
            <label class="form-label">C.P. *</label>
            <input class="form-input" bind:value={form.direccion.cp} required />
          </div>
          <div class="form-group">
            <label class="form-label">Localidad</label>
            <input class="form-input" bind:value={form.direccion.localidad} />
          </div>
        </div>
        <div class="form-grid cols-2">
          <div class="form-group">
            <label class="form-label">Municipio *</label>
            <input class="form-input" bind:value={form.direccion.municipio} required />
          </div>
          <div class="form-group">
            <label class="form-label">Estado *</label>
            <input class="form-input" bind:value={form.direccion.estado} required />
          </div>
        </div>
        <div class="form-grid cols-2">
          <div class="form-group">
            <label class="form-label">Latitud</label>
            <input class="form-input" bind:value={form.direccion.latitud} placeholder="Ej: 19.4326" />
          </div>
          <div class="form-group">
            <label class="form-label">Longitud</label>
            <input class="form-input" bind:value={form.direccion.longitud} placeholder="Ej: -99.1332" />
          </div>
        </div>
      </div>
    </div>

    <!-- Datos para Notificaciones -->
    <div class="form-section">
      <div class="form-section-header">
        <i class="fas fa-bell"></i> Datos para Notificaciones
      </div>
      <div class="form-section-body">
        <div class="form-grid cols-2-1-1">
          <div class="form-group">
            <label class="form-label">Calle</label>
            <input class="form-input" bind:value={form.notificaciones.calle} />
          </div>
          <div class="form-group">
            <label class="form-label">No. Ext.</label>
            <input class="form-input" bind:value={form.notificaciones.noExterior} />
          </div>
          <div class="form-group">
            <label class="form-label">No. Int.</label>
            <input class="form-input" bind:value={form.notificaciones.noInterior} />
          </div>
        </div>
        <div class="form-grid cols-3">
          <div class="form-group">
            <label class="form-label">Colonia</label>
            <input class="form-input" bind:value={form.notificaciones.colonia} />
          </div>
          <div class="form-group">
            <label class="form-label">C.P.</label>
            <input class="form-input" bind:value={form.notificaciones.cp} />
          </div>
          <div class="form-group">
            <label class="form-label">Localidad</label>
            <input class="form-input" bind:value={form.notificaciones.localidad} />
          </div>
        </div>
        <div class="form-grid cols-2">
          <div class="form-group">
            <label class="form-label">Municipio</label>
            <input class="form-input" bind:value={form.notificaciones.municipio} />
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input class="form-input" type="tel" bind:value={form.notificaciones.telefono} />
          </div>
        </div>
        <div class="form-grid cols-2">
          <div class="form-group">
            <label class="form-label">Correo</label>
            <input class="form-input" type="email" bind:value={form.notificaciones.correo} />
          </div>
        </div>
      </div>
    </div>

    <!-- Representante Legal -->
    <div class="form-section">
      <div class="form-section-header">
        <i class="fas fa-user-tie"></i> Representante Legal
      </div>
      <div class="form-section-body">
        <div class="form-grid cols-3">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input class="form-input" bind:value={form.representanteLegal.nombre} required />
          </div>
          <div class="form-group">
            <label class="form-label">Correo *</label>
            <input class="form-input" type="email" bind:value={form.representanteLegal.correo} required />
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono *</label>
            <input class="form-input" type="tel" bind:value={form.representanteLegal.telefono} required />
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--gray-200); margin-top: 1rem;">
      <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>Cancelar</button>
      <button type="submit" class="btn btn-primary">
        <i class="fas fa-save"></i> Guardar Empresa
      </button>
    </div>
  </form>
</Modal>

<!-- View Modal -->
<Modal open={showViewModal} title="Detalle de Empresa" size="lg" onclose={() => showViewModal = false}>
  {#if viewingEmpresa}
    <h5 class="section-title"><i class="fas fa-building"></i> Información de la Empresa</h5>
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Código</span>
        <span class="detail-value">{viewingEmpresa.codigo || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Razón Social</span>
        <span class="detail-value">{viewingEmpresa.razonSocial}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Sucursal</span>
        <span class="detail-value">{viewingEmpresa.sucursal || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">RFC</span>
        <span class="detail-value">{viewingEmpresa.rfc || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Teléfono</span>
        <span class="detail-value">{viewingEmpresa.telefono || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Correo</span>
        <span class="detail-value">{viewingEmpresa.correo || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Sector</span>
        <span class="detail-value">{getSectorNombre(viewingEmpresa)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Actividad Económica</span>
        <span class="detail-value">{getActividadNombre(viewingEmpresa)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-value">
          <span class="badge" class:badge-success={isActivo(viewingEmpresa.status)} class:badge-danger={!isActivo(viewingEmpresa.status)}>
            {statusLabel(viewingEmpresa.status)}
          </span>
        </span>
      </div>
    </div>

    <h5 class="section-title"><i class="fas fa-map-marker-alt"></i> Dirección</h5>
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Calle</span>
        <span class="detail-value">{viewingEmpresa.direccion?.calle || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">No. Exterior</span>
        <span class="detail-value">{viewingEmpresa.direccion?.noExterior || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">No. Interior</span>
        <span class="detail-value">{viewingEmpresa.direccion?.noInterior || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Colonia</span>
        <span class="detail-value">{viewingEmpresa.direccion?.colonia || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Código Postal</span>
        <span class="detail-value">{viewingEmpresa.direccion?.cp || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Localidad</span>
        <span class="detail-value">{viewingEmpresa.direccion?.localidad || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Municipio</span>
        <span class="detail-value">{viewingEmpresa.direccion?.municipio || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Estado</span>
        <span class="detail-value">{viewingEmpresa.direccion?.estado || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Latitud</span>
        <span class="detail-value">{viewingEmpresa.direccion?.latitud || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Longitud</span>
        <span class="detail-value">{viewingEmpresa.direccion?.longitud || '-'}</span>
      </div>
    </div>

    <h5 class="section-title"><i class="fas fa-bell"></i> Datos para Notificaciones</h5>
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Calle</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.calle || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">No. Exterior</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.noExterior || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">No. Interior</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.noInterior || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Colonia</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.colonia || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Código Postal</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.cp || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Localidad</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.localidad || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Municipio</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.municipio || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Teléfono</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.telefono || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Correo</span>
        <span class="detail-value">{viewingEmpresa.notificaciones?.correo || '-'}</span>
      </div>
    </div>

    <h5 class="section-title"><i class="fas fa-user-tie"></i> Representante Legal</h5>
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Nombre</span>
        <span class="detail-value">{viewingEmpresa.representanteLegal?.nombre || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Correo</span>
        <span class="detail-value">{viewingEmpresa.representanteLegal?.correo || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Teléfono</span>
        <span class="detail-value">{viewingEmpresa.representanteLegal?.telefono || '-'}</span>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .action-buttons {
    display: flex;
    gap: 0.25rem;
  }

  /* Form Section Cards */
  .form-section {
    border: 1px solid var(--gray-200);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .form-section-header {
    background: var(--gray-100);
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid var(--gray-200);
  }

  .form-section-body {
    padding: 0.75rem 1rem;
  }

  /* Form Grid Layouts */
  .form-grid {
    display: grid;
    gap: 0.6rem 0.75rem;
    margin-bottom: 0.25rem;
  }

  .form-grid.cols-2 {
    grid-template-columns: 1fr 1fr;
  }

  .form-grid.cols-3 {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .form-grid.cols-2-1-1 {
    grid-template-columns: 2fr 1fr 1fr;
  }

  /* Detail View */
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-value {
    font-size: 0.9rem;
    color: var(--gray-900);
  }

  @media (max-width: 600px) {
    .form-grid.cols-2,
    .form-grid.cols-3,
    .form-grid.cols-2-1-1 {
      grid-template-columns: 1fr;
    }
  }
</style>
