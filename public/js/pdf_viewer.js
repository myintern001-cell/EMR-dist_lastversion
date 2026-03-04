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

    this.allowFit = !!opts.allowFit;
    this.defaultScale = String(opts.defaultScale ?? '1.25');

    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.currentScale = this.defaultScale;
    this.sidebarOpen = true;

    this.vSidebarEl = null;
    this.vCanvasArea = null;
    this.pageWrappers = [];
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
  }

  async load(url) {
    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.pageWrappers = [];
    this._renderedPages = new Set();
    this._renderingPages = new Set();

    this.viewerBody.innerHTML = `
      <div class="viewer-sidebar" id="vSidebar"></div>
      <div class="viewer-canvas-area" id="vCanvasArea">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--text-muted)">
          <div class="spin-ring" style="border-top-color:var(--primary);border-color:#e0e0e0;width:36px;height:36px;border-width:3px"></div>
          <p style="margin:0;font-size:14px">กำลังโหลด PDF...</p>
        </div>
      </div>`;

    this.vSidebarEl = this.viewerBody.querySelector('#vSidebar');
    this.vCanvasArea = this.viewerBody.querySelector('#vCanvasArea');

    const pdf = await pdfjsLib.getDocument({ url }).promise;
    this.pdfDoc = pdf;
    this.totalPages = pdf.numPages;

    if (this.totalPagesEl) this.totalPagesEl.textContent = this.totalPages;
    if (this.pageInput) {
      this.pageInput.max = this.totalPages;
      this.pageInput.value = 1;
    }

    this.currentPage = 1;
    this.vCanvasArea.innerHTML = '';

    await this._buildPlaceholders();
    this._setupLazyObserver();
    this._buildThumbs();
  }

  async _getPageDimensions(num) {
    const page = await this.pdfDoc.getPage(num);
    const scale = await this._calcScaleForPage(page);
    const vp = page.getViewport({ scale });
    return { width: vp.width, height: vp.height, page, scale, vp };
  }

  async _buildPlaceholders() {
    const firstDims = await this._getPageDimensions(1);
    const estW = firstDims.width;
    const estH = firstDims.height;

    for (let i = 1; i <= this.totalPages; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'page-wrapper page-placeholder';
      wrap.dataset.page = i;
      wrap.style.width = estW + 'px';
      wrap.style.minHeight = estH + 'px';

      const canvas = document.createElement('canvas');
      canvas.className = 'page-canvas';
      canvas.dataset.page = i;
      canvas.style.display = 'none';

      const loader = document.createElement('div');
      loader.className = 'page-lazy-loader';
      loader.innerHTML = `<div class="spin-ring" style="border-top-color:var(--primary);border-color:#e0e0e0;width:24px;height:24px;border-width:2px"></div>`;

      const lbl = document.createElement('div');
      lbl.className = 'page-num-label';
      lbl.textContent = `หน้า ${i}`;

      wrap.appendChild(loader);
      wrap.appendChild(canvas);
      wrap.appendChild(lbl);
      this.vCanvasArea.appendChild(wrap);
      this.pageWrappers.push(wrap);
    }

    await this._renderPageOnto(1, firstDims.page, firstDims.scale, firstDims.vp);
  }

  async _renderPageOnto(num, page, scale, vp) {
    if (this._renderedPages.has(num) || this._renderingPages.has(num)) return;
    this._renderingPages.add(num);

    const wrap = this.pageWrappers[num - 1];
    if (!wrap) return;

    const canvas = wrap.querySelector('.page-canvas');
    const loader = wrap.querySelector('.page-lazy-loader');

    canvas.width = vp.width;
    canvas.height = vp.height;
    wrap.style.width = vp.width + 'px';
    wrap.style.minHeight = '';

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

    canvas.style.display = '';
    if (loader) loader.style.display = 'none';
    wrap.classList.remove('page-placeholder');

    this._renderedPages.add(num);
    this._renderingPages.delete(num);

    this._preloadNeighbors(num);
  }

  async _lazyRenderPage(num) {
    if (this._renderedPages.has(num) || this._renderingPages.has(num)) return;
    const page = await this.pdfDoc.getPage(num);
    const scale = await this._calcScaleForPage(page);
    const vp = page.getViewport({ scale });
    await this._renderPageOnto(num, page, scale, vp);
  }

  _preloadNeighbors(num) {
    const preload = [num - 1, num + 1, num + 2];
    preload.forEach(n => {
      if (n >= 1 && n <= this.totalPages) this._lazyRenderPage(n);
    });
  }

  _setupLazyObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          const pg = parseInt(e.target.dataset.page);
          if (e.isIntersecting) {
            this._lazyRenderPage(pg);
            if (pg !== this.currentPage) {
              this.currentPage = pg;
              if (this.pageInput) this.pageInput.value = pg;
              this.vSidebarEl
                ?.querySelectorAll('.thumb-item')
                .forEach(el => el.classList.toggle('active', parseInt(el.dataset.page) === pg));
              const at = this.vSidebarEl?.querySelector(`.thumb-item[data-page="${pg}"]`);
              if (at) at.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        });
      },
      { root: this.vCanvasArea, threshold: 0.1, rootMargin: '200px 0px' }
    );

    this.pageWrappers.forEach(w => this.observer.observe(w));
  }

  async _buildThumbs() {
    for (let i = 1; i <= this.totalPages; i++) await this._renderThumb(i);
  }

  async _calcScale(page) {
    return this._calcScaleForPage(page);
  }

  async _calcScaleForPage(page) {
    if (this.allowFit && this.currentScale === 'fit') {
      const vp = page.getViewport({ scale: 1 });
      return ((this.vCanvasArea?.clientWidth || 700) - 48) / vp.width;
    }
    return parseFloat(this.currentScale);
  }

  async _renderThumb(num) {
    const page = await this.pdfDoc.getPage(num);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = ((this.vSidebarEl?.clientWidth || 120) - 28) / vp0.width;
    const vp = page.getViewport({ scale });

    const item = document.createElement('div');
    item.className = 'thumb-item' + (num === 1 ? ' active' : '');
    item.dataset.page = num;

    const canvas = document.createElement('canvas');
    canvas.className = 'thumb-canvas';
    canvas.width = vp.width;
    canvas.height = vp.height;

    const lbl = document.createElement('div');
    lbl.className = 'thumb-num';
    lbl.textContent = num;

    item.appendChild(canvas);
    item.appendChild(lbl);
    this.vSidebarEl.appendChild(item);

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    item.addEventListener('click', () => this.scrollToPage(num));
  }

  scrollToPage(num) {
    const w = this.pageWrappers[num - 1];
    if (w && this.vCanvasArea) this.vCanvasArea.scrollTo({ top: w.offsetTop - 16, behavior: 'smooth' });
  }

  async reRender() {
    if (!this.pdfDoc) return;
    if (!this.vCanvasArea || !this.vSidebarEl) return;

    const savedPage = this.currentPage;
    this.vCanvasArea.innerHTML = '';
    this.vSidebarEl.innerHTML = '';
    this.pageWrappers = [];
    this._renderedPages = new Set();
    this._renderingPages = new Set();

    await this._buildPlaceholders();
    this._setupLazyObserver();
    await this._buildThumbs();
    this.scrollToPage(savedPage);
  }

  stepZoom(dir) {
    const levels = this.allowFit ? ['fit', '0.5', '0.75', '1', '1.25', '1.5', '2'] : ['0.5', '0.75', '1', '1.25', '1.5', '2'];

    if (this.allowFit && this.currentScale === 'fit') {
      if (dir > 0) this.currentScale = '0.5';
      else this.currentScale = 'fit';
    }

    const i = levels.indexOf(this.currentScale);
    const next = levels[Math.max(0, Math.min(levels.length - 1, i + dir))];
    this.currentScale = next;

    if (this.zoomSelect) this.zoomSelect.value = this.currentScale;
    this.reRender();
  }
}
