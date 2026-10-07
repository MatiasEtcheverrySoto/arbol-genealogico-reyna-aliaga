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
  let scale = 0.85;
  let panX = 150;
  let panY = 50;
  let isDragging = false;
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
  const memberPhotoUrlInput = document.getElementById('memberPhotoUrlInput');
  const loadUrlPhotoBtn = document.getElementById('loadUrlPhotoBtn');
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

  function listenToCloudMembers() {
    if (!firestoreDb) return;

    const colRef = firestoreDb.collection('families').doc('reyna_aliaga').collection('members');

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
        familyData.members = cloudMembers;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(familyData));
        renderAll();
        if (initialLoadDone) {
          showToast('☁️ Árbol actualizado por un familiar en tiempo real.');
        } else {
          showToast(`☁️ Nube conectada: ${cloudMembers.length} integrantes cargados.`);
        }
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
      firestoreDb.collection('families').doc('reyna_aliaga').collection('members')
        .doc(member.id).set(clean, { merge: true })
        .catch(err => console.error('Error guardando en Firestore:', err));
    } catch (err) {
      console.error('Error serializando miembro para Firestore:', err);
    }
  }

  function deleteMemberFromCloud(memberId) {
    if (!isCloudActive || !firestoreDb) return;
    firestoreDb.collection('families').doc('reyna_aliaga').collection('members')
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
  function init() {
    loadData();
    populateFormBranchOptions();
    bindEvents();
    renderAll();
    centerTreeOnPatriarchs();
    updatePhotoProgress();
    initCloudSync();
    bindCloudEvents();
  }

  // --- DATA LOADING & PERSISTENCE ---
  const STORAGE_KEY = 'familia_reyna_aliaga_v3';

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        familyData = JSON.parse(stored);
        // Asegurar que integrantes base nuevos y fotos base se sincronicen
        FAMILY_TREE_DATA.members.forEach(baseM => {
          const existing = familyData.members.find(m => m.id === baseM.id);
          if (!existing) {
            familyData.members.push(JSON.parse(JSON.stringify(baseM)));
          } else {
            if (!existing.photo && baseM.photo) existing.photo = baseM.photo;
            if (baseM.fullName && (!existing.fullName || existing.fullName === existing.name)) {
              existing.fullName = baseM.fullName;
            }
          }
        });
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
        saveData();
      }
    } catch (e) {
      console.error('Error loading data from localStorage, using default:', e);
      familyData = JSON.parse(JSON.stringify(FAMILY_TREE_DATA));
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

  // --- EVENT BINDING ---
  function bindEvents() {
    // Canvas Pan & Zoom
    canvasViewport.addEventListener('mousedown', onCanvasMouseDown);
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);
    canvasViewport.addEventListener('wheel', onCanvasWheel, { passive: false });

    // Touch Support
    let lastTouchX = 0, lastTouchY = 0, initialDistance = 0;
    canvasViewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    canvasViewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        panX += dx;
        panY += dy;
        applyCanvasTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / initialDistance;
        scale = Math.min(Math.max(scale * factor, 0.2), 2.5);
        initialDistance = dist;
        applyCanvasTransform();
      }
    }, { passive: true });

    canvasViewport.addEventListener('touchend', () => { isDragging = false; });

    // HUD Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => zoomBy(1.2));
    document.getElementById('zoomOutBtn').addEventListener('click', () => zoomBy(0.8));
    document.getElementById('fitScreenBtn').addEventListener('click', fitTreeToScreen);
    document.getElementById('resetViewBtn').addEventListener('click', centerTreeOnPatriarchs);
    canvasHelpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    helpModalCloseBtn.addEventListener('click', () => helpModal.classList.remove('active'));
    closeHelpModalBtn.addEventListener('click', () => helpModal.classList.remove('active'));

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

    const memberForm = document.getElementById('memberForm');
    if (memberForm) {
      memberForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveModalMember();
      });
    }

    const formParentInput = document.getElementById('formParent');
    if (formParentInput) {
      formParentInput.addEventListener('change', (e) => {
        const pId = e.target.value;
        if (pId) {
          const parent = getMember(pId);
          if (parent) {
            document.getElementById('formBranch').value = parent.branch;
            const nextGen = Math.min(5, (parent.generation || 2) + 1);
            document.getElementById('formGeneration').value = nextGen;
            const br = getBranch(parent.branch);
            modalBranchTag.textContent = br.name;
            modalBranchTag.style.backgroundColor = br.color;
            const roleEl = document.getElementById('formRole');
            if (roleEl && (!roleEl.value || roleEl.value === 'Nuevo integrante' || roleEl.value === 'Integrante')) {
              roleEl.value = nextGen === 3 ? 'Nieto' : (nextGen === 4 ? 'Bisnieto' : 'Tataranieto');
            }
          }
        }
      });
    }

    const formBranchInput = document.getElementById('formBranch');
    if (formBranchInput) {
      formBranchInput.addEventListener('change', (e) => {
        const br = getBranch(e.target.value);
        modalBranchTag.textContent = br.name;
        modalBranchTag.style.backgroundColor = br.color;
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
    loadUrlPhotoBtn.addEventListener('click', handlePhotoUrlLoad);
    removePhotoBtn.addEventListener('click', () => {
      currentModalPhoto = null;
      renderModalPhotoPreview(null, modalMemberName.textContent);
    });

    // Mini-map drag/click
    miniMapContainer.addEventListener('mousedown', onMiniMapClick);

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
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyCanvasTransform();
  }

  function onCanvasMouseUp() {
    isDragging = false;
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
    scale = 0.85;
    // The patriarchs are horizontally centered in treeDomContainer (~3000px mark)
    const domWidth = treeDomContainer.offsetWidth || 5600;
    panX = (viewportRect.width / 2) - (domWidth / 2 * scale);
    panY = 60;
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

    const carlosAlberto = getMember('carlos_alberto');
    const mariaLaura = getMember('maria_laura');

    if (carlosAlberto) couplesRow.appendChild(createMemberCard(carlosAlberto));
    if (mariaLaura) couplesRow.appendChild(createMemberCard(mariaLaura));

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
    gen2Members.forEach(m => {
      headWrap.appendChild(createMemberCard(m));
    });
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

  function renderStandardBranchDescendants(container, branchId) {
    // Group Gen 3 members into couples or singles
    const gen3Members = familyData.members.filter(m => m.branch === branchId && m.generation === 3);
    const renderedGen3 = new Set();
    const gen3Row = document.createElement('div');
    gen3Row.className = 'subgroup-couples';

    gen3Members.forEach(m => {
      if (renderedGen3.has(m.id)) return;

      const groupContainer = document.createElement('div');
      groupContainer.className = 'branch-couples-wrap';

      const coupleDiv = document.createElement('div');
      coupleDiv.className = 'couple-group';
      coupleDiv.appendChild(createMemberCard(m));
      renderedGen3.add(m.id);

      if (m.spouseId) {
        const spouse = getMember(m.spouseId);
        if (spouse && spouse.branch === branchId) {
          coupleDiv.appendChild(createMemberCard(spouse));
          renderedGen3.add(spouse.id);
        }
      }
      groupContainer.appendChild(coupleDiv);

      // Children of this couple (Gen 4)
      const children = familyData.members.filter(c => c.parentId === m.id || (m.spouseId && c.parentId === m.spouseId));
      if (children.length > 0) {
        const kidsRow = document.createElement('div');
        kidsRow.className = 'children-row';
        children.forEach(child => {
          kidsRow.appendChild(createMemberCard(child, true));
        });
        groupContainer.appendChild(kidsRow);
      }

      gen3Row.appendChild(groupContainer);
    });

    container.appendChild(gen3Row);
  }

  function renderFernandoBranchDescendants(container) {
    const branchMembers = familyData.members.filter(m => m.branch === 'fernando' && m.generation >= 3);
    const rendered = new Set();

    branchMembers.forEach(m => {
      if (rendered.has(m.id) || m.generation > 3) return;

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

      // Children
      const kids = familyData.members.filter(c => c.parentId === m.id);
      if (kids.length > 0) {
        const kidsRow = document.createElement('div');
        kidsRow.className = 'children-row';
        kids.forEach(k => {
          kidsRow.appendChild(createMemberCard(k, true));
          rendered.add(k.id);
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

    // Surnames / Apellidos (heredados del padre y de la madre)
    const surnameEl = document.createElement('div');
    surnameEl.className = 'card-surnames';
    let surnames = '';
    if (member.fullName && member.fullName.trim()) {
      const nameParts = member.name.trim().split(/\s+/);
      const fullParts = member.fullName.trim().split(/\s+/);
      if (fullParts.length > nameParts.length) {
        surnames = fullParts.slice(nameParts.length).join(' ');
      } else if (fullParts.length > 1 && !member.name.includes(' ')) {
        surnames = fullParts.slice(1).join(' ');
      }
    }
    if (surnames) {
      surnameEl.textContent = surnames;
    } else {
      surnameEl.innerHTML = '&nbsp;';
    }
    card.appendChild(surnameEl);

    // Role / Generation
    if (!isCompact || member.badge) {
      const roleEl = document.createElement('div');
      roleEl.className = 'card-role';
      roleEl.textContent = member.role || `Gen ${member.generation}`;
      card.appendChild(roleEl);
    }

    // Special badge (e.g. Sacerdote)
    if (member.badge) {
      const badgeEl = document.createElement('div');
      badgeEl.className = 'card-special-badge';
      badgeEl.textContent = member.badge;
      card.appendChild(badgeEl);
    }

    // Click handler to open edit modal
    card.addEventListener('click', (e) => {
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

      const membersInBranch = familyData.members.filter(m => m.branch === branch.id);
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
        <td>${m.role || '-'} ${m.badge ? `<span class="card-special-badge">${m.badge}</span>` : ''}</td>
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

    const matches = familyData.members.filter(m => {
      const matchName = m.name.toLowerCase().includes(query);
      const matchFull = m.fullName && m.fullName.toLowerCase().includes(query);
      const matchRole = m.role && m.role.toLowerCase().includes(query);
      const matchBadge = m.badge && m.badge.toLowerCase().includes(query);
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
            <div class="search-result-sub">${branch.name} • Gen ${m.generation} • ${m.role || ''}</div>
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
    formBranch.innerHTML = '';
    familyData.branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      formBranch.appendChild(opt);
    });
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
    document.getElementById('formName').value = member.name;
    document.getElementById('formFullName').value = member.fullName || '';
    document.getElementById('formBranch').value = member.branch;
    document.getElementById('formGeneration').value = member.generation;
    document.getElementById('formRole').value = member.role || '';
    document.getElementById('formBadge').value = member.badge || '';
    document.getElementById('formGender').value = member.gender || 'M';
    document.getElementById('formNotes').value = member.notes || '';

    // Populate Parent & Spouse selects
    populateSpouseAndParentSelects(member);

    // Photo preview
    renderModalPhotoPreview(currentModalPhoto, member.name);

    memberModal.classList.add('active');
  }

  function populateSpouseAndParentSelects(currentMember = {}) {
    const formSpouse = document.getElementById('formSpouse');
    const formParent = document.getElementById('formParent');

    formSpouse.innerHTML = '<option value="">(Ninguno / Soltero)</option>';
    formParent.innerHTML = '<option value="">(Ninguno / Raíz)</option>';

    // Sort alphabetically by full name for convenient selection
    const sorted = [...familyData.members].sort((a, b) => {
      const nameA = (a.fullName || a.name || '').toLowerCase();
      const nameB = (b.fullName || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    sorted.forEach(m => {
      if (currentMember.id && m.id === currentMember.id) return;

      const optSpouse = document.createElement('option');
      optSpouse.value = m.id;
      optSpouse.textContent = `${m.fullName || m.name} (${getBranch(m.branch).name})`;
      if (m.id === currentMember.spouseId) optSpouse.selected = true;
      formSpouse.appendChild(optSpouse);

      const optParent = document.createElement('option');
      optParent.value = m.id;
      optParent.textContent = `${m.fullName || m.name} (${getBranch(m.branch).name} - Gen ${m.generation})`;
      if (m.id === currentMember.parentId) optParent.selected = true;
      formParent.appendChild(optParent);
    });
  }

  function renderModalPhotoPreview(photoUrl, name) {
    modalPhotoPreview.innerHTML = '';
    if (photoUrl) {
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = name;
      modalPhotoPreview.appendChild(img);
      modalPhotoPreview.classList.remove('empty');
    } else {
      modalPhotoPreview.textContent = getInitials(name || 'Nuevo');
      modalPhotoPreview.classList.add('empty');
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
      renderModalPhotoPreview(currentModalPhoto, document.getElementById('formName').value || 'Foto');
      showToast('📸 Foto lista y optimizada. Recuerda pulsar "Guardar Cambios".');
    } catch (err) {
      console.error(err);
      showToast('⚠️ No se pudo procesar la foto.');
    }
  }

  function handlePhotoUrlLoad() {
    const url = memberPhotoUrlInput.value.trim();
    if (!url) return;

    currentModalPhoto = url;
    renderModalPhotoPreview(currentModalPhoto, document.getElementById('formName').value || 'Foto');
    memberPhotoUrlInput.value = '';
    showToast('📸 Enlace de imagen cargado.');
  }

  function saveModalMember() {
    const rawName = document.getElementById('formName').value.trim();
    if (!rawName) {
      alert('Por favor escribe al menos el nombre de pila de la persona.');
      return;
    }

    let id = document.getElementById('formMemberId').value;
    let member = id ? getMember(id) : null;

    const isNew = !member;
    if (isNew) {
      id = `integrante_${Date.now()}`;
      member = { id };
      familyData.members.push(member);
    }

    member.name = rawName.toUpperCase();
    member.fullName = document.getElementById('formFullName').value.trim();
    member.branch = document.getElementById('formBranch').value;
    member.generation = parseInt(document.getElementById('formGeneration').value, 10) || 3;
    member.role = document.getElementById('formRole').value.trim() || (isNew ? 'Integrante' : '');
    member.badge = document.getElementById('formBadge').value.trim();
    member.gender = document.getElementById('formGender').value || 'M';
    member.spouseId = document.getElementById('formSpouse').value || null;
    member.parentId = document.getElementById('formParent').value || null;
    member.notes = document.getElementById('formNotes').value.trim();
    member.photo = currentModalPhoto;

    // Reciprocal spouse connection
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

    const branchId = preset.branch || 'graciela';
    const br = getBranch(branchId);

    modalMemberName.textContent = 'Nuevo Integrante Familiar';
    modalBranchTag.textContent = br.name;
    modalBranchTag.style.backgroundColor = br.color;

    // Hide delete & quick relation actions when adding a new member
    if (deleteMemberBtn) deleteMemberBtn.style.display = 'none';
    if (modalQuickActions) modalQuickActions.style.display = 'none';

    document.getElementById('formMemberId').value = '';
    document.getElementById('formName').value = preset.name || '';
    document.getElementById('formFullName').value = preset.fullName || '';
    document.getElementById('formBranch').value = branchId;
    document.getElementById('formGeneration').value = preset.generation || 4;
    document.getElementById('formRole').value = preset.role || 'Nuevo integrante';
    document.getElementById('formBadge').value = preset.badge || '';
    document.getElementById('formGender').value = preset.gender || 'M';
    document.getElementById('formNotes').value = preset.notes || '';

    populateSpouseAndParentSelects({
      id: null,
      spouseId: preset.spouseId || null,
      parentId: preset.parentId || null
    });

    if (preset.parentId) {
      document.getElementById('formParent').value = preset.parentId;
    }
    if (preset.spouseId) {
      document.getElementById('formSpouse').value = preset.spouseId;
    }

    renderModalPhotoPreview(null, 'Nuevo');
    memberModal.classList.add('active');
  }

  function closeModal() {
    memberModal.classList.remove('active');
    activeMemberId = null;
    currentModalPhoto = null;
  }

  // --- EXPORT & IMPORT MODULES ---
  function exportBackupJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(familyData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `familia_reyna_aliaga_respaldo_${new Date().toISOString().slice(0,10)}.json`);
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
    const headers = ['ID', 'Nombre', 'Nombre Completo', 'Rama Familiar', 'Generacion', 'Rol', 'Distincion', 'Tiene Foto', 'Conyuge', 'Progenitor', 'Notas'];
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
        `"${m.spouseId || ''}"`,
        `"${m.parentId || ''}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `familia_reyna_aliaga_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast('📊 Archivo Excel CSV descargado.');
  }

  function exportGedcomFile() {
    let ged = [
      '0 HEAD',
      '1 SOUR FamiliaReynaAliaga',
      '1 GEDC',
      '2 VERS 5.5',
      '2 FORM LINEAGE-LINKED',
      '1 CHAR UTF-8'
    ];

    familyData.members.forEach(m => {
      ged.push(`0 @${m.id}@ INDI`);
      ged.push(`1 NAME ${m.name} /Reyna Aliaga/`);
      if (m.gender) ged.push(`1 SEX ${m.gender}`);
      if (m.notes) ged.push(`1 NOTE ${m.notes}`);
    });

    ged.push('0 TRLR');

    const gedStr = ged.join('\r\n');
    const blob = new Blob([gedStr], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'familia_reyna_aliaga.ged';
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
  window.addEventListener('DOMContentLoaded', init);

})();
