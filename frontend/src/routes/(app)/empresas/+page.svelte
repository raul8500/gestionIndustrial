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
    tipo?: any;
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
    tipo: '',
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

  let tiposEmpresa: { _id: string; nombre: string }[] = $state([]);

  function emptyForm() {
    return {
      razonSocial: '', sucursal: '', rfc: '', telefono: '', correo: '',
      tipo: '', status: 1 as number,
      direccion: { calle: '', noExterior: '', noInterior: '', colonia: '', cp: '', localidad: '', municipio: '', estado: '' },
      notificaciones: { calle: '', noExterior: '', noInterior: '', colonia: '', cp: '', localidad: '', municipio: '', telefono: '', correo: '' },
      representanteLegal: { nombre: '', correo: '', telefono: '' }
    };
  }

  onMount(() => {
    fetchEmpresas();
    fetchTiposEmpresa();
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

  async function fetchTiposEmpresa() {
    try {
      const data = await api.get<any>('/gestionambiental/tipos-empresa');
      tiposEmpresa = data || [];
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
      tipo: empresa.tipo?._id || empresa.tipo || '',
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
        await api.post('/gestionambiental/empresas/', payload);
        toast.success('Empresa creada correctamente');
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

  function getTipoNombre(empresa: Empresa): string {
    if (empresa.tipo && typeof empresa.tipo === 'object' && empresa.tipo.nombre) {
      return empresa.tipo.nombre;
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
    <!-- Información de la Empresa -->
    <h5 class="section-title"><i class="fas fa-building"></i> Información de la Empresa</h5>
    <div class="row">
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Razón Social *</label>
          <input class="form-input" bind:value={form.razonSocial} required />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Tipo de Empresa</label>
          <select class="form-select" bind:value={form.tipo}>
            <option value="">Seleccionar...</option>
            {#each tiposEmpresa as tipo}
              <option value={tipo._id}>{tipo.nombre}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Sucursal</label>
          <input class="form-input" bind:value={form.sucursal} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">RFC *</label>
          <input class="form-input" bind:value={form.rfc} required />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Teléfono *</label>
          <input class="form-input" type="tel" bind:value={form.telefono} required />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Correo Electrónico *</label>
          <input class="form-input" type="email" bind:value={form.correo} required />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Calle *</label>
          <input class="form-input" bind:value={form.direccion.calle} required />
        </div>
      </div>
      <div class="col-3">
        <div class="form-group">
          <label class="form-label">No. Exterior</label>
          <input class="form-input" bind:value={form.direccion.noExterior} />
        </div>
      </div>
      <div class="col-3">
        <div class="form-group">
          <label class="form-label">No. Interior</label>
          <input class="form-input" bind:value={form.direccion.noInterior} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Colonia *</label>
          <input class="form-input" bind:value={form.direccion.colonia} required />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Código Postal *</label>
          <input class="form-input" bind:value={form.direccion.cp} required />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Localidad</label>
          <input class="form-input" bind:value={form.direccion.localidad} />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Municipio *</label>
          <input class="form-input" bind:value={form.direccion.municipio} required />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Estado *</label>
          <input class="form-input" bind:value={form.direccion.estado} required />
        </div>
      </div>
      {#if editingId}
        <div class="col-4">
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

    <!-- Datos para Notificaciones -->
    <h5 class="section-title"><i class="fas fa-bell"></i> Datos para Notificaciones</h5>
    <div class="row">
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Calle para Notificaciones</label>
          <input class="form-input" bind:value={form.notificaciones.calle} />
        </div>
      </div>
      <div class="col-3">
        <div class="form-group">
          <label class="form-label">No. Exterior</label>
          <input class="form-input" bind:value={form.notificaciones.noExterior} />
        </div>
      </div>
      <div class="col-3">
        <div class="form-group">
          <label class="form-label">No. Interior</label>
          <input class="form-input" bind:value={form.notificaciones.noInterior} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Colonia</label>
          <input class="form-input" bind:value={form.notificaciones.colonia} />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Código Postal</label>
          <input class="form-input" bind:value={form.notificaciones.cp} />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Localidad</label>
          <input class="form-input" bind:value={form.notificaciones.localidad} />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Municipio</label>
          <input class="form-input" bind:value={form.notificaciones.municipio} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Teléfono para Notificaciones</label>
          <input class="form-input" type="tel" bind:value={form.notificaciones.telefono} />
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Correo para Notificaciones</label>
          <input class="form-input" type="email" bind:value={form.notificaciones.correo} />
        </div>
      </div>
    </div>

    <!-- Representante Legal -->
    <h5 class="section-title"><i class="fas fa-user-tie"></i> Información del Representante Legal</h5>
    <div class="row">
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Nombre del Representante *</label>
          <input class="form-input" bind:value={form.representanteLegal.nombre} required />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Correo del Representante *</label>
          <input class="form-input" type="email" bind:value={form.representanteLegal.correo} required />
        </div>
      </div>
      <div class="col-4">
        <div class="form-group">
          <label class="form-label">Teléfono del Representante *</label>
          <input class="form-input" type="tel" bind:value={form.representanteLegal.telefono} required />
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
        <span class="detail-label">Tipo de Empresa</span>
        <span class="detail-value">{getTipoNombre(viewingEmpresa)}</span>
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

  .section-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--primary-color);
    margin: 1.25rem 0 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--gray-200);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-title:first-child {
    margin-top: 0;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .col-3 { flex: 0 0 calc(25% - 0.75rem); min-width: 120px; }
  .col-4 { flex: 0 0 calc(33.333% - 0.75rem); min-width: 150px; }
  .col-6 { flex: 0 0 calc(50% - 0.75rem); min-width: 200px; }

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
</style>
