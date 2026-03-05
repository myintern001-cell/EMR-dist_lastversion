'use strict';

import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtSize(b) {
  b = parseInt(b) || 0;
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

export class PdfViewer {
  constructor(opts) {
    this.viewerBody = opts.viewerBody;
    this.pageInput = opts.pageInput;
    this.totalPagesEl = opts.totalPagesEl;
    this.zoomSelect = opts.zoomSelect;

    this.btnPrev = opts.btnPrev;
    this.btnNext = opts.btnNext;
    this.btnZoomIn = opts.btnZoomIn;
    this.btnZoomOut = opts.btnZoomOut;
    this.btnSidebarToggle = opts.btnSidebarToggle;
    this.btnSidebarPages = opts.btnSidebarPages || null;
    this.btnSidebarFiles = opts.btnSidebarFiles || null;

    this.allowFit = !!opts.allowFit;
    this.defaultScale = String(opts.defaultScale ?? '1.25');
    this.maxCachedDocs = Number.isFinite(opts.maxCachedDocs)
      ? Math.max(1, parseInt(opts.maxCachedDocs, 10))
      : 3;
    this.renderWindow = Number.isFinite(opts.renderWindow)
      ? Math.max(4, parseInt(opts.renderWindow, 10))
      : 10;

    this.onPageChange = typeof opts.onPageChange === 'function'
      ? opts.onPageChange
      : null;
    this.onFileDownload = typeof opts.onFileDownload === 'function'
      ? opts.onFileDownload
      : null;

    this.mode = 'single';
    this.sidebarMode = 'pages';

    this.sequenceDocs = [];
    this.globalPageMap = [];

    this.currentPage = 1;
    this.totalPages = 0;
    this.currentScale = this.defaultScale;
    this.sidebarOpen = true;

    this.vSidebarEl = null;
    this.vPagesPanel = null;
    this.vFilesPanel = null;
    this.vCanvasArea = null;
    this.pageWrappers = [];

    this.thumbItems = new Map();
    this.fileItems = new Map();
    this._activeThumbPage = 0;

    this._renderedPages = new Set();
    this._renderingPages = new Set();
    this._renderedThumbs = new Set();
    this._renderingThumbs = new Set();

    this.docCache = new Map();
    this.docLoadPromises = new Map();
    this._docUseTick = 0;

    this.observer = null;

    this._bindToolbar();
  }

  _bindToolbar() {
    this.btnPrev?.addEventListener('click', () => {
      if (this.currentPage > 1) this.scrollToPage(this.currentPage - 1);
    });
    this.btnNext?.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) this.scrollToPage(this.currentPage + 1);
    });

    this.pageInput?.addEventListener('change', () => {
      const pg = Math.max(1, Math.min(this.totalPages, parseInt(this.pageInput.value) || 1));
      this.pageInput.value = pg;
      this.scrollToPage(pg);
    });
    this.pageInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.pageInput.dispatchEvent(new Event('change'));
    });

    this.zoomSelect?.addEventListener('change', async () => {
      this.currentScale = this.zoomSelect.value;
      await this.reRender();
    });

    this.btnZoomIn?.addEventListener('click', () => this.stepZoom(1));
    this.btnZoomOut?.addEventListener('click', () => this.stepZoom(-1));

    this.btnSidebarToggle?.addEventListener('click', () => {
      this.sidebarOpen = !this.sidebarOpen;
      if (this.vSidebarEl) this.vSidebarEl.style.display = this.sidebarOpen ? '' : 'none';
      if (this.btnSidebarToggle) this.btnSidebarToggle.style.color = this.sidebarOpen ? '' : 'var(--primary)';
    });

    this.btnSidebarPages?.addEventListener('click', () => this._setSidebarMode('pages'));
    this.btnSidebarFiles?.addEventListener('click', () => this._setSidebarMode('files'));
  }

  async load(url) {
    return this.loadSequence([
      {
        id: 'single',
        original_name: 'PDF Document',
        file_size: 0,
        url,
        download_url: url,
      },
    ]);
  }

  async loadSequence(docs = []) {
    const normalized = (docs || [])
      .map((doc, idx) => {
        const url = doc?.url || doc?.pdf_url || '';
        if (!url) return null;

        return {
          idx,
          id: doc?.id ?? idx,
          original_name: doc?.original_name || doc?.name || `Document ${idx + 1}`,
          file_size: parseInt(doc?.file_size || 0, 10) || 0,
          url,
          download_url: doc?.download_url || url,
          numPages: 0,
          status: 'idle',
          estimateWidth: 780,
          estimateHeight: 1040,
          globalStart: 0,
          globalEnd: 0,
          raw: doc,
        };
      })
      .filter(Boolean);

    if (!normalized.length) {
      throw new Error('ไม่พบเอกสารสำหรับแสดงผล');
    }

    await this._resetState();

    this.mode = normalized.length > 1 ? 'sequence' : 'single';
    this.sequenceDocs = normalized;
    this.globalPageMap = [];
    this.currentPage = 1;
    this.totalPages = 0;
    this._activeThumbPage = 0;

    this._renderLoadingShell('กำลังเตรียมเอกสาร...');
    this._updateSidebarModeButtons();
    await this._prepareSequenceMetadata();

    this.totalPages = this.globalPageMap.length;
    if (!this.totalPages) {
      throw new Error('ไม่พบหน้าที่สามารถแสดงผลได้');
    }

    if (this.totalPagesEl) this.totalPagesEl.textContent = this.totalPages;
    if (this.pageInput) {
      this.pageInput.max = this.totalPages;
      this.pageInput.value = 1;
    }

    this.vCanvasArea.innerHTML = '';
    await this._buildPlaceholders();
    this._setupLazyObserver();
    this._buildSidebar();
    this._setCurrentPage(1, true);
    this._lazyRenderPage(1);
    this._preloadNeighbors(1);
  }

  async _resetState() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.pageWrappers = [];
    this.thumbItems.clear();
    this.fileItems.clear();
    this._renderedPages.clear();
    this._renderingPages.clear();
    this._renderedThumbs.clear();
    this._renderingThumbs.clear();
    this.docLoadPromises.clear();

    const disposeJobs = [];
    for (const cached of this.docCache.values()) {
      const pdf = cached?.pdf;
      if (!pdf) continue;
      try {
        pdf.cleanup?.();
      } catch {
        // noop
      }
      if (typeof pdf.destroy === 'function') {
        disposeJobs.push(pdf.destroy().catch(() => {}));
      }
    }
    this.docCache.clear();

    if (disposeJobs.length) {
      await Promise.allSettled(disposeJobs);
    }
  }

  _renderLoadingShell(message) {
    this.viewerBody.innerHTML = `
      <div class="viewer-sidebar" id="vSidebar"></div>
      <div class="viewer-canvas-area" id="vCanvasArea">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--text-muted)">
          <div class="spin-ring" style="border-top-color:var(--primary);border-color:#e0e0e0;width:36px;height:36px;border-width:3px"></div>
          <p id="viewerLoadingText" style="margin:0;font-size:14px">${esc(message || 'กำลังโหลด PDF...')}</p>
        </div>
      </div>`;

    this.vSidebarEl = this.viewerBody.querySelector('#vSidebar');
    this.vCanvasArea = this.viewerBody.querySelector('#vCanvasArea');

    if (this.vSidebarEl) {
      this.vSidebarEl.style.display = this.sidebarOpen ? '' : 'none';
    }
  }

  _updateLoadingText(message) {
    const el = this.viewerBody?.querySelector('#viewerLoadingText');
    if (el) el.textContent = message;
  }

  async _prepareSequenceMetadata() {
    for (let i = 0; i < this.sequenceDocs.length; i++) {
      this._updateLoadingText(`กำลังเตรียมไฟล์ ${i + 1}/${this.sequenceDocs.length}...`);
      try {
        await this._ensureDocLoaded(i);
      } catch {
        this.sequenceDocs[i].status = 'error';
      }
      this._evictDocCache(i);
    }

    this._buildGlobalPageMap();
  }

  _buildGlobalPageMap() {
    this.globalPageMap = [];
    let cursor = 1;

    this.sequenceDocs.forEach((doc, docIndex) => {
      const pages = parseInt(doc.numPages, 10) || 0;
      if (pages <= 0) {
        doc.globalStart = 0;
        doc.globalEnd = 0;
        return;
      }

      doc.globalStart = cursor;
      for (let p = 1; p <= pages; p++) {
        this.globalPageMap.push({ docIndex, pageInDoc: p });
        cursor += 1;
      }
      doc.globalEnd = cursor - 1;
    });
  }

  async _ensureDocLoaded(docIndex) {
    const cached = this.docCache.get(docIndex);
    if (cached?.pdf) {
      cached.lastUsed = ++this._docUseTick;
      return cached.pdf;
    }

    const pending = this.docLoadPromises.get(docIndex);
    if (pending) {
      return pending;
    }

    const doc = this.sequenceDocs[docIndex];
    if (!doc) {
      throw new Error('Document not found');
    }

    const loadPromise = (async () => {
      doc.status = 'loading';
      this._refreshFileList();

      const pdf = await pdfjsLib.getDocument({ url: doc.url }).promise;
      this.docCache.set(docIndex, {
        pdf,
        lastUsed: ++this._docUseTick,
      });

      doc.numPages = pdf.numPages || 0;
      if (doc.numPages > 0) {
        const firstPage = await pdf.getPage(1);
        const scale = await this._calcScaleForPage(firstPage);
        const vp = firstPage.getViewport({ scale });
        doc.estimateWidth = Math.max(280, vp.width);
        doc.estimateHeight = Math.max(320, vp.height);
      }

      doc.status = 'ready';
      this._refreshFileList();
      return pdf;
    })();

    this.docLoadPromises.set(docIndex, loadPromise);
    try {
      return await loadPromise;
    } catch (e) {
      doc.status = 'error';
      this._refreshFileList();
      throw e;
    } finally {
      this.docLoadPromises.delete(docIndex);
    }
  }

  _evictDocCache(anchorDocIndex = -1) {
    if (this.docCache.size <= this.maxCachedDocs) {
      return;
    }

    const currentDocIndex = this.getCurrentInfo()?.docIndex ?? -1;
    const protectedIdx = new Set([currentDocIndex, anchorDocIndex]);
    if (currentDocIndex >= 0) {
      protectedIdx.add(currentDocIndex - 1);
      protectedIdx.add(currentDocIndex + 1);
    }
    if (anchorDocIndex >= 0) {
      protectedIdx.add(anchorDocIndex - 1);
      protectedIdx.add(anchorDocIndex + 1);
    }

    while (this.docCache.size > this.maxCachedDocs) {
      let candidate = null;
      let oldestTick = Number.POSITIVE_INFINITY;

      this.docCache.forEach((value, key) => {
        if (protectedIdx.has(key)) return;
        if (value.lastUsed < oldestTick) {
          oldestTick = value.lastUsed;
          candidate = key;
        }
      });

      if (candidate === null) {
        this.docCache.forEach((value, key) => {
          if (value.lastUsed < oldestTick) {
            oldestTick = value.lastUsed;
            candidate = key;
          }
        });
      }

      if (candidate === null) break;
      const item = this.docCache.get(candidate);
      this.docCache.delete(candidate);
      if (item?.pdf) {
        try {
          item.pdf.cleanup?.();
        } catch {
          // noop
        }
        if (typeof item.pdf.destroy === 'function') {
          item.pdf.destroy().catch(() => {});
        }
      }
    }
  }

  _getInfoByGlobalPage(num) {
    const pg = Math.max(1, Math.min(this.totalPages, parseInt(num, 10) || 1));
    const map = this.globalPageMap[pg - 1];
    if (!map) return null;
    const doc = this.sequenceDocs[map.docIndex];
    if (!doc) return null;

    return {
      globalPage: pg,
      totalPages: this.totalPages,
      docIndex: map.docIndex,
      fileIndex: map.docIndex + 1,
      fileCount: this.sequenceDocs.length,
      pageInFile: map.pageInDoc,
      filePages: doc.numPages || 0,
      fileName: doc.original_name,
      fileSize: doc.file_size || 0,
      doc,
      rawDoc: doc.raw,
    };
  }

  getCurrentInfo() {
    return this._getInfoByGlobalPage(this.currentPage);
  }

  scrollToFile(docIndex) {
    const idx = Math.max(0, parseInt(docIndex, 10) || 0);
    const doc = this.sequenceDocs[idx];
    if (!doc || !doc.globalStart) return;
    this.scrollToPage(doc.globalStart);
  }

  downloadCurrentFile() {
    const info = this.getCurrentInfo();
    if (!info) return;
    this._triggerFileDownload(info.doc);
  }

  _triggerFileDownload(doc) {
    if (!doc || !this.onFileDownload) return;
    this.onFileDownload(doc.raw || doc, doc);
  }

  async _buildPlaceholders() {
    for (let i = 1; i <= this.totalPages; i++) {
      const info = this._getInfoByGlobalPage(i);
      const doc = info?.doc;

      const wrap = document.createElement('div');
      wrap.className = 'page-wrapper page-placeholder';
      wrap.dataset.page = i;
      wrap.dataset.docIndex = String(info?.docIndex ?? -1);
      wrap.dataset.pageInDoc = String(info?.pageInFile ?? 0);
      wrap.style.width = `${Math.max(280, doc?.estimateWidth || 780)}px`;
      wrap.style.minHeight = `${Math.max(320, doc?.estimateHeight || 1040)}px`;

      const canvas = document.createElement('canvas');
      canvas.className = 'page-canvas';
      canvas.dataset.page = i;
      canvas.style.display = 'none';

      const loader = document.createElement('div');
      loader.className = 'page-lazy-loader';
      loader.innerHTML = '<div class="spin-ring" style="border-top-color:var(--primary);border-color:#e0e0e0;width:24px;height:24px;border-width:2px"></div>';

      const lbl = document.createElement('div');
      lbl.className = 'page-num-label';
      lbl.textContent = `ไฟล์ ${info?.fileIndex ?? '—'} · หน้า ${info?.pageInFile ?? '—'}`;

      wrap.appendChild(loader);
      wrap.appendChild(canvas);
      wrap.appendChild(lbl);
      this.vCanvasArea.appendChild(wrap);
      this.pageWrappers.push(wrap);
    }
  }

  async _lazyRenderPage(num) {
    const pg = Math.max(1, Math.min(this.totalPages, parseInt(num, 10) || 1));
    if (this._renderedPages.has(pg) || this._renderingPages.has(pg)) return;

    const info = this._getInfoByGlobalPage(pg);
    if (!info) return;

    const wrap = this.pageWrappers[pg - 1];
    if (!wrap) return;

    this._renderingPages.add(pg);

    try {
      const pdf = await this._ensureDocLoaded(info.docIndex);
      const page = await pdf.getPage(info.pageInFile);
      const scale = await this._calcScaleForPage(page);
      const vp = page.getViewport({ scale });

      const canvas = wrap.querySelector('.page-canvas');
      const loader = wrap.querySelector('.page-lazy-loader');
      if (!canvas) return;

      canvas.width = vp.width;
      canvas.height = vp.height;
      wrap.style.width = `${vp.width}px`;
      wrap.style.minHeight = '';

      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      canvas.style.display = '';
      if (loader) loader.style.display = 'none';
      wrap.classList.remove('page-placeholder');

      this._renderedPages.add(pg);
      this._preloadNeighbors(pg);
    } catch {
      const loader = wrap.querySelector('.page-lazy-loader');
      if (loader) {
        loader.innerHTML = '<div style="font-size:12px;color:var(--danger)">โหลดหน้าไม่สำเร็จ</div>';
      }
    } finally {
      this._renderingPages.delete(pg);
      this._evictDocCache(info.docIndex);
    }
  }

  _preloadNeighbors(num) {
    const neighbors = [num - 2, num - 1, num + 1, num + 2];
    neighbors.forEach(n => {
      if (n >= 1 && n <= this.totalPages) this._lazyRenderPage(n);
    });
    this._lazyRenderThumbsAround(num);
  }

  _setupLazyObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver(
      entries => {
        const visible = [];

        entries.forEach(entry => {
          const pg = parseInt(entry.target.dataset.page, 10);
          if (!Number.isFinite(pg)) return;
          if (entry.isIntersecting) {
            this._lazyRenderPage(pg);
            visible.push(entry);
          }
        });

        if (visible.length) {
          visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const top = visible[0];
          const pg = parseInt(top.target.dataset.page, 10);
          if (Number.isFinite(pg)) this._setCurrentPage(pg);
        }
      },
      { root: this.vCanvasArea, threshold: 0.15, rootMargin: '240px 0px' }
    );

    this.pageWrappers.forEach(w => this.observer.observe(w));
  }

  _buildSidebar() {
    if (!this.vSidebarEl) return;

    this.vSidebarEl.innerHTML = `
      <div class="viewer-pages-panel" id="vPagesPanel"></div>
      <div class="viewer-files-panel" id="vFilesPanel"></div>`;

    this.vPagesPanel = this.vSidebarEl.querySelector('#vPagesPanel');
    this.vFilesPanel = this.vSidebarEl.querySelector('#vFilesPanel');

    this.thumbItems.clear();
    this.fileItems.clear();
    this._renderedThumbs.clear();
    this._renderingThumbs.clear();
    this._activeThumbPage = 0;

    this._buildPageThumbItems();
    this._buildFileItems();
    this._setSidebarMode(this.sidebarMode, true);
    this._refreshFileList();
  }

  _buildPageThumbItems() {
    if (!this.vPagesPanel) return;

    for (let i = 1; i <= this.totalPages; i++) {
      const info = this._getInfoByGlobalPage(i);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'thumb-item';
      item.dataset.page = String(i);

      const canvas = document.createElement('canvas');
      canvas.className = 'thumb-canvas';
      canvas.dataset.page = String(i);

      const lbl = document.createElement('div');
      lbl.className = 'thumb-num';
      lbl.textContent = `${info?.pageInFile ?? i}`;

      const fl = document.createElement('div');
      fl.className = 'thumb-file-num';
      fl.textContent = `F${info?.fileIndex ?? '—'}`;

      item.appendChild(canvas);
      item.appendChild(lbl);
      item.appendChild(fl);
      item.addEventListener('click', () => this.scrollToPage(i));

      this.vPagesPanel.appendChild(item);
      this.thumbItems.set(i, item);
    }
  }

  _buildFileItems() {
    if (!this.vFilesPanel) return;
    this.vFilesPanel.innerHTML = '';

    this.sequenceDocs.forEach((doc, idx) => {
      const item = document.createElement('div');
      item.className = 'viewer-file-item';
      item.dataset.docIndex = String(idx);

      item.innerHTML = `
        <div class="viewer-file-main">
          <div class="viewer-file-name" title="${esc(doc.original_name)}">${esc(doc.original_name)}</div>
          <div class="viewer-file-meta">
            <span class="viewer-file-pages">— หน้า</span>
            <span class="viewer-file-status status-idle">กำลังรอ</span>
          </div>
        </div>
        <div class="viewer-file-actions">
          ${this.onFileDownload ? '<button class="viewer-file-btn" data-action="download" title="ดาวน์โหลดไฟล์นี้"><i class="bi bi-download"></i></button>' : ''}
        </div>`;

      item.addEventListener('click', e => {
        const t = e.target;
        if (t?.closest('[data-action="download"]')) return;
        this.scrollToFile(idx);
      });

      const dlBtn = item.querySelector('[data-action="download"]');
      dlBtn?.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        this._triggerFileDownload(doc);
      });

      this.vFilesPanel.appendChild(item);
      this.fileItems.set(idx, item);
    });
  }

  _refreshFileList() {
    if (!this.fileItems.size) return;

    this.sequenceDocs.forEach((doc, idx) => {
      const item = this.fileItems.get(idx);
      if (!item) return;

      const pagesEl = item.querySelector('.viewer-file-pages');
      const statusEl = item.querySelector('.viewer-file-status');

      if (pagesEl) {
        const pagesTxt = doc.numPages > 0 ? `${doc.numPages} หน้า` : '— หน้า';
        const rangeTxt = doc.globalStart ? ` · #${doc.globalStart}-${doc.globalEnd}` : '';
        pagesEl.textContent = pagesTxt + rangeTxt;
      }

      if (statusEl) {
        statusEl.className = 'viewer-file-status';
        if (doc.status === 'ready') {
          statusEl.classList.add('status-ready');
          statusEl.textContent = 'พร้อมดู';
        } else if (doc.status === 'loading') {
          statusEl.classList.add('status-loading');
          statusEl.textContent = 'กำลังโหลด';
        } else if (doc.status === 'error') {
          statusEl.classList.add('status-error');
          statusEl.textContent = 'โหลดไม่สำเร็จ';
        } else {
          statusEl.classList.add('status-idle');
          statusEl.textContent = 'กำลังรอ';
        }
      }
    });
  }

  _setSidebarMode(mode, force = false) {
    const next = mode === 'files' ? 'files' : 'pages';
    if (!force && this.sidebarMode === next) return;

    this.sidebarMode = next;

    if (this.vSidebarEl) {
      this.vSidebarEl.classList.toggle('sidebar-files-mode', next === 'files');
      this.vSidebarEl.classList.toggle('sidebar-pages-mode', next !== 'files');
    }

    if (this.vPagesPanel) this.vPagesPanel.style.display = next === 'pages' ? '' : 'none';
    if (this.vFilesPanel) this.vFilesPanel.style.display = next === 'files' ? '' : 'none';

    this._updateSidebarModeButtons();
  }

  _updateSidebarModeButtons() {
    if (this.btnSidebarPages) this.btnSidebarPages.classList.toggle('active', this.sidebarMode === 'pages');
    if (this.btnSidebarFiles) this.btnSidebarFiles.classList.toggle('active', this.sidebarMode === 'files');
  }

  async _renderThumb(globalPage) {
    if (this._renderedThumbs.has(globalPage) || this._renderingThumbs.has(globalPage)) return;

    const item = this.thumbItems.get(globalPage);
    if (!item) return;

    const info = this._getInfoByGlobalPage(globalPage);
    if (!info) return;

    this._renderingThumbs.add(globalPage);
    try {
      const pdf = await this._ensureDocLoaded(info.docIndex);
      const page = await pdf.getPage(info.pageInFile);
      const vp0 = page.getViewport({ scale: 1 });
      const targetWidth = Math.max(36, (item.clientWidth || this.vSidebarEl?.clientWidth || 120) - 20);
      const scale = targetWidth / vp0.width;
      const vp = page.getViewport({ scale });

      const canvas = item.querySelector('.thumb-canvas');
      if (!canvas) return;

      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      this._renderedThumbs.add(globalPage);
    } catch {
      // noop
    } finally {
      this._renderingThumbs.delete(globalPage);
      this._evictDocCache(info.docIndex);
    }
  }

  _lazyRenderThumbsAround(globalPage) {
    const start = Math.max(1, globalPage - this.renderWindow);
    const end = Math.min(this.totalPages, globalPage + this.renderWindow);
    for (let i = start; i <= end; i++) {
      this._renderThumb(i);
    }
  }

  _setCurrentPage(num, force = false) {
    const pg = Math.max(1, Math.min(this.totalPages, parseInt(num, 10) || 1));
    if (!force && pg === this.currentPage) return;

    this.currentPage = pg;

    if (this.pageInput) this.pageInput.value = pg;
    this._highlightThumb(pg);

    const info = this._getInfoByGlobalPage(pg);
    if (info) {
      this._highlightFile(info.docIndex);
      this._lazyRenderThumbsAround(pg);
      this.onPageChange?.(info);
    }
  }

  _highlightThumb(page) {
    const prev = this.thumbItems.get(this._activeThumbPage);
    if (prev) prev.classList.remove('active');

    const next = this.thumbItems.get(page);
    if (next) {
      next.classList.add('active');
      next.scrollIntoView({ block: 'nearest' });
    }

    this._activeThumbPage = page;
  }

  _highlightFile(docIndex) {
    this.fileItems.forEach((el, idx) => {
      el.classList.toggle('active', idx === docIndex);
      if (idx === docIndex) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  async _calcScale(page) {
    return this._calcScaleForPage(page);
  }

  async _calcScaleForPage(page) {
    if (this.allowFit && this.currentScale === 'fit') {
      const vp = page.getViewport({ scale: 1 });
      return ((this.vCanvasArea?.clientWidth || 700) - 48) / vp.width;
    }

    const scale = parseFloat(this.currentScale);
    if (!Number.isFinite(scale) || scale <= 0) {
      return parseFloat(this.defaultScale) || 1.25;
    }
    return scale;
  }

  scrollToPage(num) {
    const pg = Math.max(1, Math.min(this.totalPages, parseInt(num, 10) || 1));
    const w = this.pageWrappers[pg - 1];
    if (w && this.vCanvasArea) {
      this.vCanvasArea.scrollTo({ top: w.offsetTop - 16, behavior: 'smooth' });
    }
  }

  async reRender() {
    if (!this.totalPages) return;
    if (!this.vCanvasArea) return;

    const savedPage = this.currentPage;
    if (this.observer) this.observer.disconnect();

    this.vCanvasArea.innerHTML = '';
    this.pageWrappers = [];
    this._renderedPages.clear();
    this._renderingPages.clear();

    await this._buildPlaceholders();
    this._setupLazyObserver();
    this._buildSidebar();
    this._setCurrentPage(savedPage, true);
    this.scrollToPage(savedPage);
    this._lazyRenderPage(savedPage);
    this._preloadNeighbors(savedPage);
  }

  stepZoom(dir) {
    const levels = this.allowFit
      ? ['fit', '0.5', '0.75', '1', '1.25', '1.5', '2']
      : ['0.5', '0.75', '1', '1.25', '1.5', '2'];

    let i = levels.indexOf(this.currentScale);
    if (i < 0) i = levels.indexOf(this.defaultScale);
    if (i < 0) i = 0;

    const next = levels[Math.max(0, Math.min(levels.length - 1, i + dir))];
    this.currentScale = next;

    if (this.zoomSelect) this.zoomSelect.value = this.currentScale;
    this.reRender();
  }
}
