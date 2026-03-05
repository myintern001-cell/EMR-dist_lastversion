// js/patient_page.js
'use strict';
import { esc, fmtSize, PdfViewer } from './pdf_viewer.js';

let currentHN          = '';
let currentDoctype     = null;
let currentDocs        = [];
let viewerDoctypeName  = '';
let viewer             = null;
let docsRequestToken   = 0;
let viewerLoadToken    = 0;

const bootstrap = window.PATIENT_BOOTSTRAP || {};
const initialRouteHn = String(bootstrap.initialRouteHn || '').trim();
const initialQueryHn = String(bootstrap.initialQueryHn || '').trim();
const initialDateFrom = String(bootstrap.initialDateFrom || '').trim();
const initialDateTo = String(bootstrap.initialDateTo || '').trim();

const hnInput               = document.getElementById('hnInput');
const btnSearch             = document.getElementById('btnSearch');
const btnClear              = document.getElementById('btnClear');
const patientInfoBar        = document.getElementById('patientInfoBar');
const doctypeSection        = document.getElementById('doctypeSection');
const pdfViewerWrap         = document.getElementById('pdfViewerWrap');
const btnBackDoctype        = document.getElementById('btnBackDoctype');
const pageInput             = document.getElementById('pageInput');
const totalPgEl             = document.getElementById('totalPages');
const zoomSelect            = document.getElementById('zoomSelect');
const viewerBody            = document.getElementById('viewerBody');
const pdfViewerTitle        = document.getElementById('pdfViewerTitle');
const pdfViewerMeta         = document.getElementById('pdfViewerMeta');
const btnDownloadPdf        = document.getElementById('btnDownloadPdf');
const docCardsGrid          = document.getElementById('docCardsGrid');
const docCardsSubtitle      = document.getElementById('docCardsSubtitle');
const docCardsCategoryName  = document.getElementById('docCardsCategoryName');
const sidebarCatSection     = document.getElementById('sidebarCatSection');
const sidebarCatMenu        = document.getElementById('sidebarCatMenu');
const dateFilterToggle      = document.getElementById('dateFilterToggle');
const dateFilterPicker      = document.getElementById('dateFilterPicker');
const dateFrom              = document.getElementById('dateFrom');
const dateTo                = document.getElementById('dateTo');
const btnSidebarPages       = document.getElementById('btnSidebarPages');
const btnSidebarFiles       = document.getElementById('btnSidebarFiles');
const viewerProgressFill    = document.getElementById('viewerProgressFill');
const viewerProgressText    = document.getElementById('viewerProgressText');
const viewerFilePageText    = document.getElementById('viewerFilePageText');

viewer = new PdfViewer({
  viewerBody,
  pageInput,
  totalPagesEl: totalPgEl,
  zoomSelect,
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnSidebarToggle: document.getElementById('btnSidebarToggle'),
  btnSidebarPages,
  btnSidebarFiles,
  allowFit: true,
  defaultScale: '1.25',
  maxCachedDocs: 3,
  renderWindow: 8,
  onPageChange: onViewerPageChange,
  onFileDownload: onViewerFileDownload,
});

// ── DATE FILTER HELPERS ───────────────────────────────
function getDateParams() {
  const query = buildDateQuery();
  if (!query) return '';
  return '&' + query;
}

function buildDateQuery() {
  if (!dateFilterToggle?.checked) return '';
  const from = dateFrom?.value;
  const to   = dateTo?.value || from;
  if (!from) return '';
  let q = `date_from=${encodeURIComponent(from)}`;
  if (to && to !== from) q += `&date_to=${encodeURIComponent(to)}`;
  return q;
}

