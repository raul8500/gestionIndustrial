<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import api from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { toast } from '$lib/stores/toast';
  import { auth } from '$lib/stores/auth';
  import { getSocket } from '$lib/socket';
  import { confirmDelete } from '$lib/utils/confirmDialog';
  import type { Socket } from 'socket.io-client';

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
    isDeleted?: boolean;
    lockedBy?: string | { _id?: string; name?: string; username?: string } | null;
    lockedByName?: string;
  }

  interface AuditChange {
    campo: string;
    antes?: string | null;
    despues?: string | null;
  }

  interface AuditEntry {
    _id: string;
    accion: string;
    fecha: string;
    usuarioNombre?: string;
    descripcion?: string;
    cambios?: AuditChange[];
  }

  interface AuditPagination {
    pagina: number;
    totalPaginas: number;
    totalRegistros: number;
    registrosPorPagina: number;
    tieneSiguiente: boolean;
    tieneAnterior: boolean;
  }

  interface AuditResponse {
    historial?: AuditEntry[];
    paginacion?: Partial<AuditPagination>;
  }

  interface AuditCacheEntry {
    historial: AuditEntry[];
    paginacion: AuditPagination;
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
  let empresasInactivas = $state(0);
  let totalEmpresasFiltradas = $state(0);

  // Filter state
  let statusFilter = $state('');
  let sortOrder = $state('normal');

  // Modal state
  let showModal = $state(false);
  let showViewModal = $state(false);
  let showAuditModal = $state(false);
  let showRestoreModal = $state(false);
  let modalTitle = $state('Nueva Empresa');
  let editingId = $state<string | null>(null);
  let currentUserId = $state<string | null>(null);
  let hasEmpresaLock = $state(false);
  let viewingEmpresa = $state<Empresa | null>(null);
  let canViewAudit = $state(false);
  let auditLoading = $state(false);
  let auditEmpresaId = $state('');
  let auditEmpresaNombre = $state('');
  let auditPage = $state(1);
  let auditTotalPages = $state(1);
  let auditTotalRegistros = $state(0);
  let auditEntries = $state<AuditEntry[]>([]);
  let auditCache = $state<Record<string, AuditCacheEntry>>({});
  let restoreTargetEmpresa = $state<Empresa | null>(null);
  let restoreLoading = $state(false);

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
      cp: '', localidad: '', municipio: '', estado: '', latitud: '', longitud: ''
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
  let telefonos = $state<string[]>(['']);
  let correos = $state<string[]>(['']);
  let socket: Socket | null = null;
  let realtimeRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
  let editAutoCloseTimeout: ReturnType<typeof setTimeout> | null = null;

  const REALTIME_REFRESH_DELAY_MS = 250;
  const AUDIT_PAGE_SIZE = 5;
  const EDIT_MODAL_MAX_DURATION_MS = 1 * 60 * 1000;

  function clearEditAutoCloseTimer() {
    if (editAutoCloseTimeout) {
      clearTimeout(editAutoCloseTimeout);
      editAutoCloseTimeout = null;
    }
  }

  function startEditAutoCloseTimer(empresaId: string) {
    clearEditAutoCloseTimer();

    editAutoCloseTimeout = setTimeout(() => {
      if (!showModal || editingId !== empresaId) return;
      void closeEmpresaModalByTimeout();
    }, EDIT_MODAL_MAX_DURATION_MS);
  }

  function isLockedByOther(empresa: Empresa): boolean {
    if (!empresa?.lockedBy) return false;

    if (hasEmpresaLock && editingId === empresa._id) {
      return false;
    }

    if (currentUserId && typeof empresa.lockedBy === 'object' && empresa.lockedBy?._id) {
      if (empresa.lockedBy._id === currentUserId) return false;
    }

    return true;
  }

  function getLockedByName(empresa: Empresa): string {
    if (empresa.lockedByName) return empresa.lockedByName;
    if (typeof empresa.lockedBy === 'object' && empresa.lockedBy) {
      return empresa.lockedBy.name || empresa.lockedBy.username || 'otro usuario';
    }
    return 'otro usuario';
  }

  function handleEmpresaLockEvent(payload: any) {
    const id = String(payload?.id || '');
    if (!id) return;
    const user = payload?.user || null;

    empresas = empresas.map((empresa) => {
      if (empresa._id !== id) return empresa;
      return {
        ...empresa,
        lockedBy: user,
        lockedByName: user?.name || user?.username || 'otro usuario'
      };
    });
  }

  function handleEmpresaUnlockEvent(payload: any) {
    const id = String(payload?.id || '');
    if (!id) return;

    empresas = empresas.map((empresa) => {
      if (empresa._id !== id) return empresa;
      return {
        ...empresa,
        lockedBy: null,
        lockedByName: ''
      };
    });
  }

  async function acquireEmpresaLock(empresaId: string): Promise<boolean> {
    try {
      await api.post(`/gestionambiental/empresas/${empresaId}/lock`);
      hasEmpresaLock = true;
      return true;
    } catch (err: any) {
      if (err?.status === 423) {
        toast.warning('Bloqueada', err.message || 'Esta empresa esta siendo editada por otro usuario');
      } else {
        toast.error('Error', err?.message || 'No se pudo bloquear la empresa para edicion');
      }
      return false;
    }
  }

  async function releaseEmpresaLock(empresaId: string | null) {
    if (!empresaId || !hasEmpresaLock) return;
    try {
      await api.post(`/gestionambiental/empresas/${empresaId}/unlock`);
    } catch {
      // silent: el lock tiene TTL y no debe bloquear UX
    } finally {
      hasEmpresaLock = false;
    }
  }

  async function refreshFromRealtime() {
    try {
      await Promise.all([fetchEmpresas(), fetchEstadisticas()]);
    } catch (_error) {
      // silent: evitar ruido si llega evento durante transicion de pagina
    }
  }

  function scheduleRealtimeRefresh() {
    if (realtimeRefreshTimeout) {
      clearTimeout(realtimeRefreshTimeout);
    }

    // Agrupa eventos cercanos para evitar multiples recargas seguidas
    realtimeRefreshTimeout = setTimeout(() => {
      realtimeRefreshTimeout = null;
      auditCache = {};
      void refreshFromRealtime();
    }, REALTIME_REFRESH_DELAY_MS);
  }

  function setupSocketListeners() {
    socket = getSocket();
    if (!socket) return;

    socket.on('empresa:create', scheduleRealtimeRefresh);
    socket.on('empresa:update', scheduleRealtimeRefresh);
    socket.on('empresa:delete', scheduleRealtimeRefresh);
    socket.on('empresa:restore', scheduleRealtimeRefresh);
    socket.on('empresa:lock', handleEmpresaLockEvent);
    socket.on('empresa:unlock', handleEmpresaUnlockEvent);
  }

  function cleanupSocketListeners() {
    if (socket) {
      socket.off('empresa:create', scheduleRealtimeRefresh);
      socket.off('empresa:update', scheduleRealtimeRefresh);
      socket.off('empresa:delete', scheduleRealtimeRefresh);
      socket.off('empresa:restore', scheduleRealtimeRefresh);
      socket.off('empresa:lock', handleEmpresaLockEvent);
      socket.off('empresa:unlock', handleEmpresaUnlockEvent);
    }

    if (realtimeRefreshTimeout) {
      clearTimeout(realtimeRefreshTimeout);
      realtimeRefreshTimeout = null;
    }

    clearEditAutoCloseTimer();
  }

  function getAuditCacheKey(empresaId: string, page: number): string {
    return `${empresaId}:${page}`;
  }

  function clearAuditCacheForEmpresa(empresaId: string) {
    if (!empresaId) return;

    const next: Record<string, AuditCacheEntry> = {};
    for (const key of Object.keys(auditCache)) {
      if (!key.startsWith(`${empresaId}:`)) {
        next[key] = auditCache[key];
      }
    }
    auditCache = next;
  }

  async function loadAuditPage(empresaId: string, page: number) {
    const safePage = Math.max(1, Math.trunc(page));
    const cacheKey = getAuditCacheKey(empresaId, safePage);
    const cached = auditCache[cacheKey];

    if (cached) {
      auditEntries = cached.historial;
      auditPage = cached.paginacion.pagina;
      auditTotalPages = cached.paginacion.totalPaginas;
      auditTotalRegistros = cached.paginacion.totalRegistros;
      return;
    }

    auditLoading = true;
    try {
      const data = await api.get<AuditResponse>(
        `/gestionambiental/empresas/${empresaId}/auditoria`,
        { limit: String(AUDIT_PAGE_SIZE), page: String(safePage) }
      );

      const historial = Array.isArray(data?.historial) ? data.historial : [];
      const raw = data?.paginacion || {};

      const paginaRaw = Number(raw.pagina ?? safePage);
      const totalPaginasRaw = Number(raw.totalPaginas ?? 1);
      const totalRegistrosRaw = Number(raw.totalRegistros ?? historial.length);
      const registrosPorPaginaRaw = Number(raw.registrosPorPagina ?? AUDIT_PAGE_SIZE);

      const paginacion: AuditPagination = {
        pagina: Number.isFinite(paginaRaw) ? Math.max(1, paginaRaw) : safePage,
        totalPaginas: Number.isFinite(totalPaginasRaw) ? Math.max(1, totalPaginasRaw) : 1,
        totalRegistros: Number.isFinite(totalRegistrosRaw) ? Math.max(0, totalRegistrosRaw) : historial.length,
        registrosPorPagina: Number.isFinite(registrosPorPaginaRaw) ? Math.max(1, registrosPorPaginaRaw) : AUDIT_PAGE_SIZE,
        tieneSiguiente: Boolean(raw.tieneSiguiente),
        tieneAnterior: Boolean(raw.tieneAnterior)
      };

      auditEntries = historial;
      auditPage = paginacion.pagina;
      auditTotalPages = paginacion.totalPaginas;
      auditTotalRegistros = paginacion.totalRegistros;

      auditCache = {
        ...auditCache,
        [cacheKey]: {
          historial,
          paginacion
        }
      };
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo cargar la auditoria');
      showAuditModal = false;
    } finally {
      auditLoading = false;
    }
  }

  function closeAuditModal() {
    showAuditModal = false;
    auditEmpresaId = '';
    auditEmpresaNombre = '';
    auditEntries = [];
    auditPage = 1;
    auditTotalPages = 1;
    auditTotalRegistros = 0;
  }

  function handleAuditPageChange(page: number) {
    if (!auditEmpresaId || auditLoading) return;
    if (page < 1 || page > auditTotalPages || page === auditPage) return;
    void loadAuditPage(auditEmpresaId, page);
  }

  function splitContactValues(value: string | undefined): string[] {
    if (!value) return [''];
    const values = value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return values.length ? values : [''];
  }

  function cleanContactValues(values: string[]): string[] {
    return values.map((value) => value.trim()).filter(Boolean);
  }

  function addTelefono() {
    telefonos = [...telefonos, ''];
  }

  function removeTelefono(index: number) {
    if (telefonos.length === 1) {
      telefonos = [''];
      return;
    }
    telefonos = telefonos.filter((_, i) => i !== index);
  }

  function addCorreo() {
    correos = [...correos, ''];
  }

  function removeCorreo(index: number) {
    if (correos.length === 1) {
      correos = [''];
      return;
    }
    correos = correos.filter((_, i) => i !== index);
  }

  function emptyForm() {
    return {
      razonSocial: '', sucursal: '', rfc: '', telefono: '', correo: '',
      sector: '', actividadEconomica: '', status: 1 as number,
      direccion: { calle: '', noExterior: '', noInterior: '', colonia: '', cp: '', localidad: '', municipio: '', estado: '', latitud: '', longitud: '' },
      notificaciones: { calle: '', noExterior: '', noInterior: '', colonia: '', cp: '', localidad: '', municipio: '', telefono: '', correo: '' },
      representanteLegal: { nombre: '', correo: '', telefono: '' }
    };
  }

  function isAdminOrSupervisor(rol: number | undefined): boolean {
    return rol === 1 || rol === 2;
  }

  function auditActionLabel(accion: string | undefined): string {
    switch (accion) {
      case 'CREACION': return 'Creacion';
      case 'ACTUALIZACION': return 'Actualizacion';
      case 'BORRADO_LOGICO': return 'Borrado';
      case 'RESTAURACION': return 'Restauracion';
      default: return accion || 'Evento';
    }
  }

  function formatAuditDate(fecha: string | undefined): string {
    if (!fecha) return '-';
    const value = new Date(fecha);
    if (Number.isNaN(value.getTime())) return '-';
    return `${value.toLocaleDateString('es-MX')} ${value.toLocaleTimeString('es-MX')}`;
  }

  function formatAuditValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  }

  onMount(() => {
    const setUserState = (user?: { rol?: number; _id?: string; id?: string } | null) => {
      currentUserId = user?._id || user?.id || null;
      canViewAudit = isAdminOrSupervisor(user?.rol);
    };

    const unsubscribe = auth.subscribe((state) => {
      setUserState(state.user);
    });

    setUserState(get(auth).user);
    fetchEmpresas();
    fetchEstadisticas();
    fetchSectores();
    fetchActividadesEconomicas();
    setupSocketListeners();

    return () => {
      if (hasEmpresaLock && editingId) {
        void releaseEmpresaLock(editingId);
      }
      clearEditAutoCloseTimer();
      unsubscribe();
      cleanupSocketListeners();
    };
  });

  async function openAuditModal(empresa: Empresa) {
    if (!canViewAudit) return;
    showAuditModal = true;
    auditEmpresaId = empresa._id;
    auditEmpresaNombre = empresa.razonSocial || empresa.codigo || 'Empresa';
    auditEntries = [];
    auditPage = 1;
    auditTotalPages = 1;
    auditTotalRegistros = 0;

    await loadAuditPage(empresa._id, 1);
  }

  function requestRestore(empresa: Empresa) {
    restoreTargetEmpresa = empresa;
    showRestoreModal = true;
  }

  function closeRestoreModal() {
    if (restoreLoading) return;
    showRestoreModal = false;
    restoreTargetEmpresa = null;
  }

  async function confirmRestore() {
    if (!restoreTargetEmpresa) return;
    restoreLoading = true;

    try {
      const empresaId = restoreTargetEmpresa._id;
      await api.post(`/gestionambiental/empresas/${empresaId}/restaurar`);
      toast.success('Empresa restaurada');
      clearAuditCacheForEmpresa(empresaId);
      showRestoreModal = false;
      restoreTargetEmpresa = null;
      await Promise.all([fetchEmpresas(), fetchEstadisticas()]);
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo restaurar la empresa');
    } finally {
      restoreLoading = false;
    }
  }

  async function fetchEstadisticas() {
    try {
      const stats = await api.get<any>('/gestionambiental/empresas/estadisticas');
      const total = Number(stats?.totalEmpresas ?? 0);
      const activas = Number(stats?.empresasActivas ?? 0);
      const inactivasRaw = Number(stats?.empresasInactivas);

      totalEmpresas = total;
      empresasActivas = activas;
      empresasInactivas = Number.isFinite(inactivasRaw)
        ? inactivasRaw
        : Math.max(total - activas, 0);
    } catch {
      // silent: si falla, la tabla sigue funcionando
    }
  }

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
      totalEmpresasFiltradas = pag?.totalRegistros ?? data.total ?? empresas.length;
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
    clearEditAutoCloseTimer();
    editingId = null;
    modalTitle = 'Nueva Empresa';
    form = emptyForm();
    telefonos = [''];
    correos = [''];
    showModal = true;
  }

  async function openEditModal(empresa: Empresa) {
    if (isLockedByOther(empresa)) {
      toast.warning('Bloqueada', `Esta empresa esta siendo editada por ${getLockedByName(empresa)}`);
      return;
    }

    const lockOk = await acquireEmpresaLock(empresa._id);
    if (!lockOk) return;

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
        estado: empresa.direccion?.estado || '',
        latitud: empresa.direccion?.latitud || '',
        longitud: empresa.direccion?.longitud || ''
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
    telefonos = splitContactValues(empresa.telefono);
    correos = splitContactValues(empresa.correo);
    showModal = true;
    startEditAutoCloseTimer(empresa._id);
  }

  async function closeEmpresaModal() {
    clearEditAutoCloseTimer();
    const lockId = editingId;
    showModal = false;
    editingId = null;

    if (lockId && hasEmpresaLock) {
      await releaseEmpresaLock(lockId);
      await fetchEmpresas();
    }
  }

  async function closeEmpresaModalByTimeout() {
    await closeEmpresaModal();
    toast.warning('Edicion cerrada', 'Se cerro automaticamente por superar 1 minuto sin guardar');
  }

  function openViewModal(empresa: Empresa) {
    viewingEmpresa = empresa;
    showViewModal = true;
  }

  async function handleSubmit() {
    try {
      const telefonosLimpios = cleanContactValues(telefonos);
      const correosLimpios = cleanContactValues(correos).map((correo) => correo.toLowerCase());

      if (!telefonosLimpios.length) {
        toast.error('Validacion', 'Agrega al menos un telefono en informacion general');
        return;
      }

      if (!correosLimpios.length) {
        toast.error('Validacion', 'Agrega al menos un correo electronico en informacion general');
        return;
      }

      const payload: any = {
        ...form,
        telefono: telefonosLimpios.join(', '),
        correo: correosLimpios.join(', ')
      };
      // Send tipo as ObjectId or undefined
      if (!payload.tipo) delete payload.tipo;
      
      if (editingId) {
        const empresaId = editingId;
        await api.put(`/gestionambiental/empresas/${empresaId}`, payload);
        await releaseEmpresaLock(empresaId);
        clearEditAutoCloseTimer();
        toast.success('Empresa actualizada correctamente');
        editingId = null;
      } else {
        const data = await api.post('/gestionambiental/empresas/', payload) as any;
        toast.success('Empresa creada', `Código asignado: ${data.empresa?.codigo || ''}`);
      }
      showModal = false;
      await Promise.all([fetchEmpresas(), fetchEstadisticas()]);
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar la empresa');
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete('empresa'))) return;
    try {
      await api.delete(`/gestionambiental/empresas/${id}`);
      toast.success('Empresa eliminada');
      await Promise.all([fetchEmpresas(), fetchEstadisticas()]);
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

  let totalPages = $derived(Math.ceil(totalEmpresasFiltradas / perPage));
</script>

<svelte:head>
  <title>Gestión de Empresas - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
  <div class="page-header">
    <h1><i class="fas fa-building" style="color: #B28854;"></i> Gestión de Empresas</h1>
    <button class="btn btn-primary empresa-action-btn empresa-action-btn-solid" onclick={openCreateModal}>
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
  <div class="stat-card">
    <div class="stat-value">{empresasInactivas}</div>
    <div class="stat-label">Empresas Inactivas</div>
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
    <option value="0">Inactivos</option>
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
  <button class="btn btn-primary empresa-action-btn empresa-action-btn-solid-soft" onclick={applyFilters}>
    <i class="fas fa-filter"></i> Aplicar filtros
  </button>
  <button class="btn btn-secondary empresa-action-btn empresa-action-btn-outline" onclick={clearFilters}>
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
          <th>Sector</th>
          <th>Actividad Económica</th>
          <th>Status</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each empresas as empresa}
          <tr class:row-deleted={!!empresa.isDeleted}>
            <td><strong>{empresa.codigo || '-'}</strong></td>
            <td>{empresa.razonSocial}</td>
            <td><code>{empresa.rfc || '-'}</code></td>
            <td>{getSectorNombre(empresa)}</td>
            <td>{getActividadNombre(empresa)}</td>
            <td>
              <span class="badge" class:badge-success={isActivo(empresa.status)} class:badge-danger={!isActivo(empresa.status)}>
                {statusLabel(empresa.status)}
              </span>
              {#if empresa.isDeleted}
                <span class="badge badge-deleted">Borrado</span>
              {/if}
            </td>
            <td>
              <div class="action-buttons">
                <button class="action-icon action-view" onclick={() => openViewModal(empresa)} title="Ver">
                  <i class="fas fa-eye"></i>
                </button>
                {#if canViewAudit}
                  <button class="action-icon action-audit" onclick={() => openAuditModal(empresa)} title="Auditoria">
                    <i class="fas fa-clock-rotate-left"></i>
                  </button>
                {/if}
                {#if canViewAudit && empresa.isDeleted}
                  <button class="action-icon action-restore" onclick={() => requestRestore(empresa)} title="Restaurar">
                    <i class="fas fa-rotate-left"></i>
                  </button>
                {/if}
                {#if isLockedByOther(empresa)}
                  <button class="action-icon action-locked" disabled title={`Editando: ${getLockedByName(empresa)}`}>
                    <i class="fas fa-lock"></i>
                  </button>
                {:else}
                  <button class="action-icon action-edit" onclick={() => openEditModal(empresa)} title="Editar">
                    <i class="fas fa-pen-to-square"></i>
                  </button>
                {/if}
                <button class="action-icon action-delete" onclick={() => handleDelete(empresa._id)} title="Eliminar">
                  <i class="fas fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
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
<Modal open={showModal} title={modalTitle} size="lg" onclose={closeEmpresaModal}>
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
        <div class="form-grid cols-3 contact-grid">
          <div class="form-group">
            <label class="form-label">Sucursal</label>
            <input class="form-input" bind:value={form.sucursal} />
          </div>
          <div class="form-group">
            <div class="form-label-row">
              <label class="form-label">Teléfono *</label>
              <button type="button" class="contact-add-btn" onclick={addTelefono}>
                <i class="fas fa-plus"></i> Mas
              </button>
            </div>
            <div class="multi-input-list">
              {#each telefonos as _telefono, i}
                <div class="multi-input-row">
                  <input
                    class="form-input"
                    type="tel"
                    bind:value={telefonos[i]}
                    placeholder={i === 0 ? 'Telefono principal' : `Telefono ${i + 1}`}
                  />
                  {#if telefonos.length > 1}
                    <button
                      type="button"
                      class="contact-remove-btn"
                      onclick={() => removeTelefono(i)}
                      title="Quitar telefono"
                    >
                      <i class="fas fa-minus"></i>
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
          <div class="form-group">
            <div class="form-label-row">
              <label class="form-label">Correo Electrónico *</label>
              <button type="button" class="contact-add-btn" onclick={addCorreo}>
                <i class="fas fa-plus"></i> Mas
              </button>
            </div>
            <div class="multi-input-list">
              {#each correos as _correo, i}
                <div class="multi-input-row">
                  <input
                    class="form-input"
                    type="email"
                    bind:value={correos[i]}
                    placeholder={i === 0 ? 'Correo principal' : `Correo ${i + 1}`}
                  />
                  {#if correos.length > 1}
                    <button
                      type="button"
                      class="contact-remove-btn"
                      onclick={() => removeCorreo(i)}
                      title="Quitar correo"
                    >
                      <i class="fas fa-minus"></i>
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
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
      <button type="button" class="btn btn-secondary" onclick={closeEmpresaModal}>Cancelar</button>
      <button type="submit" class="btn btn-primary">
        <i class="fas fa-save"></i> Guardar Empresa
      </button>
    </div>
  </form>
</Modal>

<!-- View Modal -->
<Modal open={showViewModal} title="" size="lg" onclose={() => showViewModal = false}>
  {#if viewingEmpresa}
    <!-- Header Card -->
    <div class="view-header">
      <div class="view-header-top">
        <div class="view-header-icon">
          <i class="fas fa-building"></i>
        </div>
        <div class="view-header-info">
          <h2 class="view-empresa-name">{viewingEmpresa.razonSocial}</h2>
          <div class="view-header-meta">
            <span class="view-codigo"><i class="fas fa-hashtag"></i> {viewingEmpresa.codigo || 'Sin código'}</span>
            <span class="view-rfc"><i class="fas fa-id-card"></i> {viewingEmpresa.rfc || '-'}</span>
            {#if viewingEmpresa.sucursal}
              <span class="view-sucursal"><i class="fas fa-store"></i> {viewingEmpresa.sucursal}</span>
            {/if}
            <span class="badge" class:badge-success={isActivo(viewingEmpresa.status)} class:badge-danger={!isActivo(viewingEmpresa.status)}>
              {statusLabel(viewingEmpresa.status)}
            </span>
            {#if viewingEmpresa.isDeleted}
              <span class="badge badge-deleted">Borrado</span>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Info Cards Row -->
    <div class="view-cards-row">
      <div class="view-info-card">
        <i class="fas fa-phone"></i>
        <span class="view-info-label">Teléfono</span>
        <span class="view-info-value">{viewingEmpresa.telefono || '-'}</span>
      </div>
      <div class="view-info-card">
        <i class="fas fa-envelope"></i>
        <span class="view-info-label">Correo</span>
        <span class="view-info-value">{viewingEmpresa.correo || '-'}</span>
      </div>
      <div class="view-info-card">
        <i class="fas fa-industry"></i>
        <span class="view-info-label">Sector</span>
        <span class="view-info-value">{getSectorNombre(viewingEmpresa)}</span>
      </div>
      <div class="view-info-card">
        <i class="fas fa-briefcase"></i>
        <span class="view-info-label">Actividad Económica</span>
        <span class="view-info-value">{getActividadNombre(viewingEmpresa)}</span>
      </div>
    </div>

    <!-- Dirección Section -->
    <div class="view-section">
      <div class="view-section-header">
        <i class="fas fa-map-marker-alt"></i> Dirección
      </div>
      <div class="view-section-body">
        <div class="view-address">
          <p class="view-address-line">
            {viewingEmpresa.direccion?.calle || ''}
            {viewingEmpresa.direccion?.noExterior ? ' #' + viewingEmpresa.direccion.noExterior : ''}
            {viewingEmpresa.direccion?.noInterior ? ' Int. ' + viewingEmpresa.direccion.noInterior : ''}
          </p>
          <p class="view-address-line">
            {viewingEmpresa.direccion?.colonia || ''}
            {viewingEmpresa.direccion?.cp ? ', C.P. ' + viewingEmpresa.direccion.cp : ''}
          </p>
          <p class="view-address-line">
            {viewingEmpresa.direccion?.localidad ? viewingEmpresa.direccion.localidad + ', ' : ''}{viewingEmpresa.direccion?.municipio || ''}
            {viewingEmpresa.direccion?.estado ? ', ' + viewingEmpresa.direccion.estado : ''}
          </p>
          {#if viewingEmpresa.direccion?.latitud || viewingEmpresa.direccion?.longitud}
            <p class="view-address-coords">
              <i class="fas fa-map-pin"></i> {viewingEmpresa.direccion?.latitud || '-'}, {viewingEmpresa.direccion?.longitud || '-'}
            </p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Notificaciones Section -->
    {#if viewingEmpresa.notificaciones?.calle}
      <div class="view-section">
        <div class="view-section-header">
          <i class="fas fa-bell"></i> Dirección para Notificaciones
        </div>
        <div class="view-section-body">
          <div class="view-address">
            <p class="view-address-line">
              {viewingEmpresa.notificaciones?.calle || ''}
              {viewingEmpresa.notificaciones?.noExterior ? ' #' + viewingEmpresa.notificaciones.noExterior : ''}
              {viewingEmpresa.notificaciones?.noInterior ? ' Int. ' + viewingEmpresa.notificaciones.noInterior : ''}
            </p>
            <p class="view-address-line">
              {viewingEmpresa.notificaciones?.colonia || ''}
              {viewingEmpresa.notificaciones?.cp ? ', C.P. ' + viewingEmpresa.notificaciones.cp : ''}
            </p>
            <p class="view-address-line">
              {viewingEmpresa.notificaciones?.localidad ? viewingEmpresa.notificaciones.localidad + ', ' : ''}{viewingEmpresa.notificaciones?.municipio || ''}
            </p>
          </div>
          <div class="detail-grid" style="margin-top: 0.75rem;">
            {#if viewingEmpresa.notificaciones?.telefono}
              <div class="detail-item">
                <span class="detail-label">Teléfono</span>
                <span class="detail-value">{viewingEmpresa.notificaciones.telefono}</span>
              </div>
            {/if}
            {#if viewingEmpresa.notificaciones?.correo}
              <div class="detail-item">
                <span class="detail-label">Correo</span>
                <span class="detail-value">{viewingEmpresa.notificaciones.correo}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Representante Legal Section -->
    <div class="view-section">
      <div class="view-section-header">
        <i class="fas fa-user-tie"></i> Representante Legal
      </div>
      <div class="view-section-body">
        <div class="detail-grid cols-3">
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
      </div>
    </div>
  {/if}
</Modal>

<!-- Audit Modal -->
<Modal open={showAuditModal} title={`Auditoria: ${auditEmpresaNombre}`} size="lg" onclose={closeAuditModal}>
  {#if auditLoading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Cargando auditoria...</p>
    </div>
  {:else if auditEntries.length === 0}
    <div class="text-center text-muted" style="padding: 1rem 0;">
      No hay eventos de auditoria registrados para esta empresa
    </div>
  {:else}
    <div class="audit-list">
      {#each auditEntries as evento}
        <div class="audit-card">
          <div class="audit-card-header">
            <span class="badge badge-audit-action">{auditActionLabel(evento.accion)}</span>
            <span class="audit-date">{formatAuditDate(evento.fecha)}</span>
          </div>
          <div class="audit-user">
            <i class="fas fa-user"></i> {evento.usuarioNombre || 'Sistema'}
          </div>
          {#if evento.descripcion}
            <p class="audit-description">{evento.descripcion}</p>
          {/if}
          {#if evento.cambios && evento.cambios.length > 0}
            <div class="audit-changes">
              {#each evento.cambios as cambio}
                <div class="audit-change-row">
                  <span class="audit-change-field">{cambio.campo}</span>
                  <span class="audit-change-values">{formatAuditValue(cambio.antes)} -> {formatAuditValue(cambio.despues)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    <div class="audit-pagination-footer">
      <span class="audit-pagination-summary">
        Mostrando pagina {auditPage} de {auditTotalPages} ({auditTotalRegistros} eventos)
      </span>
      <Pagination currentPage={auditPage} totalPages={auditTotalPages} onPageChange={handleAuditPageChange} />
    </div>
  {/if}
</Modal>

<!-- Restore Modal -->
<Modal open={showRestoreModal} title="Restaurar empresa" onclose={closeRestoreModal}>
  <div class="restore-confirm-content">
    <div class="restore-confirm-icon">
      <i class="fas fa-rotate-left"></i>
    </div>
    <h4 class="restore-confirm-title">¿Deseas restaurar esta empresa?</h4>
    <p class="restore-confirm-text">
      <strong>{restoreTargetEmpresa?.razonSocial || restoreTargetEmpresa?.codigo || 'Empresa seleccionada'}</strong>
      volvera a mostrarse para todos los usuarios con acceso a este modulo.
    </p>
    <div class="restore-confirm-actions">
      <button type="button" class="btn btn-secondary" onclick={closeRestoreModal} disabled={restoreLoading}>
        Cancelar
      </button>
      <button
        type="button"
        class="btn btn-primary empresa-action-btn empresa-action-btn-solid-soft"
        onclick={confirmRestore}
        disabled={restoreLoading}
      >
        <i class="fas fa-rotate-left"></i>
        {restoreLoading ? 'Restaurando...' : 'Si, restaurar'}
      </button>
    </div>
  </div>
</Modal>

<style>
  .empresa-action-btn {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  }

  .empresa-action-btn-solid {
    background: #7A1737;
    border-color: #7A1737;
    color: #ffffff;
  }

  .empresa-action-btn-solid-soft {
    background: rgba(122, 23, 55, 0.85);
    border-color: rgba(122, 23, 55, 0.85);
    color: #ffffff;
  }

  .empresa-action-btn-outline {
    background: rgba(122, 23, 55, 0.08);
    border-color: rgba(122, 23, 55, 0.45);
    color: #7A1737;
  }

  .empresa-action-btn:hover {
    background: rgba(122, 23, 55, 0.2);
    border-color: rgba(122, 23, 55, 0.2);
    color: #7A1737;
    transform: translateY(-1px);
  }

  .empresa-action-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(122, 23, 55, 0.25);
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .row-deleted {
    background: rgba(100, 116, 139, 0.08);
  }

  .badge-deleted {
    background: rgba(71, 85, 105, 0.14);
    color: #334155;
    border: 1px solid rgba(71, 85, 105, 0.35);
    margin-left: 0.35rem;
  }

  .action-icon {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.05rem;
    padding: 0.3rem;
    border-radius: 0.35rem;
    transition: color 0.2s, transform 0.15s;
    line-height: 1;
  }

  .action-icon:hover {
    transform: scale(1.15);
  }

  .action-icon:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }

  .action-icon:disabled:hover {
    transform: none;
  }

  .action-view {
    color: var(--primary-color, #3498db);
  }

  .action-view:hover {
    color: #2471a3;
  }

  .action-edit {
    color: #e67e22;
  }

  .action-edit:hover {
    color: #ca6f1e;
  }

  .action-locked {
    color: #64748b;
  }

  .action-delete {
    color: #e74c3c;
  }

  .action-delete:hover {
    color: #c0392b;
  }

  .action-audit {
    color: #0f766e;
  }

  .action-audit:hover {
    color: #0d9488;
  }

  .action-restore {
    color: #7c3aed;
  }

  .action-restore:hover {
    color: #6d28d9;
  }

  .audit-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .audit-card {
    border: 1px solid var(--gray-200);
    border-radius: 0.55rem;
    padding: 0.75rem;
    background: var(--white);
  }

  .audit-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.35rem;
    flex-wrap: wrap;
  }

  .badge-audit-action {
    background: rgba(122, 23, 55, 0.14);
    color: #7A1737;
    border: 1px solid rgba(122, 23, 55, 0.25);
  }

  .audit-date {
    font-size: 0.78rem;
    color: var(--gray-500);
  }

  .audit-user {
    font-size: 0.82rem;
    color: var(--gray-700);
    margin-bottom: 0.25rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .audit-description {
    margin: 0.2rem 0 0.5rem;
    color: var(--gray-700);
    font-size: 0.85rem;
  }

  .audit-changes {
    border-top: 1px dashed var(--gray-300);
    margin-top: 0.4rem;
    padding-top: 0.45rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .audit-change-row {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 0.55rem;
    font-size: 0.8rem;
  }

  .audit-change-field {
    font-weight: 600;
    color: var(--gray-700);
  }

  .audit-change-values {
    color: var(--gray-600);
    word-break: break-word;
  }

  .audit-pagination-footer {
    margin-top: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .audit-pagination-summary {
    font-size: 0.78rem;
    color: var(--gray-500);
    text-align: right;
  }

  .restore-confirm-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.7rem;
    padding: 0.25rem 0;
  }

  .restore-confirm-icon {
    width: 52px;
    height: 52px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(122, 23, 55, 0.12);
    color: #7A1737;
    font-size: 1.2rem;
    border: 1px solid rgba(122, 23, 55, 0.2);
  }

  .restore-confirm-title {
    margin: 0;
    font-size: 1rem;
    color: var(--gray-900);
  }

  .restore-confirm-text {
    margin: 0;
    color: var(--gray-600);
    line-height: 1.45;
    max-width: 420px;
  }

  .restore-confirm-actions {
    width: 100%;
    display: flex;
    justify-content: center;
    gap: 0.6rem;
    margin-top: 0.35rem;
    flex-wrap: wrap;
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

  .contact-grid {
    align-items: start;
  }

  .form-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  .form-label-row .form-label {
    margin-bottom: 0;
  }

  .multi-input-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .multi-input-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .multi-input-row .form-input {
    flex: 1;
  }

  .contact-add-btn,
  .contact-remove-btn {
    border: 1px solid var(--gray-300);
    background: var(--white);
    color: #7A1737;
    border-radius: 0.4rem;
    cursor: pointer;
    font-size: 0.75rem;
    line-height: 1;
    padding: 0.32rem 0.45rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .contact-add-btn:hover {
    background: rgba(122, 23, 55, 0.1);
    border-color: rgba(122, 23, 55, 0.35);
  }

  .contact-remove-btn {
    color: #9f1239;
    border-color: rgba(159, 18, 57, 0.3);
    flex-shrink: 0;
  }

  .contact-remove-btn:hover {
    background: rgba(159, 18, 57, 0.12);
    border-color: rgba(159, 18, 57, 0.5);
  }

  /* Detail View */
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .detail-grid.cols-3 {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-value {
    font-size: 0.9rem;
    color: var(--gray-900);
  }

  /* View Modal - Header */
  .view-header {
    background: linear-gradient(135deg, #7A1737, rgba(122,23,55,0.8), rgba(122,23,55,0.6));
    border-radius: 0.75rem;
    padding: 1.25rem;
    margin-bottom: 1rem;
    color: white;
  }

  .view-header-top {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .view-header-icon {
    width: 52px;
    height: 52px;
    background: rgba(255,255,255,0.2);
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    flex-shrink: 0;
  }

  .view-header-info {
    flex: 1;
    min-width: 0;
  }

  .view-empresa-name {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0 0 0.35rem;
    line-height: 1.2;
  }

  .view-header-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.8rem;
    opacity: 0.9;
  }

  .view-header-meta i {
    margin-right: 0.2rem;
  }

  /* View Info Cards */
  .view-cards-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.6rem;
    margin-bottom: 1rem;
  }

  .view-info-card {
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }

  .view-info-card > i {
    color: var(--primary-color);
    font-size: 0.9rem;
    margin-bottom: 0.15rem;
  }

  .view-info-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--gray-500);
  }

  .view-info-value {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--gray-900);
    word-break: break-word;
  }

  /* View Sections */
  .view-section {
    border: 1px solid var(--gray-200);
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
    overflow: hidden;
  }

  .view-section-header {
    background: var(--gray-50);
    padding: 0.55rem 0.85rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid var(--gray-200);
  }

  .view-section-body {
    padding: 0.85rem;
  }

  .view-address-line {
    margin: 0;
    font-size: 0.9rem;
    color: var(--gray-800);
    line-height: 1.5;
  }

  .view-address-coords {
    margin: 0.4rem 0 0;
    font-size: 0.8rem;
    color: var(--gray-500);
  }

  @media (max-width: 600px) {
    .form-grid.cols-2,
    .form-grid.cols-3,
    .form-grid.cols-2-1-1 {
      grid-template-columns: 1fr;
    }
    .detail-grid.cols-3 {
      grid-template-columns: 1fr;
    }
    .view-header-top {
      flex-direction: column;
      text-align: center;
    }
    .view-header-meta {
      justify-content: center;
    }
    .audit-change-row {
      grid-template-columns: 1fr;
    }
    .audit-pagination-summary {
      text-align: center;
    }
    .restore-confirm-actions {
      flex-direction: column;
    }
    .restore-confirm-actions .btn {
      width: 100%;
    }
  }
</style>
