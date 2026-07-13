(() => {
  const STORAGE_KEY = 'favoriteActivities.v1';

  const state = {
    activities: [],
    selectedIds: [],
    search: '',
    category: 'all',
  };

  const el = {
    activityList: document.getElementById('activity-list'),
    searchInput: document.getElementById('search-input'),
    categoryFilter: document.getElementById('category-filter'),
    selectedCount: document.getElementById('selected-count'),
    rankList: document.getElementById('rank-list'),
    rankEmpty: document.getElementById('rank-empty'),
    sharePreview: document.getElementById('share-preview'),
    shareBtn: document.getElementById('share-btn'),
    downloadBtn: document.getElementById('download-btn'),
    shareFallbackMsg: document.getElementById('share-fallback-msg'),
    resetBtn: document.getElementById('reset-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    toast: document.getElementById('toast'),
    stepBtns: Array.from(document.querySelectorAll('.step-btn')),
    stepPanels: Array.from(document.querySelectorAll('.step-panel')),
  };

  function loadSelection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveSelection() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.selectedIds));
  }

  function activityById(id) {
    return state.activities.find((a) => a.id === id);
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove('visible'), 1800);
  }

  function switchStep(step) {
    el.stepBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.step === step));
    el.stepPanels.forEach((panel) => panel.classList.toggle('active', panel.id === `step-${step}`));
    if (step === 'rank') renderRankList();
    if (step === 'share') renderSharePreview();
  }

  function populateCategoryFilter() {
    const categories = Array.from(new Set(state.activities.map((a) => a.category))).sort();
    el.categoryFilter.innerHTML = '<option value="all">All categories</option>' +
      categories.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  function renderActivityList() {
    const search = state.search.trim().toLowerCase();
    const filtered = state.activities.filter((a) => {
      const matchesSearch = !search || a.name.toLowerCase().includes(search);
      const matchesCategory = state.category === 'all' || a.category === state.category;
      return matchesSearch && matchesCategory;
    });

    if (!filtered.length) {
      el.activityList.innerHTML = '<p class="empty-state" style="display:block">No activities match your search.</p>';
    } else {
      el.activityList.innerHTML = filtered.map((a) => {
        const checked = state.selectedIds.includes(a.id);
        return `
          <label class="activity-card ${checked ? 'selected' : ''}" data-id="${a.id}">
            <input type="checkbox" ${checked ? 'checked' : ''} data-id="${a.id}" />
            <span class="card-body">
              <span class="activity-name">${escapeHtml(a.name)}</span>
              <span class="activity-meta">${escapeHtml(a.category)}${a.cost ? ' · ' + escapeHtml(a.cost) : ''}</span>
            </span>
          </label>
        `;
      }).join('');
    }
    el.selectedCount.textContent = state.selectedIds.length;
  }

  function toggleSelection(id) {
    const idx = state.selectedIds.indexOf(id);
    if (idx === -1) state.selectedIds.push(id);
    else state.selectedIds.splice(idx, 1);
    saveSelection();
    renderActivityList();
  }

  function renderRankList() {
    const hasSelection = state.selectedIds.length > 0;
    el.rankEmpty.style.display = hasSelection ? 'none' : 'block';
    el.rankList.style.display = hasSelection ? 'flex' : 'none';

    el.rankList.innerHTML = state.selectedIds.map((id, i) => {
      const a = activityById(id);
      if (!a) return '';
      return `
        <li class="rank-item" draggable="true" data-id="${a.id}">
          <span class="drag-handle" aria-hidden="true">&#9776;</span>
          <span class="rank-number">${i + 1}</span>
          <span class="card-body">
            <span class="activity-name">${escapeHtml(a.name)}</span>
            <span class="activity-meta">${escapeHtml(a.category)}</span>
          </span>
          <span class="rank-controls">
            <button type="button" class="move-up" data-id="${a.id}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button>
            <button type="button" class="move-down" data-id="${a.id}" ${i === state.selectedIds.length - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>
          </span>
        </li>
      `;
    }).join('');
  }

  function moveRank(id, direction) {
    const idx = state.selectedIds.indexOf(id);
    const swapWith = idx + direction;
    if (idx === -1 || swapWith < 0 || swapWith >= state.selectedIds.length) return;
    [state.selectedIds[idx], state.selectedIds[swapWith]] = [state.selectedIds[swapWith], state.selectedIds[idx]];
    saveSelection();
    renderRankList();
  }

  let dragId = null;
  function handleDragStart(e) {
    const item = e.target.closest('.rank-item');
    if (!item) return;
    dragId = item.dataset.id;
    item.classList.add('dragging');
  }
  function handleDragEnd(e) {
    const item = e.target.closest('.rank-item');
    if (item) item.classList.remove('dragging');
    dragId = null;
  }
  function handleDragOver(e) {
    e.preventDefault();
    const target = e.target.closest('.rank-item');
    if (!target || !dragId || target.dataset.id === dragId) return;
    const targetIdx = state.selectedIds.indexOf(target.dataset.id);
    const dragIdx = state.selectedIds.indexOf(dragId);
    if (targetIdx === -1 || dragIdx === -1) return;
    state.selectedIds.splice(dragIdx, 1);
    state.selectedIds.splice(targetIdx, 0, dragId);
    saveSelection();
    renderRankList();
  }

  function buildShareText() {
    const lines = ['My Favorite UK & Ireland Activities', ''];
    state.selectedIds.forEach((id, i) => {
      const a = activityById(id);
      if (!a) return;
      lines.push(`${i + 1}. ${a.name} (${a.category})${a.cost ? ' - ' + a.cost : ''}`);
    });
    if (state.selectedIds.length === 0) lines.push('(no activities picked yet)');
    return lines.join('\n');
  }

  function renderSharePreview() {
    el.sharePreview.textContent = buildShareText();
    const canShare = typeof navigator.share === 'function';
    el.shareBtn.hidden = !canShare;
    el.shareFallbackMsg.hidden = canShare;
  }

  async function handleShare() {
    const text = buildShareText();
    if (navigator.share) {
      try {
        if (navigator.canShare && window.File) {
          const file = new File([text], 'my-favorite-activities.txt', { type: 'text/plain' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'My Favorite Activities' });
            return;
          }
        }
        await navigator.share({ title: 'My Favorite Activities', text });
      } catch (err) {
        if (err.name !== 'AbortError') showToast('Share failed. Try downloading instead.');
      }
    }
  }

  function handleDownload() {
    const text = buildShareText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-favorite-activities.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded my-favorite-activities.txt');
  }

  function handleReset() {
    if (!confirm('Reset all your picks and rankings?')) return;
    state.selectedIds = [];
    saveSelection();
    renderActivityList();
    renderRankList();
    renderSharePreview();
    showToast('Your picks have been reset.');
  }

  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    if (isDark) {
      delete document.documentElement.dataset.theme;
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.dataset.theme = 'dark';
      localStorage.setItem('theme', 'dark');
    }
  }

  function attachEvents() {
    el.themeToggle.addEventListener('click', toggleTheme);
    el.stepBtns.forEach((btn) => btn.addEventListener('click', () => switchStep(btn.dataset.step)));

    el.activityList.addEventListener('change', (e) => {
      if (e.target.matches('input[type="checkbox"]')) toggleSelection(e.target.dataset.id);
    });

    el.searchInput.addEventListener('input', (e) => {
      state.search = e.target.value;
      renderActivityList();
    });

    el.categoryFilter.addEventListener('change', (e) => {
      state.category = e.target.value;
      renderActivityList();
    });

    el.rankList.addEventListener('click', (e) => {
      const upBtn = e.target.closest('.move-up');
      const downBtn = e.target.closest('.move-down');
      if (upBtn) moveRank(upBtn.dataset.id, -1);
      if (downBtn) moveRank(downBtn.dataset.id, 1);
    });

    el.rankList.addEventListener('dragstart', handleDragStart);
    el.rankList.addEventListener('dragend', handleDragEnd);
    el.rankList.addEventListener('dragover', handleDragOver);

    el.shareBtn.addEventListener('click', handleShare);
    el.downloadBtn.addEventListener('click', handleDownload);
    el.resetBtn.addEventListener('click', handleReset);
  }

  async function init() {
    attachEvents();
    try {
      const res = await fetch('activities.json');
      state.activities = await res.json();
    } catch (err) {
      el.activityList.innerHTML = '<p class="empty-state" style="display:block">Could not load activities.json. If you opened this file directly, try serving it via a local web server.</p>';
      return;
    }
    state.selectedIds = loadSelection().filter((id) => state.activities.some((a) => a.id === id));
    populateCategoryFilter();
    renderActivityList();
    renderRankList();
    renderSharePreview();
  }

  init();
})();