function getDateLabel() {
  if (!dateFilterToggle?.checked) return '';
  const from = dateFrom?.value;
  const to   = dateTo?.value;
  if (!from) return '';
  if (!to || to === from) return ` · วันที่ ${fmtDate(from)}`;
  return ` · ${fmtDate(from)} — ${fmtDate(to)}`;
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${parseInt(y) + 543}`;
}

function updateCanonicalUrl(hn = '') {
  const basePath = `${BASE_URL}/patient`;
  const path = hn ? `${basePath}/${encodeURIComponent(hn)}` : basePath;
  const query = buildDateQuery();
  const nextUrl = query ? `${path}?${query}` : path;
  window.history.replaceState(null, '', nextUrl);
}

function resetViewerProgress() {
  if (viewerProgressFill) viewerProgressFill.style.width = '0%';
  if (viewerProgressText) viewerProgressText.textContent = '0%';
  if (viewerFilePageText) viewerFilePageText.textContent = 'ไฟล์ —/— · หน้า —/—';
}

function markDocCardSelected(docId) {
  docCardsGrid?.querySelectorAll('.doc-file-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.docId === String(docId));
  });
}

function onViewerPageChange(info) {
  if (!info) return;

  const pct = info.totalPages ? Math.min(100, Math.max(0, Math.round((info.globalPage / info.totalPages) * 100))) : 0;
  if (viewerProgressFill) viewerProgressFill.style.width = `${pct}%`;
  if (viewerProgressText) viewerProgressText.textContent = `${pct}%`;
  if (viewerFilePageText) {
    viewerFilePageText.textContent = `ไฟล์ ${info.fileIndex}/${info.fileCount} · หน้า ${info.pageInFile}/${info.filePages}`;
  }

  pdfViewerTitle.textContent = info.fileName || 'เอกสาร';
  const sizeText = info.fileSize ? fmtSize(info.fileSize) : '—';
  pdfViewerMeta.textContent = `หมวด: ${viewerDoctypeName || 'เอกสาร'} · ไฟล์ ${info.fileIndex}/${info.fileCount} · ${sizeText}`;

  const docId = info.rawDoc?.id;
  if (docId !== undefined && docId !== null) {
    markDocCardSelected(docId);
  }
}

function onViewerFileDownload(rawDoc) {
  const docId = rawDoc?.id;
  if (!docId) return;
  const a = document.createElement('a');
  a.href = BASE_URL + `/api/download?id=${encodeURIComponent(docId)}`;
  a.download = rawDoc.original_name || 'document.pdf';
  a.click();
}

function applyBootstrapState() {
  if (initialDateFrom) {
    if (dateFilterToggle) dateFilterToggle.checked = true;
    if (dateFilterPicker) dateFilterPicker.style.display = '';
    if (dateFrom) dateFrom.value = initialDateFrom;
    if (dateTo) dateTo.value = initialDateTo || initialDateFrom;
  } else {
    if (dateFilterToggle) dateFilterToggle.checked = false;
    if (dateFilterPicker) dateFilterPicker.style.display = 'none';
  }

  const bootstrapHn = initialRouteHn || initialQueryHn;
  if (bootstrapHn) {
    hnInput.value = bootstrapHn;
    searchPatient({ hnOverride: bootstrapHn, auto: true });
  } else {
    hnInput.focus();
  }
}

// ── DATE FILTER TOGGLE ────────────────────────────────
dateFilterToggle?.addEventListener('change', () => {
  dateFilterPicker.style.display = dateFilterToggle.checked ? '' : 'none';
  if (!dateFilterToggle.checked) {
    dateFrom.value = '';
    dateTo.value   = '';
  }
  updateCanonicalUrl(currentHN);
  if (currentHN) {
    loadSidebarCategories(currentHN);
    if (currentDoctype) {
      selectCategory(currentDoctype);
    } else {
      resetDocCards();
    }
  }
});

dateFrom?.addEventListener('change', () => {
  updateCanonicalUrl(currentHN);
  if (currentHN) {
    loadSidebarCategories(currentHN);
    if (currentDoctype) selectCategory(currentDoctype);
    else resetDocCards();
  }
});
dateTo?.addEventListener('change', () => {
  updateCanonicalUrl(currentHN);
  if (currentHN) {
    loadSidebarCategories(currentHN);
    if (currentDoctype) selectCategory(currentDoctype);
    else resetDocCards();
  }
});

// ── SEARCH PATIENT ────────────────────────────────────
async function searchPatient(opts = {}) {
  const hn = (opts.hnOverride || hnInput.value || '').trim();
  if (!hn) { hnInput.focus(); return; }
  resetPatientUI();
  hnInput.value = hn;
  btnSearch.disabled = true;
  btnSearch.innerHTML = '<div class="toast-spinner" style="border-color:#fff3;border-top-color:#fff;margin:0"></div>';
  try {
    const res  = await fetch(BASE_URL + `/api/patient?hn=${encodeURIComponent(hn)}`);
    const data = await res.json();
    if (data.error || !data.patient) {
      Swal.fire({ icon:'warning', title:'ไม่พบผู้ป่วย', text:`ไม่พบ HN: ${hn}`, confirmButtonColor:'#1dd1bd' });
      return;
    }
    currentHN = hn;
    showPatientInfo(data.patient);
    updateCanonicalUrl(hn);
    btnClear.style.display = '';
    doctypeSection.style.display = '';
    await loadSidebarCategories(hn);
  } catch(e) {
    Swal.fire({ icon:'error', title:'เกิดข้อผิดพลาด', text:e.message, confirmButtonColor:'#e05c5c' });
  } finally {
    btnSearch.disabled = false;
    btnSearch.innerHTML = '<i class="bi bi-search"></i> ค้นหา';
  }
}

function showPatientInfo(patient) {
  document.getElementById('patientInitial').textContent =
    (patient.name||'?').charAt(0).toUpperCase();
  document.getElementById('patientName').textContent = patient.name || '—';
  document.getElementById('patientHN').textContent   = patient.hn  || currentHN;
  document.getElementById('patientExtra').innerHTML  = patient.extra || '';
  patientInfoBar.classList.add('show');
}

// ── LOAD SIDEBAR CATEGORIES ───────────────────────────
async function loadSidebarCategories(hn) {
  if (!sidebarCatMenu) return;
  sidebarCatSection.style.display = '';
  sidebarCatMenu.innerHTML = `
    <li><a class="sidebar-cat-loading"><div class="sidebar-spinner"></div> กำลังโหลด...</a></li>`;
  try {
    const url  = BASE_URL + `/api/patient/doctypes?hn=${encodeURIComponent(hn)}${getDateParams()}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const types = data.doctypes || [];
    sidebarCatMenu.innerHTML = '';
    if (!types.length) {
      const dateLabel = getDateLabel();
      sidebarCatMenu.innerHTML = `
        <li><span class="sidebar-cat-empty">
          <i class="bi bi-folder2-open"></i>
          ${dateLabel ? 'ไม่พบเอกสาร' + dateLabel : 'ยังไม่มีเอกสาร'}
        </span></li>`;
      currentDoctype = null;
      currentDocs = [];
      pdfViewerWrap.style.display = 'none';
      resetViewerProgress();
      return;
    }
    types.forEach(t => {
      const li = document.createElement('li');
      const isActive = currentDoctype && currentDoctype.doctype_id === t.doctype_id;
      li.innerHTML = `
        <a class="sidebar-cat-item${isActive ? ' active' : ''}" data-id="${esc(t.doctype_id)}">
          <i class="bi bi-folder-fill sidebar-cat-icon"></i>
          <span class="sidebar-cat-name">${esc(t.DocTypeName)}</span>
          <span class="sidebar-cat-badge">${t.doc_count}</span>
        </a>`;
      li.querySelector('a').addEventListener('click', () => selectCategory(t));
      sidebarCatMenu.appendChild(li);
    });
  } catch(e) {
    sidebarCatMenu.innerHTML = `<li><span class="sidebar-cat-empty" style="color:var(--danger)">${esc(e.message)}</span></li>`;
    currentDoctype = null;
    currentDocs = [];
    pdfViewerWrap.style.display = 'none';
    resetViewerProgress();
  }
}

