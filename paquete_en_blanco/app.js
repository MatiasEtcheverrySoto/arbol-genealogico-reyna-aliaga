/**
 * Árbol Genealógico - Familia Reyna Aliaga
 * Interactive Canvas, Photo Management, SVG Connectors & Tree Architecture
 */

(function () {
  'use strict';

  // --- STATE ---
  let familyData = null;
  let currentView = 'tree'; // 'tree' | 'branches' | 'directory'
  let currentThemeIndex = 0;
  const themes = ['theme-magnolia', 'theme-clean', 'theme-dark'];

  // Canvas Transform State
  const isInitialMobile = window.innerWidth <= 768;
  let scale = isInitialMobile ? (window.innerWidth <= 480 ? 0.6 : 0.7) : 0.85;
  let panX = 150;
  let panY = isInitialMobile ? 30 : 50;
  let isDragging = false;
  let isActuallyDragging = false;
  let lastDragEndTime = 0;
  let startX = 0;
  let startY = 0;
  let activeMemberId = null;

  // DOM Elements
  const canvasViewport = document.getElementById('canvasViewport');
  const canvasContent = document.getElementById('canvasContent');
  const treeDomContainer = document.getElementById('treeDomContainer');
  const treeConnectionsSvg = document.getElementById('treeConnectionsSvg');
  const zoomLevelIndicator = document.getElementById('zoomLevelIndicator');
  const miniMapCanvas = document.getElementById('miniMapCanvas');
  const miniMapLens = document.getElementById('miniMapLens');
  const miniMapContainer = document.getElementById('miniMapContainer');

  // Search & Filter
  const memberSearchInput = document.getElementById('memberSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchResultsDropdown = document.getElementById('searchResultsDropdown');
  const branchFilterSelect = document.getElementById('branchFilterSelect');
  const photoProgressText = document.getElementById('photoProgressText');
  const photoProgressBarFill = document.getElementById('photoProgressBarFill');

  // Views
  const treeViewSection = document.getElementById('treeViewSection');
  const branchesViewSection = document.getElementById('branchesViewSection');
  const directoryViewSection = document.getElementById('directoryViewSection');
  const branchesContainer = document.getElementById('branchesContainer');
  const directoryTableBody = document.getElementById('directoryTableBody');
  const directoryStats = document.getElementById('directoryStats');
  const missingPhotoOnlyCheckbox = document.getElementById('missingPhotoOnlyCheckbox');

  // Modals & Forms
  const memberModal = document.getElementById('memberModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const saveMemberBtn = document.getElementById('saveMemberBtn');
  const deleteMemberBtn = document.getElementById('deleteMemberBtn');
  const modalMemberName = document.getElementById('modalMemberName');
  const modalBranchTag = document.getElementById('modalBranchTag');
  const modalPhotoPreview = document.getElementById('modalPhotoPreview');
  const memberPhotoFileInput = document.getElementById('memberPhotoFileInput');
  const pasteClipboardPhotoBtn = document.getElementById('pasteClipboardPhotoBtn');
  const removePhotoBtn = document.getElementById('removePhotoBtn');
  const modalQuickActions = document.getElementById('modalQuickActions');
  const modalAddChildBtn = document.getElementById('modalAddChildBtn');
  const modalAddSpouseBtn = document.getElementById('modalAddSpouseBtn');
  const topAddMemberBtn = document.getElementById('topAddMemberBtn');

  // Actions menu
  const actionsMenuBtn = document.getElementById('actionsMenuBtn');
  const actionsDropdown = document.getElementById('actionsDropdown');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const importJsonFileInput = document.getElementById('importJsonFileInput');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportGedcomBtn = document.getElementById('exportGedcomBtn');
  const printTreeBtn = document.getElementById('printTreeBtn');
  const toggleThemeBtn = document.getElementById('toggleThemeBtn');
  const resetDataBtn = document.getElementById('resetDataBtn');
  const addMemberBtn = document.getElementById('addMemberBtn');
  const helpModal = document.getElementById('helpModal');
  const canvasHelpBtn = document.getElementById('canvasHelpBtn');
  const helpModalCloseBtn = document.getElementById('helpModalCloseBtn');
  const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
  const toastNotification = document.getElementById('toastNotification');

  // Temporary storage for photo while editing in modal
  let currentModalPhoto = null;

  // --- CLOUD SYNC STATE & LOGIC (Firebase Firestore) ---
  let isCloudActive = false;
  let firestoreDb = null;
  let firestoreUnsubscribe = null;
  const CLOUD_CONFIG_STORAGE_KEY = 'family_tree_firebase_config';

  const cloudStatusBtn = document.getElementById('cloudStatusBtn');
  const cloudStatusText = document.getElementById('cloudStatusText');
  const cloudModal = document.getElementById('cloudModal');
  const cloudModalCloseBtn = document.getElementById('cloudModalCloseBtn');
  const closeCloudModalBtn = document.getElementById('closeCloudModalBtn');
  const cloudBadgeState = document.getElementById('cloudBadgeState');
  const cloudConnectedSection = document.getElementById('cloudConnectedSection');
  const cloudConfigSection = document.getElementById('cloudConfigSection');
  const firebaseConfigInput = document.getElementById('firebaseConfigInput');
  const saveCloudConfigBtn = document.getElementById('saveCloudConfigBtn');
  const syncNowBtn = document.getElementById('syncNowBtn');
  const disconnectCloudBtn = document.getElementById('disconnectCloudBtn');

  function getEffectiveFirebaseConfig() {
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.projectId) {
      return window.FIREBASE_CONFIG;
    }
    try {
      const stored = localStorage.getItem(CLOUD_CONFIG_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return null;
  }

  function initCloudSync() {
    const config = getEffectiveFirebaseConfig();
    if (!config || !config.apiKey || !config.projectId) {
      updateCloudUiState(false);
      return;
    }

    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK no cargado en la página.');
        updateCloudUiState(false, 'Sin SDK');
        return;
      }

      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(config);
      }
      firestoreDb = firebase.firestore();
      updateCloudUiState(true);
      listenToCloudMembers();
    } catch (err) {
      console.warn('Error inicializando Firebase:', err);
      updateCloudUiState(false, 'Error');
    }
  }

  function updateCloudUiState(connected, label = '') {
    isCloudActive = connected;
    if (cloudStatusBtn) {
      if (connected) {
        cloudStatusBtn.classList.add('connected');
        if (cloudStatusText) cloudStatusText.textContent = 'Nube Conectada';
        if (cloudBadgeState) {
          cloudBadgeState.textContent = 'En Vivo';
          cloudBadgeState.style.backgroundColor = '#10b981';
        }
        if (cloudConnectedSection) cloudConnectedSection.style.display = 'block';
        if (cloudConfigSection) cloudConfigSection.style.display = 'none';
      } else {
        cloudStatusBtn.classList.remove('connected');
        if (cloudStatusText) cloudStatusText.textContent = label || 'Conectar Nube';
        if (cloudBadgeState) {
          cloudBadgeState.textContent = label || 'Desconectada';
          cloudBadgeState.style.backgroundColor = '#64748b';
        }
        if (cloudConnectedSection) cloudConnectedSection.style.display = 'none';
        if (cloudConfigSection) cloudConfigSection.style.display = 'block';
      }
    }
  }

  function getFamilyCloudDocId() {
    return (typeof FAMILY_TREE_DATA !== 'undefined' && FAMILY_TREE_DATA?.meta?.id)
      ? FAMILY_TREE_DATA.meta.id
      : 'reyna_aliaga';
  }

  function listenToCloudMembers() {
    if (!firestoreDb) return;

    const colRef = firestoreDb.collection('families').doc(getFamilyCloudDocId()).collection('members');

    colRef.limit(1).get().then(snapshot => {
      if (snapshot.empty) {
        console.log('Colección vacía. Subiendo datos iniciales a Firestore...');
        seedFirestore(colRef);
      }
    }).catch(err => {
      console.warn('Verificación de colección en Firestore:', err);
    });

    if (firestoreUnsubscribe) firestoreUnsubscribe();

    let initialLoadDone = false;
    firestoreUnsubscribe = colRef.onSnapshot(snapshot => {
      if (snapshot.empty && !initialLoadDone) {
        initialLoadDone = true;
        return;
      }

      const cloudMembers = [];
      snapshot.forEach(doc => {
        cloudMembers.push(doc.data());
      });

      if (cloudMembers.length > 0) {
        const canonicalIds = new Set(FAMILY_TREE_DATA.members.map(m => m.id));
        const userAddedMembers = cloudMembers.filter(m => !canonicalIds.has(m.id));
        const restoredBaseMembers = FAMILY_TREE_DATA.members.map(baseM => {
          const cloudM = cloudMembers.find(m => m.id === baseM.id);
          const restored = JSON.parse(JSON.stringify(baseM));
          if (cloudM) {
            // Preservar nombre y apellidos editados
            if (cloudM.name) restored.name = cloudM.name;
            if (cloudM.fullName) restored.fullName = cloudM.fullName;
            if (cloudM.gender) restored.gender = cloudM.gender;
            if (cloudM.role) restored.role = cloudM.role;
            if (cloudM.photo) restored.photo = cloudM.photo;
            if (cloudM.notes) restored.notes = cloudM.notes;
            if (cloudM.badge !== undefined && cloudM.badge !== null) restored.badge = cloudM.badge;
            if (cloudM.birthYear) restored.birthYear = cloudM.birthYear;
            if (cloudM.order !== undefined && cloudM.order !== null) restored.order = cloudM.order;
          }
          return restored;
        });
        familyData.members = [...restoredBaseMembers, ...userAddedMembers];
        sanitizeAndRepairData(familyData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(familyData));
        renderAll();
      }
      initialLoadDone = true;
    }, err => {
      console.warn('Error en listener de Firestore:', err);
    });
  }

  async function seedFirestore(colRef) {
    try {
      showToast('☁️ Subiendo integrantes a la nube...');
      const batchSize = 100;
      let batch = firestoreDb.batch();
      let count = 0;

      for (const m of familyData.members) {
        const clean = JSON.parse(JSON.stringify(m));
        const docRef = colRef.doc(m.id);
        batch.set(docRef, clean);
        count++;
        if (count % batchSize === 0) {
          await batch.commit();
          batch = firestoreDb.batch();
        }
      }
      if (count % batchSize !== 0) {
        await batch.commit();
      }
      showToast(`☁️ ¡${count} integrantes subidos a la nube exitosamente!`);
    } catch (err) {
      console.error('Error migrando datos a Firestore:', err);
      showToast('⚠️ No se pudo inicializar la colección en Firestore.');
    }
  }

  function saveMemberToCloud(member) {
    if (!isCloudActive || !firestoreDb) return;
    try {
      const clean = JSON.parse(JSON.stringify(member));
      firestoreDb.collection('families').doc(getFamilyCloudDocId()).collection('members')
        .doc(member.id).set(clean, { merge: true })
        .catch(err => console.error('Error guardando en Firestore:', err));
    } catch (err) {
      console.error('Error serializando miembro para Firestore:', err);
    }
  }

  function deleteMemberFromCloud(memberId) {
    if (!isCloudActive || !firestoreDb) return;
    firestoreDb.collection('families').doc(getFamilyCloudDocId()).collection('members')
      .doc(memberId).delete()
      .catch(err => console.error('Error eliminando de Firestore:', err));
  }

  function bindCloudEvents() {
    if (cloudStatusBtn) {
      cloudStatusBtn.addEventListener('click', () => {
        if (cloudModal) cloudModal.classList.add('active');
      });
    }
    if (cloudModalCloseBtn) {
      cloudModalCloseBtn.addEventListener('click', () => {
        if (cloudModal) cloudModal.classList.remove('active');
      });
    }
    if (closeCloudModalBtn) {
      closeCloudModalBtn.addEventListener('click', () => {
        if (cloudModal) cloudModal.classList.remove('active');
      });
    }

    if (saveCloudConfigBtn) {
      saveCloudConfigBtn.addEventListener('click', () => {
        let text = (firebaseConfigInput.value || '').trim();
        if (!text) {
          alert('Por favor pega la configuración de Firebase.');
          return;
        }

        let parsedConfig = null;
        try {
          if (text.includes('{') && text.includes('}')) {
            const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            parsedConfig = (new Function(`return ${jsonText}`))();
          } else {
            parsedConfig = JSON.parse(text);
          }
        } catch (e) {
          alert('No se pudo interpretar el formato de configuración. Asegúrate de incluir las llaves { } con apiKey y projectId.');
          return;
        }

        if (!parsedConfig || !parsedConfig.apiKey || !parsedConfig.projectId) {
          alert('La configuración debe contener al menos "apiKey" y "projectId".');
          return;
        }

        localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(parsedConfig));
        showToast('💾 Configuración guardada. Conectando a Firebase...');
        initCloudSync();
        if (cloudModal) cloudModal.classList.remove('active');
      });
    }

    if (disconnectCloudBtn) {
      disconnectCloudBtn.addEventListener('click', () => {
        if (confirm('¿Desconectar la base de datos en la nube y volver al modo local?')) {
          localStorage.removeItem(CLOUD_CONFIG_STORAGE_KEY);
          if (firestoreUnsubscribe) firestoreUnsubscribe();
          firestoreDb = null;
          updateCloudUiState(false);
          showToast('Nube desconectada. Operando en modo local.');
        }
      });
    }

    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', () => {
        listenToCloudMembers();
        showToast('🔄 Recargando datos desde la nube...');
      });
    }
  }

  // --- INITIALIZATION ---
  function applyFamilyMetaHeader() {
    if (!familyData || !familyData.meta) return;
    const titleEl = document.querySelector('.family-title');
    const subtitleEl = document.querySelector('.family-subtitle');
    if (titleEl && familyData.meta.familyName) {
      titleEl.textContent = familyData.meta.familyName;
    }
    if (subtitleEl && familyData.meta.subtitle) {
      subtitleEl.textContent = familyData.meta.subtitle;
    }
    if (familyData.meta.familyName) {
      document.title = `Árbol Genealógico - ${familyData.meta.familyName}`;
    }
  }

  function init() {
    try { loadData(); } catch (e) { console.error('loadData error:', e); }
    try { sanitizeAndRepairData(familyData); } catch (e) { console.error('sanitize error:', e); }
    try { applyFamilyMetaHeader(); } catch (e) { console.error('applyFamilyMetaHeader error:', e); }
    try { populateFormBranchOptions(); } catch (e) { console.error('populateFormBranchOptions error:', e); }
    try { bindEvents(); } catch (e) { console.error('bindEvents error:', e); }
    try { renderAll(); } catch (e) { console.error('renderAll error:', e); }
    try { centerTreeOnPatriarchs(); } catch (e) { console.error('centerTreeOnPatriarchs error:', e); }
    try { updatePhotoProgress(); } catch (e) { console.error('updatePhotoProgress error:', e); }
    try { initCloudSync(); } catch (e) { console.error('initCloudSync error:', e); }
    try { bindCloudEvents(); } catch (e) { console.error('bindCloudEvents error:', e); }
  }

  // --- DATA LOADING & PERSISTENCE ---
  const familyMetaId = (typeof FAMILY_TREE_DATA !== 'undefined' && FAMILY_TREE_DATA?.meta?.id) ? FAMILY_TREE_DATA.meta.id : 'reyna_aliaga';
  const STORAGE_KEY = (familyMetaId === 'reyna_aliaga') 
    ? 'familia_reyna_aliaga_v3' 
    : `familia_${familyMetaId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v1`;

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        familyData = JSON.parse(stored);
        // 1. Identificar integrantes canónicos e integrantes nuevos añadidos por el usuario
        const canonicalIds = new Set(FAMILY_TREE_DATA.members.map(m => m.id));
        const userAddedMembers = (familyData.members || []).filter(m => !canonicalIds.has(m.id));

        // 2. Restaurar la estructura, fila (generación), rama y orden original canónico de los integrantes base
        const restoredBaseMembers = FAMILY_TREE_DATA.members.map(baseM => {
          const existing = (familyData.members || []).find(m => m.id === baseM.id);
          const restored = JSON.parse(JSON.stringify(baseM));
          if (existing) {
            // Preservar nombre y apellidos editados por el usuario
            if (existing.name) restored.name = existing.name;
            if (existing.fullName) restored.fullName = existing.fullName;
            if (existing.gender) restored.gender = existing.gender;
            if (existing.role) restored.role = existing.role;
            // Preservar fotos cargadas por el usuario
            if (existing.photo) restored.photo = existing.photo;
            // Preservar notas agregadas por el usuario
            if (existing.notes) restored.notes = existing.notes;
            // Preservar distinciones/badges
            if (existing.badge !== undefined && existing.badge !== null) restored.badge = existing.badge;
            // Preservar año de nacimiento si fue cargado
            if (existing.birthYear) restored.birthYear = existing.birthYear;
            // Preservar orden manual si fue cargado
            if (existing.order !== undefined && existing.order !== null) restored.order = existing.order;
          }
          return restored;
        });

        // 3. Reensamblar con el orden canónico exacto inicial de FAMILY_TREE_DATA
        familyData.members = [...restoredBaseMembers, ...userAddedMembers];
        familyData.branches = JSON.parse(JSON.stringify(FAMILY_TREE_DATA.branches));
        familyData.meta = JSON.parse(JSON.stringify(FAMILY_TREE_DATA.meta));
      } else {
        familyData = JSON.parse(JSON.stringify(FAMILY_TREE_DATA));
        // Migrar fotos previas si existen en v2 o v1
        const oldStored = localStorage.getItem('familia_reyna_aliaga_v2') || localStorage.getItem('familia_reyna_aliaga_v1');
        if (oldStored) {
          try {
            const oldData = JSON.parse(oldStored);
            if (oldData && oldData.members) {
              oldData.members.forEach(oldM => {
                if (oldM.photo) {
                  const target = familyData.members.find(m => m.id === oldM.id);
                  if (target) target.photo = oldM.photo;
                }
              });
            }
          } catch (migErr) {
            console.warn('Migración de fotos previa:', migErr);
          }
        }
      }
      sanitizeAndRepairData(familyData);
      saveData();
    } catch (e) {
      console.error('Error loading data from localStorage, using default:', e);
      familyData = JSON.parse(JSON.stringify(FAMILY_TREE_DATA));
      sanitizeAndRepairData(familyData);
      saveData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(familyData));
      updatePhotoProgress();
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      showToast('⚠️ Advertencia: Memoria local llena al guardar fotos.');
    }
  }

  function getMember(id) {
    return familyData.members.find(m => m.id === id);
  }

  function getBranch(branchId) {
    return familyData.branches.find(b => b.id === branchId) || {
      id: branchId,
      name: 'Rama Familiar',
      color: '#722F37'
    };
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function getMemberDisplayRole(member) {
    if (!member) return '';
    let role = member.role;
    if (!role || role === 'Integrante') {
      if (member.generation === 1) {
        role = member.gender === 'F' ? 'Matriarca' : 'Patriarca';
      } else if (member.generation === 2) {
        role = member.gender === 'F' ? 'Hija' : 'Hijo';
      } else if (member.generation === 3) {
        role = member.gender === 'F' ? 'Nieta' : 'Nieto';
      } else if (member.generation === 4) {
        role = member.gender === 'F' ? 'Bisnieta' : 'Bisnieto';
      } else if (member.generation === 5) {
        role = member.gender === 'F' ? 'Tataranieta' : 'Tataranieto';
      } else if (member.generation) {
        role = `Gen ${member.generation}`;
      }
    } else if (member.gender === 'F') {
      if (role === 'Bisnieto') role = 'Bisnieta';
      else if (role === 'Tataranieto') role = 'Tataranieta';
      else if (role === 'Nieto') role = 'Nieta';
      else if (role === 'Hijo') role = 'Hija';
    }
    return role || '';
  }

  function stripAccents(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function formatToTitleCase(str) {
    if (!str) return '';
    return str.split(/\s+/).map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  function getMemberSurnames(member) {
    if (!member || !member.fullName) return '';
    const fn = member.fullName.trim();
    const n = (member.name || '').trim();
    if (!n) return '';

    const cleanFn = stripAccents(fn).toLowerCase();
    const cleanN = stripAccents(n).toLowerCase();

    if (cleanFn.startsWith(cleanN)) {
      const remainder = fn.slice(n.length).trim();
      if (remainder) return remainder;
    }

    const nameParts = n.split(/\s+/).filter(Boolean);
    const fullParts = fn.split(/\s+/).filter(Boolean);
    if (fullParts.length > nameParts.length) {
      return fullParts.slice(nameParts.length).join(' ');
    } else if (fullParts.length > 1) {
      return fullParts.slice(1).join(' ');
    }
    return '';
  }

  function getPrimarySurname(member) {
    if (!member) return '';
    const surnames = getMemberSurnames(member);
    if (!surnames) return '';
    const parts = surnames.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];

    const lower0 = parts[0].toLowerCase();
    if (lower0 === 'de' && parts.length >= 3 && ['la', 'los', 'las'].includes(parts[1].toLowerCase())) {
      return `${parts[0]} ${parts[1]} ${parts[2]}`;
    }
    if (['de', 'del', 'san', 'santa'].includes(lower0) && parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  }

  function inferChildSurnames(parentId1, parentId2) {
    const p1 = parentId1 ? getMember(parentId1) : null;
    const p2 = parentId2 ? getMember(parentId2) : null;
    if (!p1 && !p2) return '';

    let father = null;
    let mother = null;

    if (p1 && p2) {
      if (p1.gender === 'M' && p2.gender === 'F') {
        father = p1;
        mother = p2;
      } else if (p2.gender === 'M' && p1.gender === 'F') {
        father = p2;
        mother = p1;
      } else {
        father = p1;
        mother = p2;
      }
    } else {
      const singleParent = p1 || p2;
      return getPrimarySurname(singleParent);
    }

    const fatherSur = getPrimarySurname(father);
    const motherSur = getPrimarySurname(mother);

    if (fatherSur && motherSur) {
      return `${fatherSur} ${motherSur}`;
    }
    return fatherSur || motherSur || '';
  }

  // --- HIERARCHY & GRAPH INTEGRITY UTILITIES ---
  function getAllDescendantIds(rootId, membersList = familyData.members) {
    if (!rootId || !membersList) return new Set();
    const descendants = new Set();
    const queue = [rootId];

    const rootMember = membersList.find(m => m.id === rootId);
    if (rootMember && rootMember.spouseId) {
      queue.push(rootMember.spouseId);
    }

    const processed = new Set();
    while (queue.length > 0) {
      const currentParentId = queue.shift();
      if (processed.has(currentParentId)) continue;
      processed.add(currentParentId);

      membersList.forEach(m => {
        if (m.parentId === currentParentId && !descendants.has(m.id)) {
          descendants.add(m.id);
          queue.push(m.id);
          if (m.spouseId && !descendants.has(m.spouseId)) {
            queue.push(m.spouseId);
          }
        }
      });
    }
    return descendants;
  }

  function sanitizeAndRepairData(data) {
    if (!data || !Array.isArray(data.members)) return false;
    let modified = false;

    // A. Reparación explícita para la familia Rodrigo Etcheverry Reyna & Matías Etcheverry Soto
    const rodrigo = data.members.find(m => m.id === 'rodrigo_g');
    if (rodrigo) {
      if (rodrigo.parentId === 'matias_g' || rodrigo.parentId !== 'graciela' || rodrigo.generation !== 3) {
        console.warn('Restaurando jerarquía canónica de Rodrigo Etcheverry Reyna...');
        rodrigo.parentId = 'graciela';
        rodrigo.generation = 3;
        rodrigo.role = 'Nieto';
        rodrigo.spouseId = 'carolina_g';
        rodrigo.branch = 'graciela';
        modified = true;
      }
    }

    const matias = data.members.find(m => m.id === 'matias_g');
    if (matias) {
      if (matias.parentId !== 'rodrigo_g' || matias.generation !== 4) {
        console.warn('Restaurando jerarquía canónica de Matías Etcheverry Soto...');
        matias.parentId = 'rodrigo_g';
        matias.generation = 4;
        matias.role = 'Bisnieto';
        matias.branch = 'graciela';
        modified = true;
      }
    }

    const carolina = data.members.find(m => m.id === 'carolina_g');
    if (carolina) {
      if (carolina.spouseId !== 'rodrigo_g' || carolina.generation !== 3) {
        carolina.spouseId = 'rodrigo_g';
        carolina.generation = 3;
        carolina.branch = 'graciela';
        modified = true;
      }
    }

    const hijosRodrigo = ['guadalupe_g', 'victoria_g', 'tomas_rodrigo_g'];
    hijosRodrigo.forEach(id => {
      const hijo = data.members.find(m => m.id === id);
      if (hijo && (hijo.parentId !== 'rodrigo_g' || hijo.generation !== 4)) {
        hijo.parentId = 'rodrigo_g';
        hijo.generation = 4;
        hijo.branch = 'graciela';
        modified = true;
      }
    });

    // B. Detección y ruptura genérica de ciclos genealógicos (A -> B -> A o bucles n-arios)
    data.members.forEach(member => {
      if (!member.parentId) return;

      const visited = new Set([member.id]);
      let currentId = member.parentId;
      let cycleDetected = false;

      while (currentId) {
        if (visited.has(currentId)) {
          cycleDetected = true;
          break;
        }
        visited.add(currentId);
        const parentMember = data.members.find(m => m.id === currentId);
        currentId = parentMember ? parentMember.parentId : null;
      }

      if (cycleDetected) {
        console.warn(`Ciclo cerrado detectado en ${member.name} (${member.id}). Reparando automáticamente...`);
        const baseMember = typeof FAMILY_TREE_DATA !== 'undefined'
          ? FAMILY_TREE_DATA.members.find(m => m.id === member.id)
          : null;

        if (baseMember && baseMember.parentId) {
          member.parentId = baseMember.parentId;
          member.generation = baseMember.generation;
          member.role = baseMember.role;
          member.branch = baseMember.branch;
        } else {
          member.parentId = null;
        }
        modified = true;
      }
    });

    // C. Coherencia recíproca de cónyuge
    data.members.forEach(member => {
      if (member.spouseId) {
        if (member.spouseId === member.id || member.spouseId === member.parentId) {
          member.spouseId = null;
          modified = true;
        } else {
          const spouse = data.members.find(m => m.id === member.spouseId);
          if (spouse && spouse.spouseId !== member.id) {
            spouse.spouseId = member.id;
            modified = true;
          }
        }
      }
    });

    return modified;
  }

  // --- EVENT BINDING ---
  function bindEvents() {
    // Canvas Pan & Zoom
    canvasViewport.addEventListener('mousedown', onCanvasMouseDown);
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);
    canvasViewport.addEventListener('wheel', onCanvasWheel, { passive: false });

    // Touch Support con gestos táctiles fluidos (Pinch-to-zoom y desplazamiento suave)
    let lastTouchX = 0, lastTouchY = 0, initialDistance = 0;
    let touchStartX = 0, touchStartY = 0;

    canvasViewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        isActuallyDragging = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        isActuallyDragging = true;
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: false });

    canvasViewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;
        if (Math.hypot(e.touches[0].clientX - touchStartX, e.touches[0].clientY - touchStartY) > 6) {
          isActuallyDragging = true;
        }
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        panX += dx;
        panY += dy;
        applyCanvasTransform();
        e.preventDefault();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (initialDistance > 0) {
          const factor = dist / initialDistance;
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const newScale = Math.min(Math.max(scale * factor, 0.15), 2.5);

          // Zoom fluido centrado en el punto medio de los dos dedos
          panX = midX - (midX - panX) * (newScale / scale);
          panY = midY - (midY - panY) * (newScale / scale);
          scale = newScale;
          applyCanvasTransform();
        }
        initialDistance = dist;
      }
    }, { passive: false });

    canvasViewport.addEventListener('touchend', () => {
      if (isActuallyDragging) {
        lastDragEndTime = Date.now();
      }
      isDragging = false;
      isActuallyDragging = false;
    });

    canvasViewport.addEventListener('touchcancel', () => {
      isDragging = false;
      isActuallyDragging = false;
    });

    // HUD Zoom & Action controls
    const zoomInEl = document.getElementById('zoomInBtn');
    if (zoomInEl) zoomInEl.addEventListener('click', () => zoomBy(1.2));
    const zoomOutEl = document.getElementById('zoomOutBtn');
    if (zoomOutEl) zoomOutEl.addEventListener('click', () => zoomBy(0.8));

    const reportErrorBtn = document.getElementById('reportErrorBtn');
    if (reportErrorBtn) reportErrorBtn.addEventListener('click', openReportErrorModal);

    if (canvasHelpBtn) canvasHelpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    if (helpModalCloseBtn) helpModalCloseBtn.addEventListener('click', () => helpModal.classList.remove('active'));
    if (closeHelpModalBtn) closeHelpModalBtn.addEventListener('click', () => helpModal.classList.remove('active'));

    // Report Error Modal bindings
    const reportErrorModalCloseBtn = document.getElementById('reportErrorModalCloseBtn');
    if (reportErrorModalCloseBtn) reportErrorModalCloseBtn.addEventListener('click', closeReportErrorModal);
    const cancelReportBtn = document.getElementById('cancelReportBtn');
    if (cancelReportBtn) cancelReportBtn.addEventListener('click', closeReportErrorModal);
    const submitReportBtn = document.getElementById('submitReportBtn');
    if (submitReportBtn) submitReportBtn.addEventListener('click', submitReportError);

    // View Switching
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        switchView(view);
      });
    });

    // Search bar
    memberSearchInput.addEventListener('input', onSearchInput);
    memberSearchInput.addEventListener('focus', onSearchInput);
    clearSearchBtn.addEventListener('click', () => {
      memberSearchInput.value = '';
      clearSearchBtn.style.display = 'none';
      searchResultsDropdown.classList.remove('active');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box')) {
        searchResultsDropdown.classList.remove('active');
      }
      if (!e.target.closest('#actionsMenuBtn') && !e.target.closest('#actionsDropdown')) {
        actionsDropdown.classList.remove('active');
      }
    });

    // Branch filter
    branchFilterSelect.addEventListener('change', onBranchFilterChange);

    // Actions dropdown menu toggle
    actionsMenuBtn.addEventListener('click', () => {
      actionsDropdown.classList.toggle('active');
    });

    // Export / Import buttons
    exportJsonBtn.addEventListener('click', exportBackupJson);
    importJsonBtn.addEventListener('click', () => importJsonFileInput.click());
    importJsonFileInput.addEventListener('change', handleImportJsonFile);
    exportCsvBtn.addEventListener('click', exportCsvFile);
    exportGedcomBtn.addEventListener('click', exportGedcomFile);
    printTreeBtn.addEventListener('click', () => window.print());
    toggleThemeBtn.addEventListener('click', toggleTheme);
    resetDataBtn.addEventListener('click', confirmResetData);
    if (addMemberBtn) addMemberBtn.addEventListener('click', () => openAddMemberModal());
    const topAddBtn = document.getElementById('topAddMemberBtn');
    if (topAddBtn) topAddBtn.addEventListener('click', () => openAddMemberModal());
    const dirAddBtn = document.getElementById('dirAddMemberBtn');
    if (dirAddBtn) dirAddBtn.addEventListener('click', () => openAddMemberModal());

    // Modal Events
    modalCloseBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    saveMemberBtn.addEventListener('click', saveModalMember);
    deleteMemberBtn.addEventListener('click', confirmDeleteMember);

    const formBirthYearInput = document.getElementById('formBirthYear');
    if (formBirthYearInput) {
      formBirthYearInput.addEventListener('input', () => {
        if (activeMemberId) {
          const m = getMember(activeMemberId);
          if (m) {
            const rawVal = formBirthYearInput.value.trim();
            m.birthYear = rawVal ? parseInt(rawVal, 10) : null;
          }
        }
      });
    }

    const memberForm = document.getElementById('memberForm');
    if (memberForm) {
      memberForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveModalMember();
      });
    }

    const formFirstNameInput = document.getElementById('formFirstName');
    if (formFirstNameInput) {
      formFirstNameInput.addEventListener('input', () => {
        const val = formFirstNameInput.value.trim();
        if (modalMemberName) {
          modalMemberName.textContent = val ? val.toUpperCase() : 'Integrante';
        }
        if (!currentModalPhoto) {
          renderModalPhotoPreview(null, val || 'Nuevo');
        }
      });
    }

    const formLastNameInput = document.getElementById('formLastName');
    if (formLastNameInput) {
      formLastNameInput.addEventListener('input', () => {
        formLastNameInput.dataset.autoInferred = 'false';
      });
    }

    const formParentInput = document.getElementById('formParent');
    if (formParentInput) {
      formParentInput.addEventListener('change', (e) => {
        const pId = e.target.value;
        if (pId) {
          const parent = getMember(pId);
          if (parent) {
            const nextGen = Math.min(5, (parent.generation || 2) + 1);
            const genRoleSelect = document.getElementById('formGenerationRole');
            if (genRoleSelect && !activeMemberId) {
              genRoleSelect.value = String(nextGen);
            }
            const br = getBranch(parent.branch);
            modalBranchTag.textContent = br.name;
            modalBranchTag.style.backgroundColor = br.color;
          }
        }
      });
    }

    const formSpouseInput = document.getElementById('formSpouse');
    if (formSpouseInput) {
      formSpouseInput.addEventListener('change', (e) => {
        const sId = e.target.value;
        if (sId) {
          const spouse = getMember(sId);
          if (spouse) {
            const pId = document.getElementById('formParent').value;
            if (!pId) {
              const br = getBranch(spouse.branch);
              modalBranchTag.textContent = br.name;
              modalBranchTag.style.backgroundColor = br.color;
            }
            const genRoleSelect = document.getElementById('formGenerationRole');
            if (genRoleSelect && !activeMemberId) {
              const spouseGen = spouse.generation || 3;
              genRoleSelect.value = `${spouseGen}_conyuge`;
            }
          }
        }
      });
    }

    if (modalAddChildBtn) {
      modalAddChildBtn.addEventListener('click', () => {
        if (!activeMemberId) return;
        const parentMember = getMember(activeMemberId);
        if (!parentMember) return;
        openAddMemberModal({
          parentId: parentMember.id,
          branch: parentMember.branch,
          generation: Math.min(5, (parentMember.generation || 1) + 1),
          role: 'Hijo/a'
        });
      });
    }

    if (modalAddSpouseBtn) {
      modalAddSpouseBtn.addEventListener('click', () => {
        if (!activeMemberId) return;
        const spouseMember = getMember(activeMemberId);
        if (!spouseMember) return;
        openAddMemberModal({
          spouseId: spouseMember.id,
          branch: spouseMember.branch,
          generation: spouseMember.generation || 2,
          role: 'Cónyuge'
        });
      });
    }

    memberPhotoFileInput.addEventListener('change', handlePhotoFileSelect);
    if (modalPhotoPreview) {
      modalPhotoPreview.addEventListener('click', () => {
        memberPhotoFileInput.click();
      });
    }
    if (pasteClipboardPhotoBtn) {
      pasteClipboardPhotoBtn.addEventListener('click', pasteImageFromClipboard);
    }
    window.addEventListener('paste', handleGlobalPaste);

    removePhotoBtn.addEventListener('click', () => {
      currentModalPhoto = null;
      renderModalPhotoPreview(null, modalMemberName.textContent);
    });

    // Mini-map drag/click
    if (miniMapContainer) {
      miniMapContainer.addEventListener('mousedown', onMiniMapClick);
    }

    // Directory filter
    missingPhotoOnlyCheckbox.addEventListener('change', renderDirectoryView);

    // Keyboard navigation
    window.addEventListener('keydown', onKeyDown);
  }

  // --- CANVAS PAN & ZOOM LOGIC ---
  function onCanvasMouseDown(e) {
    if (e.target.closest('.member-card') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    canvasViewport.classList.add('dragging');
  }

  function onCanvasMouseMove(e) {
    if (!isDragging) return;
    isActuallyDragging = true;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyCanvasTransform();
  }

  function onCanvasMouseUp() {
    if (isActuallyDragging) {
      lastDragEndTime = Date.now();
    }
    isDragging = false;
    isActuallyDragging = false;
    canvasViewport.classList.remove('dragging');
  }

  function onCanvasWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const rect = canvasViewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScale = Math.min(Math.max(scale * zoomFactor, 0.15), 2.5);

    // Zoom toward mouse pointer
    panX = mouseX - (mouseX - panX) * (newScale / scale);
    panY = mouseY - (mouseY - panY) * (newScale / scale);
    scale = newScale;

    applyCanvasTransform();
  }

  function zoomBy(factor) {
    const rect = canvasViewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newScale = Math.min(Math.max(scale * factor, 0.15), 2.5);

    panX = centerX - (centerX - panX) * (newScale / scale);
    panY = centerY - (centerY - panY) * (newScale / scale);
    scale = newScale;
    applyCanvasTransform();
  }

  function applyCanvasTransform() {
    canvasContent.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    zoomLevelIndicator.textContent = `${Math.round(scale * 100)}%`;
    updateMiniMap();
  }

  function centerTreeOnPatriarchs() {
    const viewportRect = canvasViewport.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    scale = isMobile ? (window.innerWidth <= 480 ? 0.6 : 0.7) : 0.85;
    // The patriarchs are horizontally centered in treeDomContainer (~3000px mark)
    const domWidth = treeDomContainer.offsetWidth || 5600;
    panX = (viewportRect.width / 2) - (domWidth / 2 * scale);
    panY = isMobile ? 30 : 60;
    applyCanvasTransform();
  }

  function fitTreeToScreen() {
    const viewportRect = canvasViewport.getBoundingClientRect();
    const domWidth = treeDomContainer.offsetWidth || 5600;
    const domHeight = treeDomContainer.offsetHeight || 1200;

    const scaleX = (viewportRect.width - 80) / domWidth;
    const scaleY = (viewportRect.height - 80) / domHeight;
    scale = Math.max(Math.min(scaleX, scaleY), 0.18);

    panX = (viewportRect.width - domWidth * scale) / 2;
    panY = (viewportRect.height - domHeight * scale) / 2;
    applyCanvasTransform();
  }

  function jumpToMember(memberId) {
    switchView('tree');
    setTimeout(() => {
      const card = document.querySelector(`.member-card[data-id="${memberId}"]`);
      if (!card) return;

      const viewportRect = canvasViewport.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const contentRect = canvasContent.getBoundingClientRect();

      // Card position relative to canvas content
      const cardCanvasX = (cardRect.left - contentRect.left) / scale;
      const cardCanvasY = (cardRect.top - contentRect.top) / scale;

      scale = Math.max(scale, 0.95);
      panX = (viewportRect.width / 2) - (cardCanvasX * scale) - (card.offsetWidth * scale / 2);
      panY = (viewportRect.height / 2) - (cardCanvasY * scale) - (card.offsetHeight * scale / 2);

      applyCanvasTransform();

      // Highlight card
      document.querySelectorAll('.member-card.highlighted').forEach(c => c.classList.remove('highlighted'));
      card.classList.add('highlighted');
      setTimeout(() => card.classList.remove('highlighted'), 3500);
    }, 80);
  }

  // --- VIEWS MANAGEMENT ---
  function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    treeViewSection.classList.toggle('active', viewName === 'tree');
    branchesViewSection.classList.toggle('active', viewName === 'branches');
    directoryViewSection.classList.toggle('active', viewName === 'directory');

    if (viewName === 'branches') renderBranchesView();
    if (viewName === 'directory') renderDirectoryView();
    if (viewName === 'tree') {
      applyCanvasTransform();
      setTimeout(drawSvgConnections, 100);
    }
  }

  // --- RENDERING: 1. TREE CANVAS VIEW ---
  function renderTreeView() {
    treeDomContainer.innerHTML = '';

    // A. Top Level: Patriarchs Block
    const patriarchsWrap = document.createElement('div');
    patriarchsWrap.className = 'tree-patriarch-block';
    patriarchsWrap.id = 'patriarchsBlock';

    const titleBadge = document.createElement('div');
    titleBadge.className = 'patriarch-banner-title';
    titleBadge.textContent = familyData.meta.familyName;
    patriarchsWrap.appendChild(titleBadge);

    const couplesRow = document.createElement('div');
    couplesRow.className = 'patriarch-couples-row';

    const gen1Members = familyData.members.filter(m => m.generation === 1);
    if (gen1Members.length > 0) {
      const cAlberto = gen1Members.find(m => m.id === 'carlos_alberto');
      const mLaura = gen1Members.find(m => m.id === 'maria_laura');
      if (cAlberto && mLaura) {
        couplesRow.appendChild(createMemberCard(cAlberto));
        couplesRow.appendChild(createMemberCard(mLaura));
        gen1Members.filter(m => m.id !== 'carlos_alberto' && m.id !== 'maria_laura')
          .forEach(m => couplesRow.appendChild(createMemberCard(m)));
      } else {
        gen1Members.forEach(m => couplesRow.appendChild(createMemberCard(m)));
      }
    }

    patriarchsWrap.appendChild(couplesRow);
    treeDomContainer.appendChild(patriarchsWrap);

    // B. Second Level: The 11 Branches
    const branchesRow = document.createElement('div');
    branchesRow.className = 'tree-branches-row';
    branchesRow.id = 'branchesRow';

    // Filter branches if selected
    const filterBranch = branchFilterSelect.value;
    const branchesToRender = filterBranch === 'all'
      ? familyData.branches.filter(b => b.id !== 'patron')
      : familyData.branches.filter(b => b.id === filterBranch);

    branchesToRender.forEach(branch => {
      const branchCol = renderBranchColumn(branch);
      branchesRow.appendChild(branchCol);
    });

    treeDomContainer.appendChild(branchesRow);

    // Schedule SVG connector line redraw
    setTimeout(drawSvgConnections, 80);
  }

  function renderBranchColumn(branch) {
    const col = document.createElement('div');
    col.className = 'branch-column';
    col.dataset.branchId = branch.id;
    col.style.setProperty('--card-branch-color', branch.color);

    // Branch Header Pill
    const headerPill = document.createElement('div');
    headerPill.className = 'branch-header-pill';
    headerPill.style.backgroundColor = branch.color;
    headerPill.textContent = branch.name.toUpperCase();
    col.appendChild(headerPill);

    // Get Generation 2 head members of this branch
    const gen2Members = familyData.members.filter(m => m.branch === branch.id && m.generation === 2);
    
    // Couple Header
    const headWrap = document.createElement('div');
    headWrap.className = 'subgroup-couples';
    if (gen2Members.length > 0) {
      gen2Members.forEach(m => {
        headWrap.appendChild(createMemberCard(m));
      });
    } else {
      const emptyBtn = document.createElement('button');
      emptyBtn.className = 'add-first-child-btn';
      emptyBtn.innerHTML = '<span>➕ Agregar Hijo/a a esta rama</span>';
      emptyBtn.addEventListener('click', () => {
        const founders = familyData.members.filter(m => m.generation === 1);
        const parentFounder = founders.find(m => m.gender === 'M') || founders[0];
        openAddMemberModal({
          branch: branch.id,
          generation: 2,
          parentId: parentFounder ? parentFounder.id : null,
          spouseId: parentFounder ? parentFounder.spouseId : null
        });
      });
      headWrap.appendChild(emptyBtn);
    }
    col.appendChild(headWrap);

    // Descendants container (Gen 3, Gen 4, Gen 5)
    const descendantsWrap = document.createElement('div');
    descendantsWrap.className = 'descendants-wrap';

    // Descendencia longitudinal (Fernando y demás ramas se organizan a lo largo horizontalmente)
    if (branch.id === 'cecilia') {
      renderCeciliaBranchDescendants(descendantsWrap);
    } else {
      renderStandardBranchDescendants(descendantsWrap, branch.id);
    }

    col.appendChild(descendantsWrap);
    return col;
  }

  // --- AGE & ORDER UTILITIES (PRESERVACIÓN DE ORDEN CANÓNICO ORIGINAL) ---
  function getCanonicalMemberIndex(id) {
    if (typeof FAMILY_TREE_DATA !== 'undefined' && Array.isArray(FAMILY_TREE_DATA.members)) {
      const idx = FAMILY_TREE_DATA.members.findIndex(m => m.id === id);
      if (idx !== -1) return idx;
    }
    if (familyData && Array.isArray(familyData.members)) {
      const idx = familyData.members.findIndex(m => m.id === id);
      if (idx !== -1) return idx + 10000;
    }
    return 99999;
  }

  function sortMembersByAge(members) {
    if (!members || !members.length) return [];
    return [...members].sort((a, b) => {
      // 1. Año de nacimiento explícito (menor año = más grande / nacido antes)
      const yearA = a.birthYear ? parseInt(a.birthYear, 10) : null;
      const yearB = b.birthYear ? parseInt(b.birthYear, 10) : null;
      const hasYearA = yearA !== null && !isNaN(yearA) && yearA > 0;
      const hasYearB = yearB !== null && !isNaN(yearB) && yearB > 0;

      if (hasYearA && hasYearB && yearA !== yearB) {
        return yearA - yearB;
      }

      // 2. Orden numérico manual explícito si ambos lo tienen asignado
      const hasOrdA = a.order !== undefined && a.order !== null && a.order !== '';
      const hasOrdB = b.order !== undefined && b.order !== null && b.order !== '';
      if (hasOrdA && hasOrdB) {
        const ordA = parseFloat(a.order);
        const ordB = parseFloat(b.order);
        if (ordA !== ordB) return ordA - ordB;
      }

      // 3. Fallback estricto: preservar la posición canónica original del integrante en data.js
      return getCanonicalMemberIndex(a.id) - getCanonicalMemberIndex(b.id);
    });
  }

  function getSiblingPeers(member) {
    if (!member) return [];
    if (member.parentId) {
      return familyData.members.filter(m => 
        (m.parentId === member.parentId || (member.spouseId && m.parentId === member.spouseId)) &&
        !m.role?.includes('Cónyuge')
      );
    }
    if (member.generation === 2) {
      return familyData.members.filter(m => m.generation === 2 && !m.role?.includes('Cónyuge'));
    }
    if (member.generation === 3 && member.branch) {
      return familyData.members.filter(m => m.generation === 3 && m.branch === member.branch && !m.role?.includes('Cónyuge'));
    }
    return [member];
  }

  function renderModalSiblingOrder(member) {
    // Sibling order section removed per user request (ordering is determined by birth year)
  }

  function moveMemberRelative(direction) {
    // Sibling order manual movement removed per user request
  }

  function renderStandardBranchDescendants(container, branchId) {
    const renderedInBranch = new Set();

    // Integrantes de la Generación 3 de esta rama en su orden canónico original
    const gen3All = familyData.members.filter(m => m.branch === branchId && m.generation === 3);
    const sortedGen3 = sortMembersByAge(gen3All);

    const renderedGen3 = new Set();
    const gen3Row = document.createElement('div');
    gen3Row.className = 'subgroup-couples';

    sortedGen3.forEach(m => {
      if (renderedGen3.has(m.id)) return;

      const groupContainer = document.createElement('div');
      groupContainer.className = 'branch-couples-wrap';

      const coupleDiv = document.createElement('div');
      coupleDiv.className = 'couple-group';
      coupleDiv.appendChild(createMemberCard(m));
      renderedGen3.add(m.id);
      renderedInBranch.add(m.id);

      if (m.spouseId) {
        const spouse = getMember(m.spouseId);
        if (spouse && spouse.branch === branchId) {
          coupleDiv.appendChild(createMemberCard(spouse));
          renderedGen3.add(spouse.id);
          renderedInBranch.add(spouse.id);
        }
      }
      groupContainer.appendChild(coupleDiv);

      // Hijos de esta pareja (Gen 4) en su orden canónico original
      const children = familyData.members.filter(c => c.parentId === m.id || (m.spouseId && c.parentId === m.spouseId));
      if (children.length > 0) {
        const sortedChildren = sortMembersByAge(children);
        const kidsRow = document.createElement('div');
        kidsRow.className = 'children-row';

        const renderedInKids = new Set();
        sortedChildren.forEach(child => {
          if (renderedInKids.has(child.id)) return;
          renderedInKids.add(child.id);
          renderedInBranch.add(child.id);

          // Si el hijo tiene descendencia (Gen 5)
          const grandKids = familyData.members.filter(gc => gc.parentId === child.id || (child.spouseId && gc.parentId === child.spouseId));
          if (grandKids.length > 0) {
            const subWrap = document.createElement('div');
            subWrap.style.display = 'flex';
            subWrap.style.flexDirection = 'column';
            subWrap.style.alignItems = 'center';
            subWrap.style.gap = '0.4rem';

            const childCouple = document.createElement('div');
            childCouple.className = 'couple-group';
            childCouple.appendChild(createMemberCard(child, true));
            if (child.spouseId) {
              const chSpouse = getMember(child.spouseId);
              if (chSpouse) {
                childCouple.appendChild(createMemberCard(chSpouse, true));
                renderedInBranch.add(chSpouse.id);
                renderedInKids.add(chSpouse.id);
              }
            }
            subWrap.appendChild(childCouple);

            const gkRow = document.createElement('div');
            gkRow.className = 'children-row';
            const sortedGrandKids = sortMembersByAge(grandKids);
            sortedGrandKids.forEach(gk => {
              renderedInBranch.add(gk.id);
              gkRow.appendChild(createMemberCard(gk, true));
            });
            subWrap.appendChild(gkRow);
            kidsRow.appendChild(subWrap);
          } else {
            if (child.spouseId) {
              const childCouple = document.createElement('div');
              childCouple.className = 'couple-group';
              childCouple.appendChild(createMemberCard(child, true));
              const chSpouse = getMember(child.spouseId);
              if (chSpouse) {
                childCouple.appendChild(createMemberCard(chSpouse, true));
                renderedInBranch.add(chSpouse.id);
                renderedInKids.add(chSpouse.id);
              }
              kidsRow.appendChild(childCouple);
            } else {
              kidsRow.appendChild(createMemberCard(child, true));
            }
          }
        });
        groupContainer.appendChild(kidsRow);
      }

      gen3Row.appendChild(groupContainer);
    });

    // Seguridad: verificar si queda algún integrante Gen 3 sin renderizar en la rama
    const unrenderedGen3Members = familyData.members.filter(m =>
      m.branch === branchId &&
      m.generation === 3 &&
      !renderedInBranch.has(m.id)
    );
    if (unrenderedGen3Members.length > 0) {
      const unrenderedGroup = document.createElement('div');
      unrenderedGroup.className = 'branch-couples-wrap';
      unrenderedGroup.style.padding = '0.5rem';

      const unrenderedRow = document.createElement('div');
      unrenderedRow.className = 'couple-group';
      sortMembersByAge(unrenderedGen3Members).forEach(um => {
        unrenderedRow.appendChild(createMemberCard(um, true));
      });
      unrenderedGroup.appendChild(unrenderedRow);
      gen3Row.appendChild(unrenderedGroup);
    }

    container.appendChild(gen3Row);
  }

  function renderFernandoBranchDescendants(container) {
    const branchMembersAll = familyData.members.filter(m => m.branch === 'fernando' && m.generation >= 3);
    const bloodlineGen3 = sortMembersByAge(branchMembersAll.filter(m => m.generation === 3 && !m.role?.includes('Cónyuge')));
    const rendered = new Set();

    bloodlineGen3.forEach(m => {
      if (rendered.has(m.id)) return;

      const group = document.createElement('div');
      group.className = 'branch-couples-wrap';

      const couple = document.createElement('div');
      couple.className = 'couple-group';
      couple.appendChild(createMemberCard(m, true));
      rendered.add(m.id);

      if (m.spouseId) {
        const spouse = getMember(m.spouseId);
        if (spouse) {
          couple.appendChild(createMemberCard(spouse, true));
          rendered.add(spouse.id);
        }
      }
      group.appendChild(couple);

      // Children sorted from oldest to youngest
      const kids = familyData.members.filter(c => c.parentId === m.id || (m.spouseId && c.parentId === m.spouseId));
      if (kids.length > 0) {
        const sortedKids = sortMembersByAge(kids);
        const kidsRow = document.createElement('div');
        kidsRow.className = 'children-row';
        sortedKids.forEach(k => {
          rendered.add(k.id);
          if (k.spouseId) {
            const childCouple = document.createElement('div');
            childCouple.className = 'couple-group';
            childCouple.appendChild(createMemberCard(k, true));
            const kSpouse = getMember(k.spouseId);
            if (kSpouse) {
              childCouple.appendChild(createMemberCard(kSpouse, true));
              rendered.add(kSpouse.id);
            }
            kidsRow.appendChild(childCouple);
          } else {
            kidsRow.appendChild(createMemberCard(k, true));
          }
        });
        group.appendChild(kidsRow);
      }

      container.appendChild(group);
    });
  }

  function renderCeciliaBranchDescendants(container) {
    // Cecilia has Carlos Patricio family & Soledad family with 5th generation
    renderStandardBranchDescendants(container, 'cecilia');
  }

  // --- MEMBER CARD COMPONENT ---
  function createMemberCard(member, isCompact = false) {
    const card = document.createElement('div');
    card.className = `member-card ${isCompact ? 'compact' : ''}`;
    card.dataset.id = member.id;
    card.dataset.branch = member.branch;

    const branch = getBranch(member.branch);
    card.style.setProperty('--card-branch-color', branch.color);

    // Top branch accent line
    const branchBar = document.createElement('div');
    branchBar.className = 'card-branch-bar';
    branchBar.style.backgroundColor = branch.color;
    card.appendChild(branchBar);

    // Avatar Photo Wrap
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'card-avatar-wrap';

    if (member.photo) {
      const img = document.createElement('img');
      img.className = 'card-avatar';
      img.src = member.photo;
      img.alt = member.name;
      img.onerror = () => {
        // Fallback if image fails to load
        img.replaceWith(createInitialsAvatar(member, branch));
      };
      avatarWrap.appendChild(img);
    } else {
      avatarWrap.appendChild(createInitialsAvatar(member, branch));
    }

    // Photo Hover Badge (+ or Camera)
    const hoverBadge = document.createElement('span');
    hoverBadge.className = 'card-photo-hover-badge';
    hoverBadge.innerHTML = member.photo ? '✏️' : '📷';
    hoverBadge.title = member.photo ? 'Cambiar foto' : 'Subir foto';
    avatarWrap.appendChild(hoverBadge);

    card.appendChild(avatarWrap);

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'card-name';
    nameEl.textContent = member.name;
    card.appendChild(nameEl);

    // Surnames / Apellidos (heredados del padre y de la madre o cargados)
    const surnameEl = document.createElement('div');
    surnameEl.className = 'card-surnames';
    const surnames = getMemberSurnames(member);
    if (surnames) {
      surnameEl.textContent = surnames;
    } else {
      surnameEl.innerHTML = '&nbsp;';
    }
    card.appendChild(surnameEl);

    // Role / Generation / BirthYear
    const roleEl = document.createElement('div');
    roleEl.className = 'card-role';
    const displayRole = getMemberDisplayRole(member);
    let roleText = displayRole || (member.generation ? `Gen ${member.generation}` : '');
    if (member.birthYear) {
      roleText = roleText ? `${roleText} • ${member.birthYear}` : `${member.birthYear}`;
    }
    if (roleText) {
      roleEl.textContent = roleText;
    } else {
      roleEl.innerHTML = '&nbsp;';
    }
    card.appendChild(roleEl);

    // Special badge (e.g. Sacerdote)
    if (member.badge) {
      const badgeEl = document.createElement('div');
      badgeEl.className = 'card-special-badge';
      badgeEl.textContent = member.badge;
      card.appendChild(badgeEl);
    }

    // Click handler to open edit modal (protegido contra arrastre accidental en móviles o PC)
    card.addEventListener('click', (e) => {
      if (Date.now() - lastDragEndTime < 250) {
        return;
      }
      e.stopPropagation();
      openMemberModal(member.id);
    });

    // Drag and Drop Photo directly onto Card
    setupCardDragDrop(card, member.id);

    return card;
  }

  function createInitialsAvatar(member, branch) {
    const avatar = document.createElement('div');
    avatar.className = 'card-avatar no-photo';
    avatar.style.backgroundColor = branch.color;
    avatar.textContent = getInitials(member.name);
    return avatar;
  }

  function setupCardDragDrop(card, memberId) {
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('drag-over');

      const files = e.dataTransfer.files;
      if (files && files.length > 0 && files[0].type.startsWith('image/')) {
        const file = files[0];
        try {
          showToast('⏳ Optimizando fotografía...');
          const compressed = await compressImageFile(file);
          const member = getMember(memberId);
          if (member) {
            member.photo = compressed;
            saveData();
            saveMemberToCloud(member);
            renderAll();
            showToast(`✅ Foto de ${member.name} actualizada.`);
          }
        } catch (err) {
          console.error(err);
          showToast('⚠️ No se pudo procesar la foto.');
        }
      }
    });
  }

  // --- SVG CONNECTION LINES ---
  function drawSvgConnections() {
    if (currentView !== 'tree') return;

    treeConnectionsSvg.innerHTML = '';
    const containerRect = treeDomContainer.getBoundingClientRect();
    const svgWidth = treeDomContainer.scrollWidth;
    const svgHeight = treeDomContainer.scrollHeight;

    treeConnectionsSvg.setAttribute('width', svgWidth);
    treeConnectionsSvg.setAttribute('height', svgHeight);

    const patriarchsBlock = document.getElementById('patriarchsBlock');
    const branchesRow = document.getElementById('branchesRow');

    if (!patriarchsBlock || !branchesRow) return;

    const pRect = patriarchsBlock.getBoundingClientRect();
    const startX = (pRect.left + pRect.width / 2) - containerRect.left;
    const startY = (pRect.bottom - 10) - containerRect.top;

    // Connect patriarchs to each branch header pill
    const branchHeaders = branchesRow.querySelectorAll('.branch-header-pill');
    branchHeaders.forEach(header => {
      const hRect = header.getBoundingClientRect();
      const endX = (hRect.left + hRect.width / 2) - containerRect.left;
      const endY = hRect.top - containerRect.top;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const midY = (startY + endY) / 2;
      const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#c59b27');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-opacity', '0.55');
      path.setAttribute('stroke-dasharray', '4, 4');

      treeConnectionsSvg.appendChild(path);
    });
  }

  // --- RENDERING: 2. BRANCHES GRID VIEW ---
  function renderBranchesView() {
    branchesContainer.innerHTML = '';

    const filterBranch = branchFilterSelect.value;
    const branchesToRender = filterBranch === 'all'
      ? familyData.branches
      : familyData.branches.filter(b => b.id === filterBranch);

    branchesToRender.forEach(branch => {
      const section = document.createElement('div');
      section.className = 'branch-section-card';

      const rawMembersInBranch = familyData.members.filter(m => m.branch === branch.id);
      const membersInBranch = [...rawMembersInBranch].sort((a, b) => {
        if (a.generation !== b.generation) return a.generation - b.generation;
        return getCanonicalMemberIndex(a.id) - getCanonicalMemberIndex(b.id);
      });
      const withPhotoCount = membersInBranch.filter(m => m.photo).length;

      section.innerHTML = `
        <div class="branch-section-header">
          <div class="branch-section-title">
            <span class="branch-color-dot" style="background-color: ${branch.color};"></span>
            <h3>${branch.name}</h3>
          </div>
          <span class="branch-count-badge">
            ${withPhotoCount}/${membersInBranch.length} con foto
          </span>
        </div>
        <div class="branch-members-grid"></div>
      `;

      const grid = section.querySelector('.branch-members-grid');
      membersInBranch.forEach(m => {
        grid.appendChild(createMemberCard(m, true));
      });

      branchesContainer.appendChild(section);
    });
  }

  // --- RENDERING: 3. DIRECTORY TABLE VIEW ---
  function renderDirectoryView() {
    directoryTableBody.innerHTML = '';

    const filterBranch = branchFilterSelect.value;
    const filterMissingOnly = missingPhotoOnlyCheckbox.checked;
    const searchVal = memberSearchInput.value.trim().toLowerCase();

    let list = familyData.members.filter(m => {
      if (filterBranch !== 'all' && m.branch !== filterBranch) return false;
      if (filterMissingOnly && m.photo) return false;
      if (searchVal) {
        const matchesName = m.name.toLowerCase().includes(searchVal);
        const matchesFullName = m.fullName && m.fullName.toLowerCase().includes(searchVal);
        const matchesRole = m.role && m.role.toLowerCase().includes(searchVal);
        if (!matchesName && !matchesFullName && !matchesRole) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation;
      return getCanonicalMemberIndex(a.id) - getCanonicalMemberIndex(b.id);
    });

    // Update Directory stats
    const totalMembers = familyData.members.length;
    const totalWithPhotos = familyData.members.filter(m => m.photo).length;
    directoryStats.innerHTML = `Mostrando <strong>${list.length}</strong> de <strong>${totalMembers}</strong> integrantes • <strong>${totalWithPhotos}</strong> con foto (${Math.round(totalWithPhotos / totalMembers * 100)}%)`;

    list.forEach(m => {
      const branch = getBranch(m.branch);
      const tr = document.createElement('tr');

      const spouse = m.spouseId ? getMember(m.spouseId) : null;
      const spouseName = spouse ? spouse.name : '-';

      tr.innerHTML = `
        <td>
          ${m.photo 
            ? `<img src="${m.photo}" class="table-avatar" alt="${m.name}">`
            : `<div class="table-avatar" style="background-color: ${branch.color}">${getInitials(m.name)}</div>`}
        </td>
        <td>
          <strong>${m.name}</strong>
          ${m.fullName ? `<div style="font-size:0.75rem; color:var(--text-muted);">${m.fullName}</div>` : ''}
        </td>
        <td>
          <span class="table-branch-pill" style="background-color: ${branch.color}22; color: ${branch.color}">
            <span class="branch-color-dot" style="background-color: ${branch.color}"></span>
            ${branch.name}
          </span>
        </td>
        <td>Gen ${m.generation}</td>
        <td>${getMemberDisplayRole(m) || '-'} ${m.badge ? `<span class="card-special-badge">${m.badge}</span>` : ''}</td>
        <td>${spouseName}</td>
        <td>
          <button class="btn small secondary edit-table-btn" data-id="${m.id}">
            ${m.photo ? 'Editar' : '📷 Agregar Foto'}
          </button>
        </td>
      `;

      tr.querySelector('.edit-table-btn').addEventListener('click', () => {
        openMemberModal(m.id);
      });

      directoryTableBody.appendChild(tr);
    });
  }

  // --- MINI-MAP IMPLEMENTATION ---
  function updateMiniMap() {
    if (!miniMapCanvas || !miniMapLens || !miniMapContainer) return;
    if (currentView !== 'tree') return;

    const ctx = miniMapCanvas.getContext('2d');
    const cw = miniMapCanvas.width;
    const ch = miniMapCanvas.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#f1ece1';
    ctx.fillRect(0, 0, cw, ch);

    const domWidth = treeDomContainer.offsetWidth || 5600;
    const domHeight = treeDomContainer.offsetHeight || 1200;

    const scaleX = cw / domWidth;
    const scaleY = ch / domHeight;

    // Draw branch clusters
    const branchCols = treeDomContainer.querySelectorAll('.branch-column');
    branchCols.forEach(col => {
      const rect = col.getBoundingClientRect();
      const parentRect = treeDomContainer.getBoundingClientRect();

      const rx = (rect.left - parentRect.left) * scaleX;
      const ry = (rect.top - parentRect.top) * scaleY;
      const rw = rect.width * scaleX;
      const rh = rect.height * scaleY;

      ctx.fillStyle = col.style.getPropertyValue('--card-branch-color') || '#722F37';
      ctx.globalAlpha = 0.65;
      ctx.fillRect(rx, ry, Math.max(rw, 4), Math.max(rh, 4));
    });
    ctx.globalAlpha = 1.0;

    // Draw Viewport Lens
    const vpRect = canvasViewport.getBoundingClientRect();
    const lensX = (-panX / scale) * scaleX;
    const lensY = (-panY / scale) * scaleY;
    const lensW = (vpRect.width / scale) * scaleX;
    const lensH = (vpRect.height / scale) * scaleY;

    miniMapLens.style.left = `${Math.max(0, lensX)}px`;
    miniMapLens.style.top = `${Math.max(0, lensY)}px`;
    miniMapLens.style.width = `${Math.min(cw, lensW)}px`;
    miniMapLens.style.height = `${Math.min(ch, lensH)}px`;
  }

  function onMiniMapClick(e) {
    if (!miniMapContainer || !miniMapCanvas) return;
    const rect = miniMapContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const domWidth = treeDomContainer.offsetWidth || 5600;
    const domHeight = treeDomContainer.offsetHeight || 1200;

    const targetX = (clickX / miniMapCanvas.width) * domWidth;
    const targetY = (clickY / miniMapCanvas.height) * domHeight;

    const vpRect = canvasViewport.getBoundingClientRect();
    panX = (vpRect.width / 2) - (targetX * scale);
    panY = (vpRect.height / 2) - (targetY * scale);

    applyCanvasTransform();
  }

  // --- PHOTO PROGRESS COUNTER ---
  function updatePhotoProgress() {
    const total = familyData.members.length;
    const count = familyData.members.filter(m => !!m.photo).length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;

    photoProgressText.textContent = `${count} / ${total} Fotos (${pct}%)`;
    photoProgressBarFill.style.width = `${pct}%`;
  }

  // --- SEARCH ENGINE ---
  function onSearchInput() {
    const query = memberSearchInput.value.trim().toLowerCase();
    clearSearchBtn.style.display = query ? 'block' : 'none';

    if (!query) {
      searchResultsDropdown.classList.remove('active');
      return;
    }

    const cleanQuery = stripAccents(query);
    const matches = familyData.members.filter(m => {
      const matchName = stripAccents(m.name || '').toLowerCase().includes(cleanQuery);
      const matchFull = m.fullName && stripAccents(m.fullName).toLowerCase().includes(cleanQuery);
      const matchRole = m.role && stripAccents(m.role).toLowerCase().includes(cleanQuery);
      const matchBadge = m.badge && stripAccents(m.badge).toLowerCase().includes(cleanQuery);
      return matchName || matchFull || matchRole || matchBadge;
    }).slice(0, 10);

    searchResultsDropdown.innerHTML = '';
    if (matches.length === 0) {
      searchResultsDropdown.innerHTML = '<div style="padding:0.8rem; font-size:0.8rem; color:var(--text-muted); text-align:center;">No se encontraron familiares con ese nombre</div>';
    } else {
      matches.forEach(m => {
        const branch = getBranch(m.branch);
        const item = document.createElement('div');
        item.className = 'search-result-item';

        item.innerHTML = `
          ${m.photo 
            ? `<img src="${m.photo}" class="search-result-avatar" alt="${m.name}">` 
            : `<div class="search-result-avatar" style="background-color: ${branch.color}">${getInitials(m.name)}</div>`}
          <div class="search-result-info">
            <div class="search-result-name">${m.fullName || m.name} ${m.badge ? `(${m.badge})` : ''}</div>
            <div class="search-result-sub">${branch.name} • Gen ${m.generation} • ${getMemberDisplayRole(m)}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          searchResultsDropdown.classList.remove('active');
          jumpToMember(m.id);
        });

        searchResultsDropdown.appendChild(item);
      });
    }

    searchResultsDropdown.classList.add('active');
  }

  function onBranchFilterChange() {
    renderAll();
    if (currentView === 'tree') {
      centerTreeOnPatriarchs();
    }
  }

  // --- MEMBER PROFILE & PHOTO EDIT MODAL ---
  function populateFormBranchOptions() {
    const formBranch = document.getElementById('formBranch');
    if (formBranch) {
      formBranch.innerHTML = '';
      familyData.branches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        formBranch.appendChild(opt);
      });
    }

    if (branchFilterSelect && familyData.branches) {
      const currentVal = branchFilterSelect.value || 'all';
      const nonPatronBranches = familyData.branches.filter(b => b.id !== 'patron');
      branchFilterSelect.innerHTML = `<option value="all">Todas las ramas (${nonPatronBranches.length})</option>`;
      nonPatronBranches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        branchFilterSelect.appendChild(opt);
      });
      branchFilterSelect.value = currentVal;
    }
  }

  function openMemberModal(memberId) {
    activeMemberId = memberId;
    const member = getMember(memberId);
    if (!member) return;

    const branch = getBranch(member.branch);
    currentModalPhoto = member.photo;

    // Header info
    modalMemberName.textContent = member.name;
    modalBranchTag.textContent = branch.name;
    modalBranchTag.style.backgroundColor = branch.color;

    // Show delete & quick actions for existing member
    if (deleteMemberBtn) deleteMemberBtn.style.display = 'inline-block';
    if (modalQuickActions) modalQuickActions.style.display = 'flex';

    // Form fields
    document.getElementById('formMemberId').value = member.id;
    let firstName = '';
    let lastName = '';
    const rawName = (member.name || '').trim();
    const full = (member.fullName || '').trim();

    if (full) {
      const cleanFull = stripAccents(full).toLowerCase();
      const cleanRaw = stripAccents(rawName).toLowerCase();
      if (cleanRaw && cleanFull.startsWith(cleanRaw)) {
        firstName = full.slice(0, rawName.length).trim();
        lastName = full.slice(rawName.length).trim();
      } else {
        const rawWords = rawName.split(/\s+/).filter(Boolean);
        const fullWords = full.split(/\s+/).filter(Boolean);
        if (fullWords.length > rawWords.length && rawWords.length > 0) {
          firstName = fullWords.slice(0, rawWords.length).join(' ');
          lastName = fullWords.slice(rawWords.length).join(' ');
        } else {
          firstName = full;
          lastName = '';
        }
      }
    } else {
      firstName = formatToTitleCase(rawName);
      lastName = '';
    }

    const firstNameInput = document.getElementById('formFirstName');
    const lastNameInput = document.getElementById('formLastName');
    if (firstNameInput) firstNameInput.value = firstName;
    if (lastNameInput) {
      lastNameInput.value = lastName;
      lastNameInput.dataset.autoInferred = 'false';
    }
    const genderEl = document.getElementById('formGender');
    if (genderEl) genderEl.value = member.gender || 'M';

    // Generación y Rol unificados
    const genRoleSelect = document.getElementById('formGenerationRole');
    if (genRoleSelect) {
      const isConyuge = member.role && member.role.includes('Cónyuge');
      const val = isConyuge ? `${member.generation}_conyuge` : `${member.generation}`;
      if (genRoleSelect.querySelector(`option[value="${val}"]`)) {
        genRoleSelect.value = val;
      } else {
        genRoleSelect.value = String(member.generation || 3);
      }
    }

    document.getElementById('formBirthYear').value = member.birthYear || '';
    document.getElementById('formNotes').value = member.notes || (member.badge ? (`Distinción: ${member.badge}`) : '');

    // Populate Parent & Spouse selects
    populateSpouseAndParentSelects(member);

    // Photo preview
    renderModalPhotoPreview(currentModalPhoto, member.name);

    memberModal.classList.add('active');
  }

  function setupSearchableCombobox({
    inputId,
    hiddenId,
    menuId,
    clearBtnId,
    placeholderNone,
    options,
    selectedId,
    onSelect
  }) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const menu = document.getElementById(menuId);
    const clearBtn = document.getElementById(clearBtnId);
    if (!input || !hidden || !menu || !clearBtn) return;

    // Set initial selection
    hidden.value = selectedId || '';
    if (selectedId) {
      const selectedItem = options.find(o => o.id === selectedId || (o.spouseId && o.spouseId === selectedId));
      input.value = selectedItem ? selectedItem.displayName : '';
      clearBtn.style.display = selectedItem ? 'block' : 'none';
    } else {
      input.value = '';
      clearBtn.style.display = 'none';
    }

    function renderMenu(filterText = '') {
      menu.innerHTML = '';
      const filterLower = filterText.toLowerCase().trim();

      // None item
      const noneItem = document.createElement('div');
      noneItem.className = `combobox-item none-item ${!hidden.value ? 'selected' : ''}`;
      noneItem.textContent = placeholderNone;
      noneItem.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectOption(null);
      });
      menu.appendChild(noneItem);

      const filtered = options.filter(opt => {
        if (!filterLower) return true;
        const text = `${opt.name} ${opt.fullName || ''} ${opt.spouseName || ''} ${opt.displayName || ''} ${opt.branchName || ''}`.toLowerCase();
        return text.includes(filterLower);
      });

      if (filtered.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'combobox-no-results';
        noResults.textContent = `No se encontró ningún integrante con "${filterText}"`;
        menu.appendChild(noResults);
        return;
      }

      filtered.forEach(opt => {
        const isSelected = hidden.value === opt.id || (opt.spouseId && hidden.value === opt.spouseId);
        const item = document.createElement('div');
        item.className = `combobox-item ${isSelected ? 'selected' : ''}`;

        const avatar = document.createElement('span');
        avatar.className = 'combobox-item-avatar';
        avatar.style.backgroundColor = opt.branchColor || '#722F37';
        avatar.textContent = opt.avatarText || getInitials(opt.name);
        item.appendChild(avatar);

        const info = document.createElement('div');
        info.className = 'combobox-item-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'combobox-item-name';
        nameEl.textContent = opt.fullName || opt.name;
        info.appendChild(nameEl);

        const metaEl = document.createElement('div');
        metaEl.className = 'combobox-item-meta';
        metaEl.style.color = opt.branchColor || 'var(--text-muted)';
        metaEl.textContent = `${opt.branchName} • Gen ${opt.generation}${opt.role ? ' • ' + opt.role : ''}`;
        info.appendChild(metaEl);

        item.appendChild(info);

        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectOption(opt);
        });

        menu.appendChild(item);
      });
    }

    function selectOption(opt) {
      if (opt) {
        hidden.value = opt.id;
        input.value = opt.displayName;
        clearBtn.style.display = 'block';
      } else {
        hidden.value = '';
        input.value = '';
        clearBtn.style.display = 'none';
      }
      menu.classList.remove('active');
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
      if (onSelect) onSelect(opt);
    }

    // Input events
    input.onfocus = () => {
      renderMenu('');
      menu.classList.add('active');
    };

    input.onclick = () => {
      renderMenu(input.value);
      menu.classList.add('active');
    };

    input.oninput = () => {
      renderMenu(input.value);
      menu.classList.add('active');
      if (!input.value.trim()) {
        hidden.value = '';
        clearBtn.style.display = 'none';
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    input.onblur = () => {
      setTimeout(() => {
        menu.classList.remove('active');
        if (hidden.value) {
          const opt = options.find(o => o.id === hidden.value || (o.spouseId && o.spouseId === hidden.value));
          if (opt) input.value = opt.displayName;
        } else {
          input.value = '';
        }
      }, 200);
    };

    clearBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectOption(null);
    };
  }

  function populateSpouseAndParentSelects(currentMember = {}) {
    // Sort alphabetically by full name for convenient selection
    const sorted = [...familyData.members].sort((a, b) => {
      const nameA = (a.fullName || a.name || '').toLowerCase();
      const nameB = (b.fullName || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const descendantIds = currentMember.id ? getAllDescendantIds(currentMember.id) : new Set();
    const spouseOptions = [];
    const parentOptions = [];
    const processedCouples = new Set();

    // 1. Opciones de cónyuge
    sorted.forEach(m => {
      if (currentMember.id && m.id === currentMember.id) return;
      const isDescendant = currentMember.id && descendantIds.has(m.id);
      if (isDescendant) return;

      const br = getBranch(m.branch);
      spouseOptions.push({
        id: m.id,
        name: m.name,
        fullName: m.fullName,
        branch: m.branch,
        branchName: br.name,
        branchColor: br.color,
        generation: m.generation,
        role: m.role,
        displayName: m.fullName || m.name
      });
    });

    // 2. Opciones de padres: mostrar las parejas de progenitores juntas
    sorted.forEach(m => {
      // Regla estricta: los padres no pueden ser uno mismo ni un descendiente
      if (currentMember.id && (m.id === currentMember.id || descendantIds.has(m.id))) return;

      // Validación de generación: los padres no pueden ser de igual o posterior generación
      const isInvalidParentGen = currentMember.generation && !currentMember.role?.includes('Cónyuge') && m.generation >= currentMember.generation;
      if (isInvalidParentGen) return;

      const spouse = m.spouseId ? familyData.members.find(s => s.id === m.spouseId) : null;

      // Si el cónyuge es el integrante actual o un descendiente, tampoco califica la pareja
      if (spouse && currentMember.id && (spouse.id === currentMember.id || descendantIds.has(spouse.id))) {
        return;
      }

      if (spouse) {
        // Llave única para la pareja (evita duplicar "A & B" y "B & A")
        const coupleKey = [m.id, spouse.id].sort().join('___');
        if (processedCouples.has(coupleKey)) return;
        processedCouples.add(coupleKey);

        // Colocar primero al integrante de la rama/linaje directo
        const isSpouseRole = m.role && m.role.includes('Cónyuge');
        const primary = isSpouseRole ? spouse : m;
        const partner = isSpouseRole ? m : spouse;

        const br = getBranch(primary.branch || partner.branch);
        const primaryName = primary.fullName || primary.name;
        const partnerName = partner.fullName || partner.name;
        const coupleDisplayName = `${primaryName} & ${partnerName}`;

        parentOptions.push({
          id: primary.id,
          spouseId: partner.id,
          name: `${primary.name} & ${partner.name}`,
          fullName: coupleDisplayName,
          displayName: coupleDisplayName,
          spouseName: partnerName,
          branch: primary.branch || partner.branch,
          branchName: br.name,
          branchColor: br.color,
          generation: primary.generation || partner.generation,
          role: 'Pareja Progenitora',
          avatarText: '👥'
        });
      } else {
        // Progenitor individual sin cónyuge
        const br = getBranch(m.branch);
        const dispName = m.fullName || m.name;
        parentOptions.push({
          id: m.id,
          spouseId: null,
          name: m.name,
          fullName: dispName,
          displayName: dispName,
          spouseName: '',
          branch: m.branch,
          branchName: br.name,
          branchColor: br.color,
          generation: m.generation,
          role: m.role,
          avatarText: getInitials(m.name)
        });
      }
    });

    // Ordenar padres alfabéticamente por nombre de la pareja
    parentOptions.sort((a, b) => a.displayName.localeCompare(b.displayName));

    setupSearchableCombobox({
      inputId: 'formSpouseSearch',
      hiddenId: 'formSpouse',
      menuId: 'spouseDropdownMenu',
      clearBtnId: 'spouseClearBtn',
      placeholderNone: '(Ninguno / Soltero)',
      options: spouseOptions,
      selectedId: currentMember.spouseId || null,
      onSelect: (opt) => {
        if (opt) {
          const spouse = familyData.members.find(m => m.id === opt.id);
          if (spouse) {
            const parentId = document.getElementById('formParent').value;
            if (!parentId) {
              const br = getBranch(spouse.branch);
              modalBranchTag.textContent = br.name;
              modalBranchTag.style.backgroundColor = br.color;
            }
            const genRoleSelect = document.getElementById('formGenerationRole');
            if (genRoleSelect && !activeMemberId) {
              const spouseGen = spouse.generation || 3;
              genRoleSelect.value = `${spouseGen}_conyuge`;
            }
          }
        }
      }
    });

    setupSearchableCombobox({
      inputId: 'formParentSearch',
      hiddenId: 'formParent',
      menuId: 'parentDropdownMenu',
      clearBtnId: 'parentClearBtn',
      placeholderNone: '(Ninguno / Raíz)',
      options: parentOptions,
      selectedId: currentMember.parentId || null,
      onSelect: (opt) => {
        if (opt) {
          const parent = familyData.members.find(m => m.id === opt.id);
          if (parent) {
            const nextGen = Math.min(5, (parent.generation || 2) + 1);
            const genRoleSelect = document.getElementById('formGenerationRole');
            if (genRoleSelect && !activeMemberId) {
              genRoleSelect.value = String(nextGen);
            }
            const br = getBranch(parent.branch);
            modalBranchTag.textContent = br.name;
            modalBranchTag.style.backgroundColor = br.color;
          }

          // Auto-completar apellidos según progenitores elegidos
          const lastNameInput = document.getElementById('formLastName');
          if (lastNameInput) {
            const isAuto = lastNameInput.dataset.autoInferred === 'true';
            const isEmpty = !lastNameInput.value.trim();
            if (isEmpty || isAuto) {
              const inferred = inferChildSurnames(opt.id, opt.spouseId);
              if (inferred) {
                lastNameInput.value = inferred;
                lastNameInput.dataset.autoInferred = 'true';
              }
            }
          }
        } else {
          // Si quita la selección y el apellido fue auto-inferido, limpiarlo si es nuevo
          const lastNameInput = document.getElementById('formLastName');
          if (lastNameInput && lastNameInput.dataset.autoInferred === 'true' && !activeMemberId) {
            lastNameInput.value = '';
            lastNameInput.dataset.autoInferred = 'false';
          }
        }
      }
    });
  }

  function renderModalPhotoPreview(photoUrl, name) {
    modalPhotoPreview.innerHTML = '';
    const removeBtn = document.getElementById('removePhotoBtn');
    if (photoUrl) {
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = name || 'Foto';
      modalPhotoPreview.appendChild(img);
      modalPhotoPreview.classList.remove('empty');
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      modalPhotoPreview.textContent = getInitials(name || 'Nuevo');
      modalPhotoPreview.classList.add('empty');
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  // Client-side image compressor & square cropper (reduces 10MB to ~35KB)
  function compressImageFile(file, maxDimension = 400, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const minDim = Math.min(width, height);
          const sx = (width - minDim) / 2;
          const sy = (height - minDim) / 2;

          canvas.width = maxDimension;
          canvas.height = maxDimension;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxDimension, maxDimension);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showToast('⏳ Optimizando fotografía...');
      currentModalPhoto = await compressImageFile(file);
      renderModalPhotoPreview(currentModalPhoto, document.getElementById('formFirstName')?.value || 'Foto');
      showToast('📸 Foto lista y optimizada. Recuerda pulsar "Guardar Cambios".');
    } catch (err) {
      console.error(err);
      showToast('⚠️ No se pudo procesar la foto.');
    }
  }

  async function pasteImageFromClipboard() {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (evt) => {
              currentModalPhoto = evt.target.result;
              renderModalPhotoPreview(currentModalPhoto, document.getElementById('formFirstName')?.value || 'Foto');
              showToast('📋 ¡Foto pegada desde el portapapeles!');
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      showToast('ℹ️ No se detectó ninguna imagen en el portapapeles. Copia una imagen y presiona Ctrl + V.');
    } catch (err) {
      console.warn('Clipboard read error:', err);
      showToast('💡 Presiona Ctrl + V para pegar la imagen que tienes copiada.');
    }
  }

  function handleGlobalPaste(e) {
    if (!memberModal.classList.contains('active')) return;
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            currentModalPhoto = evt.target.result;
            renderModalPhotoPreview(currentModalPhoto, document.getElementById('formFirstName')?.value || 'Foto');
            showToast('📋 ¡Foto pegada desde el portapapeles!');
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  }

  function saveModalMember() {
    const firstName = (document.getElementById('formFirstName')?.value || '').trim();
    const lastName = (document.getElementById('formLastName')?.value || '').trim();
    if (!firstName) {
      alert('Por favor escribe al menos el nombre de la persona.');
      document.getElementById('formFirstName')?.focus();
      return;
    }

    let id = document.getElementById('formMemberId').value;
    const parentId = document.getElementById('formParent').value || null;
    const spouseId = document.getElementById('formSpouse').value || null;

    // VALIDACIÓN ESTRICTA DE JERARQUÍA Y PREVENCIÓN DE CICLOS
    if (id) {
      if (parentId === id) {
        alert('⚠️ Error: Un integrante familiar no puede ser su propio padre o madre.');
        return;
      }
      if (spouseId === id) {
        alert('⚠️ Error: Un integrante familiar no puede ser su propio cónyuge.');
        return;
      }
      if (parentId && spouseId && parentId === spouseId) {
        alert('⚠️ Error: El cónyuge no puede ser a la vez el padre o madre del integrante.');
        return;
      }
      if (parentId) {
        const descendantIds = getAllDescendantIds(id);
        if (descendantIds.has(parentId)) {
          const p = getMember(parentId);
          const pName = p ? (p.fullName || p.name) : 'este integrante';
          alert(`⚠️ Error de jerarquía familiar:\n\nNo puedes asignar a ${pName} como padre/madre porque es un descendiente (hijo, nieto, etc.) de ${firstName}.\n\nAsignarlo crearía una referencia circular y desconectaría a la familia del árbol.`);
          return;
        }
      }
      if (spouseId) {
        const descendantIds = getAllDescendantIds(id);
        if (descendantIds.has(spouseId)) {
          alert('⚠️ Error: No puedes asignar a un descendiente como cónyuge.');
          return;
        }
      }
    }

    let member = id ? getMember(id) : null;

    const isNew = !member;
    if (isNew) {
      id = `integrante_${Date.now()}`;
      member = { id };
      familyData.members.push(member);
    }

    member.name = firstName.toUpperCase();
    member.fullName = lastName ? `${firstName} ${lastName}` : firstName;
    const genderEl = document.getElementById('formGender');
    member.gender = genderEl ? genderEl.value : (member.gender || 'M');
    member.parentId = parentId;
    member.spouseId = spouseId;

    // Rama determinada automáticamente por padres o cónyuge
    if (parentId) {
      const parent = getMember(parentId);
      if (parent && parent.branch) {
        member.branch = parent.branch;
      }
    } else if (spouseId) {
      const spouse = getMember(spouseId);
      if (spouse && spouse.branch) {
        member.branch = spouse.branch;
      }
    } else if (!member.branch) {
      member.branch = familyData.branches.find(b => b.id !== 'patron')?.id || familyData.branches[0]?.id || 'principal';
    }

    // Generación y Rol integrados
    const genRoleVal = document.getElementById('formGenerationRole').value;
    const isConyuge = genRoleVal.endsWith('_conyuge');
    const genNum = parseInt(genRoleVal, 10) || 3;
    member.generation = genNum;

    if (isConyuge) {
      if (genNum === 2) member.role = 'Cónyuge';
      else if (genNum === 3) member.role = 'Cónyuge Nieto';
      else if (genNum === 4) member.role = 'Cónyuge Bisnieto';
      else if (genNum === 5) member.role = 'Cónyuge Tataranieto';
      else member.role = 'Cónyuge';
    } else {
      if (genNum === 1) member.role = member.gender === 'F' ? 'Matriarca' : 'Patriarca';
      else if (genNum === 2) member.role = member.gender === 'F' ? 'Hija' : 'Hijo';
      else if (genNum === 3) member.role = member.gender === 'F' ? 'Nieta' : 'Nieto';
      else if (genNum === 4) member.role = member.gender === 'F' ? 'Bisnieta' : 'Bisnieto';
      else if (genNum === 5) member.role = member.gender === 'F' ? 'Tataranieta' : 'Tataranieto';
      else member.role = `Gen ${genNum}`;
    }

    const rawBirthYear = document.getElementById('formBirthYear').value.trim();
    member.birthYear = rawBirthYear ? parseInt(rawBirthYear, 10) : null;
    member.notes = document.getElementById('formNotes').value.trim();
    member.photo = currentModalPhoto;

    // Conexión recíproca de cónyuge
    if (member.spouseId) {
      const spouse = getMember(member.spouseId);
      if (spouse && !spouse.spouseId) {
        spouse.spouseId = member.id;
      }
    }

    saveData();
    saveMemberToCloud(member);
    closeModal();
    renderAll();
    showToast(isNew ? `🎉 ${member.name} añadido al árbol familiar.` : `💾 Datos de ${member.name} guardados correctamente.`);
  }

  function confirmDeleteMember() {
    if (!activeMemberId) return;
    const member = getMember(activeMemberId);
    if (!member) return;

    if (confirm(`¿Estás seguro de que deseas eliminar a ${member.name} del árbol genealógico?`)) {
      familyData.members = familyData.members.filter(m => m.id !== activeMemberId);
      saveData();
      deleteMemberFromCloud(activeMemberId);
      closeModal();
      renderAll();
      showToast(`🗑️ ${member.name} eliminado del árbol.`);
    }
  }

  function openAddMemberModal(preset = {}) {
    if (actionsDropdown) actionsDropdown.classList.remove('active');
    activeMemberId = null;
    currentModalPhoto = null;

    let branchId = preset.branch;
    if (!branchId && preset.parentId) {
      const parent = getMember(preset.parentId);
      if (parent) branchId = parent.branch;
    }
    if (!branchId && preset.spouseId) {
      const spouse = getMember(preset.spouseId);
      if (spouse) branchId = spouse.branch;
    }
    if (!branchId) {
      branchId = familyData.branches.find(b => b.id !== 'patron')?.id || familyData.branches[0]?.id || 'principal';
    }
    const br = getBranch(branchId);

    modalMemberName.textContent = 'Nuevo Integrante Familiar';
    modalBranchTag.textContent = br.name;
    modalBranchTag.style.backgroundColor = br.color;

    // Hide delete & quick relation actions when adding a new member
    if (deleteMemberBtn) deleteMemberBtn.style.display = 'none';
    if (modalQuickActions) modalQuickActions.style.display = 'none';

    document.getElementById('formMemberId').value = '';
    const firstNameInput = document.getElementById('formFirstName');
    const lastNameInput = document.getElementById('formLastName');
    if (firstNameInput) firstNameInput.value = preset.firstName || preset.name || '';

    let initialLastName = preset.lastName || '';
    if (!initialLastName && preset.parentId) {
      const p = getMember(preset.parentId);
      const spouseId = p ? p.spouseId : null;
      initialLastName = inferChildSurnames(preset.parentId, spouseId);
      if (lastNameInput) lastNameInput.dataset.autoInferred = 'true';
    } else {
      if (lastNameInput) lastNameInput.dataset.autoInferred = 'false';
    }
    if (lastNameInput) lastNameInput.value = initialLastName;
    const genderEl = document.getElementById('formGender');
    if (genderEl) genderEl.value = preset.gender || 'M';

    const genRoleSelect = document.getElementById('formGenerationRole');
    if (genRoleSelect) {
      let targetGen = preset.generation;
      if (!targetGen) {
        const nonSpouseMembers = familyData.members.filter(m => !m.role?.includes('Cónyuge'));
        const maxGen = nonSpouseMembers.length > 0 
          ? Math.max(...nonSpouseMembers.map(m => m.generation || 1)) 
          : 1;
        targetGen = Math.min(maxGen === 1 ? 2 : maxGen, 5);
      }
      const isConyuge = preset.role && preset.role.includes('Cónyuge');
      const val = isConyuge ? `${targetGen}_conyuge` : `${targetGen}`;
      genRoleSelect.value = val;
    }

    document.getElementById('formBirthYear').value = preset.birthYear || '';
    document.getElementById('formNotes').value = preset.notes || '';

    populateSpouseAndParentSelects({
      id: null,
      spouseId: preset.spouseId || null,
      parentId: preset.parentId || null
    });

    renderModalPhotoPreview(null, 'Nuevo');
    memberModal.classList.add('active');
  }

  function closeModal() {
    memberModal.classList.remove('active');
    activeMemberId = null;
    currentModalPhoto = null;
  }

  // --- EXPORT & IMPORT MODULES ---
  function getFamilyFileSlug() {
    return (familyData?.meta?.id || familyData?.meta?.familyName || 'familia')
      .toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  function exportBackupJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(familyData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${getFamilyFileSlug()}_respaldo_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchor.click();
    showToast('📥 Copia de seguridad descargada exitosamente.');
  }

  function handleImportJsonFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const imported = JSON.parse(loadEvent.target.result);
        if (imported && imported.members && Array.isArray(imported.members)) {
          familyData = imported;
          sanitizeAndRepairData(familyData);
          saveData();
          renderAll();
          showToast(`✅ Respaldo restaurado: ${familyData.members.length} integrantes cargados.`);
        } else {
          alert('El archivo JSON no tiene un formato válido de árbol genealógico.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function exportCsvFile() {
    const headers = ['ID', 'Nombre', 'Nombre Completo', 'Rama Familiar', 'Generacion', 'Rol', 'Distincion', 'Tiene Foto', 'Año Nacimiento', 'Orden', 'Conyuge', 'Progenitor', 'Notas'];
    const rows = familyData.members.map(m => {
      const branch = getBranch(m.branch).name;
      return [
        `"${m.id}"`,
        `"${m.name}"`,
        `"${m.fullName || m.name}"`,
        `"${branch}"`,
        m.generation,
        `"${m.role || ''}"`,
        `"${m.badge || ''}"`,
        m.photo ? 'SI' : 'NO',
        m.birthYear ? `"${m.birthYear}"` : '""',
        (m.order !== undefined && m.order !== null) ? `"${m.order}"` : '""',
        `"${m.spouseId || ''}"`,
        `"${m.parentId || ''}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${getFamilyFileSlug()}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast('📊 Archivo Excel CSV descargado.');
  }

  function exportGedcomFile() {
    let ged = [
      '0 HEAD',
      `1 SOUR ${familyData?.meta?.familyName || 'ArbolFamiliar'}`,
      '1 GEDC',
      '2 VERS 5.5',
      '2 FORM LINEAGE-LINKED',
      '1 CHAR UTF-8'
    ];

    familyData.members.forEach(m => {
      ged.push(`0 @${m.id}@ INDI`);
      ged.push(`1 NAME ${m.name} /${m.fullName || ''}/`);
      if (m.gender) ged.push(`1 SEX ${m.gender}`);
      if (m.notes) ged.push(`1 NOTE ${m.notes}`);
    });

    ged.push('0 TRLR');

    const gedStr = ged.join('\r\n');
    const blob = new Blob([gedStr], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${getFamilyFileSlug()}.ged`;
    link.click();
    showToast('📜 Archivo GEDCOM estándar descargado.');
  }

  function toggleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    document.body.className = themes[currentThemeIndex];
    const themeNames = ['Fondo Floral Magnolias Original', 'Lienzo Minimalista Claro', 'Modo Oscuro Sofisticado'];
    showToast(`🎨 Tema: ${themeNames[currentThemeIndex]}`);
  }

  function confirmResetData() {
    if (confirm('¿Restaurar los datos originales del póster? (Las fotos que hayas subido se borrarán si no descargaste un respaldo)')) {
      familyData = JSON.parse(JSON.stringify(FAMILY_TREE_DATA));
      saveData();
      renderAll();
      showToast('🔄 Árbol restaurado a la versión original de la foto.');
    }
  }

  // --- REPORT ERROR MODAL LOGIC ---
  const reportErrorModal = document.getElementById('reportErrorModal');

  function openReportErrorModal() {
    if (reportErrorModal) {
      const descEl = document.getElementById('reportDescription');
      if (descEl) descEl.value = '';
      reportErrorModal.classList.add('active');
    }
  }

  function closeReportErrorModal() {
    if (reportErrorModal) reportErrorModal.classList.remove('active');
  }

  function submitReportError() {
    const descEl = document.getElementById('reportDescription');
    const desc = descEl ? descEl.value.trim() : '';
    if (!desc) {
      alert('Por favor describe brevemente el error o corrección.');
      return;
    }

    const reportTypeEl = document.getElementById('reportType');
    const reportType = reportTypeEl ? reportTypeEl.value : 'datos';

    const reportObj = {
      id: `rep_${Date.now()}`,
      timestamp: new Date().toISOString(),
      reportType,
      description: desc
    };

    // 1. Guardar en localStorage
    try {
      const existingReports = JSON.parse(localStorage.getItem('familia_reyna_aliaga_reports') || '[]');
      existingReports.push(reportObj);
      localStorage.setItem('familia_reyna_aliaga_reports', JSON.stringify(existingReports));
    } catch (e) {
      console.warn('Error guardando reporte en localStorage:', e);
    }

    // 2. Guardar en Firestore si está conectado
    if (isCloudActive && firestoreDb) {
      firestoreDb.collection('families').doc(getFamilyCloudDocId()).collection('error_reports')
        .add(reportObj)
        .then(() => console.log('Reporte enviado a Firestore'))
        .catch(err => console.error('Error enviando reporte a Firestore:', err));
    }

    closeReportErrorModal();
    showToast('✅ ¡Muchas gracias! Tu reporte ha sido enviado para corregir el árbol.');
  }

  // --- KEYBOARD SHORTCUTS ---
  function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === '+' || e.key === '=') zoomBy(1.15);
    else if (e.key === '-' || e.key === '_') zoomBy(0.85);
    else if (e.key === '0') centerTreeOnPatriarchs();
    else if (e.key === 'Escape') closeModal();
    else if (e.key === 'f' || e.key === 'F') fitTreeToScreen();
  }

  // --- TOAST HELPER ---
  function showToast(msg) {
    toastNotification.textContent = msg;
    toastNotification.classList.add('show');
    clearTimeout(toastNotification._timer);
    toastNotification._timer = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 3200);
  }

  // --- RENDER MASTER DISPATCHER ---
  function renderAll() {
    renderTreeView();
    if (currentView === 'branches') renderBranchesView();
    if (currentView === 'directory') renderDirectoryView();
    updatePhotoProgress();
  }

  // Start app
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
