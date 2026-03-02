// js/patient_page.js
'use strict';
import { esc, fmtSize, PdfViewer } from './pdf_viewer.js';

let currentHN          = '';
let currentDoctype     = null;
let viewer             = null;

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
  allowFit: true,
  defaultScale: '1.25',
});

// ── DATE FILTER HELPERS ───────────────────────────────
function getDateParams() {
  if (!dateFilterToggle?.checked) return '';
  const from = dateFrom?.value;
  const to   = dateTo?.value || from;
  if (!from) return '';
  let q = `&date_from=${encodeURIComponent(from)}`;
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

// ── DATE FILTER TOGGLE ────────────────────────────────
dateFilterToggle?.addEventListener('change', () => {
  dateFilterPicker.style.display = dateFilterToggle.checked ? '' : 'none';
  if (!dateFilterToggle.checked) {
    dateFrom.value = '';
    dateTo.value   = '';
  }
  if (currentHN) {
    loadSidebarCategories(currentHN);
    resetDocCards();
  }
});

dateFrom?.addEventListener('change', () => { if (currentHN) { loadSidebarCategories(currentHN); resetDocCards(); } });
dateTo?.addEventListener('change',   () => { if (currentHN) { loadSidebarCategories(currentHN); resetDocCards(); } });

// ── SEARCH PATIENT ────────────────────────────────────
async function searchPatient() {
  const hn = hnInput.value.trim();
  if (!hn) { hnInput.focus(); return; }
  resetPatientUI();
  btnSearch.disabled = true;
  btnSearch.innerHTML = '<div class="toast-spinner" style="border-color:#fff3;border-top-color:#fff;margin:0"></div>';
  try {
    const res  = await fetch(`../services/patient_api.php?hn=${encodeURIComponent(hn)}`);
    const data = await res.json();
    if (data.error || !data.patient) {
      Swal.fire({ icon:'warning', title:'ไม่พบผู้ป่วย', text:`ไม่พบ HN: ${hn}`, confirmButtonColor:'#1dd1bd' });
      return;
    }
    currentHN = hn;
    showPatientInfo(data.patient);
    btnClear.style.display = '';
    doctypeSection.style.display = '';
    loadSidebarCategories(hn);
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
    const url  = `../services/patient_doctypes.php?hn=${encodeURIComponent(hn)}${getDateParams()}`;
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
      return;
    }
    types.forEach((t, idx) => {
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
  }
}

// ── SELECT CATEGORY ───────────────────────────────────
function selectCategory(doctype) {
  currentDoctype = doctype;
  // Highlight active in sidebar
  sidebarCatMenu.querySelectorAll('.sidebar-cat-item').forEach(a => {
    a.classList.toggle('active', a.dataset.id === String(doctype.doctype_id));
  });
  // Hide viewer, show cards
  pdfViewerWrap.style.display = 'none';
  loadDocCards(doctype);
  doctypeSection.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ── LOAD DOCUMENT CARDS ───────────────────────────────
async function loadDocCards(doctype) {
  docCardsCategoryName.textContent = doctype.DocTypeName;
  docCardsSubtitle.textContent     = '';
  docCardsGrid.innerHTML = `
    <div style="height:88px" class="skeleton"></div>
    <div style="height:88px" class="skeleton"></div>
    <div style="height:88px" class="skeleton"></div>`;
  try {
    const url  = `../services/patient_docs.php?hn=${encodeURIComponent(currentHN)}&doctype_id=${encodeURIComponent(doctype.doctype_id)}${getDateParams()}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const docs = data.docs || [];
    docCardsSubtitle.textContent = `(${docs.length} เอกสาร${getDateLabel()})`;
    docCardsGrid.innerHTML = '';
    if (!docs.length) {
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
      card.addEventListener('click', () => openDocPdf(doc, card, doctype));
      docCardsGrid.appendChild(card);
    });
  } catch(e) {
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

// ── OPEN PDF FROM DOCUMENT CARD ───────────────────────
async function openDocPdf(doc, cardEl, doctype) {
  // Highlight selected card
  docCardsGrid.querySelectorAll('.doc-file-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');

  // Show viewer with loading state
  pdfViewerWrap.style.display = '';
  pdfViewerTitle.textContent  = doc.original_name;
  pdfViewerMeta.textContent   = `หมวด: ${doctype.DocTypeName} · กำลังโหลด...`;
  btnDownloadPdf.style.display = 'none';
  viewerBody.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--text-muted)">
      <div class="spin-ring" style="border-top-color:var(--primary);border-color:#e0e0e0;width:36px;height:36px;border-width:3px"></div>
      <p style="margin:0;font-size:14px">กำลังโหลดเอกสาร...</p>
    </div>`;

  // Scroll to viewer
  setTimeout(() => pdfViewerWrap.scrollIntoView({ behavior:'smooth', block:'start' }), 80);

  try {
    pdfViewerMeta.textContent = `หมวด: ${doctype.DocTypeName} · ${fmtSize(doc.file_size)}`;

    // Setup download button
    btnDownloadPdf.style.display = '';
    btnDownloadPdf.onclick = () => {
      const a = document.createElement('a');
      a.href = `../services/download.php?id=${encodeURIComponent(doc.id)}`;
      a.download = doc.original_name;
      a.click();
    };

    // Load PDF
    await viewer.load(`../services/download.php?id=${encodeURIComponent(doc.id)}&inline=1`);

  } catch(e) {
    viewerBody.innerHTML = `
      <div style="color:var(--danger);padding:32px;text-align:center">
        <i class="bi bi-exclamation-triangle" style="font-size:32px;display:block;margin-bottom:8px"></i>
        เกิดข้อผิดพลาด: ${esc(e.message)}
      </div>`;
  }
}

// ── RESET HELPERS ─────────────────────────────────────
function resetDocCards() {
  currentDoctype = null;
  pdfViewerWrap.style.display = 'none';
  docCardsCategoryName.textContent = 'เลือกหมวดเอกสารจากแถบด้านซ้าย';
  docCardsSubtitle.textContent     = '';
  docCardsGrid.innerHTML = `
    <div class="doc-cards-placeholder">
      <i class="bi bi-arrow-left-circle" style="font-size:36px;display:block;margin-bottom:12px;color:var(--border-strong)"></i>
      เลือกหมวดเอกสารจากแถบด้านซ้าย
    </div>`;
}

function resetPatientUI() {
  currentHN = '';
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
  hnInput.focus();
}

// ── BIND ──────────────────────────────────────────────
btnSearch.addEventListener('click', searchPatient);
hnInput.addEventListener('keydown', e => { if(e.key==='Enter') searchPatient(); });
btnClear.addEventListener('click', clearAll);
btnBackDoctype?.addEventListener('click', () => {
  pdfViewerWrap.style.display = 'none';
  docCardsGrid.querySelectorAll('.doc-file-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('docCardsSection')?.scrollIntoView({ behavior:'smooth', block:'start' });
});
hnInput.focus();