// ── SELECT CATEGORY ───────────────────────────────────
async function selectCategory(doctype) {
  currentDoctype = doctype;
  // Highlight active in sidebar
  sidebarCatMenu.querySelectorAll('.sidebar-cat-item').forEach(a => {
    a.classList.toggle('active', a.dataset.id === String(doctype.doctype_id));
  });
  await loadDocCards(doctype);
  doctypeSection.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ── LOAD DOCUMENT CARDS ───────────────────────────────
async function loadDocCards(doctype) {
  const reqToken = ++docsRequestToken;
  docCardsCategoryName.textContent = doctype.DocTypeName;
  docCardsSubtitle.textContent     = '';
  docCardsGrid.innerHTML = `
    <div style="height:88px" class="skeleton"></div>
    <div style="height:88px" class="skeleton"></div>
    <div style="height:88px" class="skeleton"></div>`;
  try {
    const url  = BASE_URL + `/api/patient/docs?hn=${encodeURIComponent(currentHN)}&doctype_id=${encodeURIComponent(doctype.doctype_id)}${getDateParams()}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (reqToken !== docsRequestToken) return;
    if (data.error) throw new Error(data.error);
    const docs = data.docs || [];
    currentDocs = docs;
    docCardsSubtitle.textContent = `(${docs.length} เอกสาร${getDateLabel()})`;
    docCardsGrid.innerHTML = '';
    if (!docs.length) {
      pdfViewerWrap.style.display = 'none';
      resetViewerProgress();
      btnDownloadPdf.style.display = 'none';
      docCardsGrid.innerHTML = `
        <div class="doc-cards-placeholder">
          <i class="bi bi-file-earmark-x" style="font-size:36px;display:block;margin-bottom:12px;color:var(--border-strong)"></i>
          ไม่พบเอกสารในหมวดนี้${getDateLabel()}
        </div>`;
      return;
    }
    docs.forEach((doc, idx) => {
      const card = document.createElement('div');
      card.className = 'doc-file-card';
      card.dataset.docId = String(doc.id ?? idx);
      card.style.animationDelay = (idx * 0.04) + 's';
      const uploadedAt = doc.uploaded_at ? fmtDateTime(doc.uploaded_at) : '—';
      card.innerHTML = `
        <div class="doc-file-icon"><i class="bi bi-file-earmark-pdf-fill"></i></div>
        <div class="doc-file-info">
          <div class="doc-file-name">${esc(doc.original_name)}</div>
          <div class="doc-file-meta">
            <span><i class="bi bi-hdd"></i> ${fmtSize(doc.file_size)}</span>
            <span><i class="bi bi-calendar3"></i> ${uploadedAt}</span>
          </div>
        </div>
        <div class="doc-file-action"><i class="bi bi-eye-fill"></i></div>`;
      card.addEventListener('click', () => {
        markDocCardSelected(doc.id ?? idx);
        if (
          currentDoctype &&
          String(currentDoctype.doctype_id) === String(doctype.doctype_id) &&
          currentDocs.length &&
          pdfViewerWrap.style.display !== 'none'
        ) {
          const jumpIndex = currentDocs.findIndex(d => String(d.id) === String(doc.id));
          if (jumpIndex >= 0) {
            viewer.scrollToFile(jumpIndex);
            return;
          }
        }
        openDoctypeViewer(doctype, docs, doc.id);
      });
      docCardsGrid.appendChild(card);
    });

    if (reqToken !== docsRequestToken) return;
    await openDoctypeViewer(doctype, docs, docs[0]?.id);

  } catch(e) {
    if (reqToken !== docsRequestToken) return;
    currentDocs = [];
    pdfViewerWrap.style.display = 'none';
    btnDownloadPdf.style.display = 'none';
    resetViewerProgress();
    docCardsGrid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);padding:20px">เกิดข้อผิดพลาด: ${esc(e.message)}</div>`;
  }
}

function fmtDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d)) return dt;
  const day  = String(d.getDate()).padStart(2,'0');
  const mon  = String(d.getMonth()+1).padStart(2,'0');
  const year = d.getFullYear() + 543;
  const h    = String(d.getHours()).padStart(2,'0');
  const mi   = String(d.getMinutes()).padStart(2,'0');
  return `${day}/${mon}/${year} ${h}:${mi}`;
}

// ── OPEN DOCTYPE MULTI-PDF VIEWER ─────────────────────
async function openDoctypeViewer(doctype, docs, startDocId = null) {
  if (!Array.isArray(docs) || !docs.length) return;

  const openToken = ++viewerLoadToken;
  currentDoctype = doctype;
  currentDocs = docs;
  viewerDoctypeName = doctype.DocTypeName || 'เอกสาร';

  const startIndex = Math.max(0, docs.findIndex(d => String(d.id) === String(startDocId)));

  resetViewerProgress();
  pdfViewerWrap.style.display = '';
  pdfViewerTitle.textContent  = viewerDoctypeName;
  pdfViewerMeta.textContent   = `หมวด: ${viewerDoctypeName} · ${docs.length} ไฟล์${getDateLabel()}`;
  btnDownloadPdf.style.display = 'none';
  btnDownloadPdf.onclick = null;

  setTimeout(() => pdfViewerWrap.scrollIntoView({ behavior:'smooth', block:'start' }), 80);

  try {
    const sequenceDocs = docs.map((doc, idx) => ({
      ...doc,
      idx,
      url: BASE_URL + `/api/download?id=${encodeURIComponent(doc.id)}&inline=1`,
      download_url: BASE_URL + `/api/download?id=${encodeURIComponent(doc.id)}`,
    }));

    await viewer.loadSequence(sequenceDocs);

    if (openToken !== viewerLoadToken) {
      return;
    }

    btnDownloadPdf.style.display = '';
    btnDownloadPdf.onclick = () => {
      viewer.downloadCurrentFile();
    };

    if (startIndex > 0) {
      viewer.scrollToFile(startIndex);
    }

  } catch(e) {
    if (openToken !== viewerLoadToken) return;
    btnDownloadPdf.style.display = 'none';
    resetViewerProgress();
    viewerBody.innerHTML = `
      <div style="color:var(--danger);padding:32px;text-align:center">
        <i class="bi bi-exclamation-triangle" style="font-size:32px;display:block;margin-bottom:8px"></i>
        เกิดข้อผิดพลาด: ${esc(e.message)}
      </div>`;
  }
}

// ── RESET HELPERS ─────────────────────────────────────
function resetDocCards() {
  viewerLoadToken += 1;
  currentDocs = [];
  currentDoctype = null;
  viewerDoctypeName = '';
  pdfViewerWrap.style.display = 'none';
  btnDownloadPdf.style.display = 'none';
  resetViewerProgress();
  docCardsCategoryName.textContent = 'เลือกหมวดเอกสารจากแถบด้านซ้าย';
  docCardsSubtitle.textContent     = '';
  docCardsGrid.innerHTML = `
    <div class="doc-cards-placeholder">
      <i class="bi bi-arrow-left-circle" style="font-size:36px;display:block;margin-bottom:12px;color:var(--border-strong)"></i>
      เลือกหมวดเอกสารจากแถบด้านซ้าย
    </div>`;
}

function resetPatientUI() {
  viewerLoadToken += 1;
  currentHN = '';
  currentDocs = [];
  viewerDoctypeName = '';
  currentDoctype = null;
  patientInfoBar.classList.remove('show');
  doctypeSection.style.display = 'none';
  pdfViewerWrap.style.display  = 'none';
  if (sidebarCatSection) sidebarCatSection.style.display = 'none';
  if (sidebarCatMenu)    sidebarCatMenu.innerHTML = '';
  resetDocCards();
}

function clearAll() {
  hnInput.value = '';
  btnClear.style.display = 'none';
  resetPatientUI();
  updateCanonicalUrl('');
  hnInput.focus();
}

// ── BIND ──────────────────────────────────────────────
btnSearch.addEventListener('click', searchPatient);
hnInput.addEventListener('keydown', e => { if(e.key==='Enter') searchPatient(); });
btnClear.addEventListener('click', clearAll);
btnBackDoctype?.addEventListener('click', () => {
  pdfViewerWrap.style.display = 'none';
  btnDownloadPdf.style.display = 'none';
  docCardsGrid.querySelectorAll('.doc-file-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('docCardsSection')?.scrollIntoView({ behavior:'smooth', block:'start' });
});

applyBootstrapState();

