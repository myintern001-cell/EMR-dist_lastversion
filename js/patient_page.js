// js/patient_page.js
'use strict';
import { esc, fmtSize, PdfViewer } from './pdf_viewer.js';

let currentHN       = '';
let viewer          = null;

const hnInput         = document.getElementById('hnInput');
const btnSearch       = document.getElementById('btnSearch');
const btnClear        = document.getElementById('btnClear');
const patientInfoBar  = document.getElementById('patientInfoBar');
const doctypeSection  = document.getElementById('doctypeSection');
const doctypeGrid     = document.getElementById('doctypeGrid');
const doctypeSubtitle = document.getElementById('doctypeSubtitle');
const pdfViewerWrap   = document.getElementById('pdfViewerWrap');
const btnBackDoctype  = document.getElementById('btnBackDoctype');
const pageInput       = document.getElementById('pageInput');
const totalPgEl       = document.getElementById('totalPages');
const zoomSelect      = document.getElementById('zoomSelect');
const viewerBody      = document.getElementById('viewerBody');
const pdfViewerTitle  = document.getElementById('pdfViewerTitle');
const pdfViewerMeta   = document.getElementById('pdfViewerMeta');
const btnDownloadPdf  = document.getElementById('btnDownloadPdf');

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
    loadDoctypes(hn);
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

// ── LOAD DOCTYPES ─────────────────────────────────────
async function loadDoctypes(hn) {
  doctypeSection.style.display = '';
  pdfViewerWrap.style.display  = 'none';
  doctypeGrid.innerHTML = `
    <div style="height:76px" class="skeleton"></div>
    <div style="height:76px" class="skeleton"></div>
    <div style="height:76px" class="skeleton"></div>
    <div style="height:76px" class="skeleton"></div>`;
  try {
    const res  = await fetch(`../services/patient_doctypes.php?hn=${encodeURIComponent(hn)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const types = data.doctypes || [];
    doctypeGrid.innerHTML = '';
    doctypeSubtitle.textContent = `(พบ ${types.length} หมวด)`;
    if (!types.length) {
      doctypeGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">
          <i class="bi bi-folder2-open" style="font-size:40px;display:block;margin-bottom:12px;color:var(--border-strong)"></i>
          ยังไม่มีเอกสารสำหรับผู้ป่วยรายนี้
        </div>`;
      return;
    }
    types.forEach((t, idx) => {
      const card = document.createElement('div');
      card.className = 'doctype-card';
      card.style.animationDelay = (idx * 0.04) + 's';
      card.innerHTML = `
        <div class="doctype-icon"><i class="bi bi-file-earmark-medical"></i></div>
        <div class="doctype-info">
          <div class="doctype-name">${esc(t.DocTypeName)}</div>
          <div class="doctype-code">${esc(t.DocType)}</div>
        </div>`;
      card.addEventListener('click', () => openDoctypePdf(t, card));
      doctypeGrid.appendChild(card);
    });
  } catch(e) {
    doctypeGrid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);padding:20px">เกิดข้อผิดพลาด: ${esc(e.message)}</div>`;
  }
}

// ── OPEN PDF DIRECTLY FROM DOCTYPE CLICK ─────────────
async function openDoctypePdf(doctype, cardEl) {
  // Highlight selected card
  document.querySelectorAll('.doctype-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');

  // Show viewer with loading state
  pdfViewerWrap.style.display = '';
  pdfViewerTitle.textContent  = doctype.DocTypeName;
  pdfViewerMeta.textContent   = `รหัสหมวด: ${doctype.DocType} (${doctype.doctype_id}) · กำลังโหลดเอกสาร...`;
  btnDownloadPdf.style.display = 'none';
  viewerBody.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--text-muted)">
      <div class="spin-ring" style="border-top-color:var(--primary);border-color:#e0e0e0;width:36px;height:36px;border-width:3px"></div>
      <p style="margin:0;font-size:14px">กำลังโหลดเอกสาร...</p>
    </div>`;

  // Scroll to viewer
  setTimeout(() => pdfViewerWrap.scrollIntoView({ behavior:'smooth', block:'start' }), 80);

  try {
    const res  = await fetch(
      `../services/patient_docs.php?hn=${encodeURIComponent(currentHN)}&doctype_id=${encodeURIComponent(doctype.doctype_id)}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const docs = data.docs || [];
    if (!docs.length) {
      viewerBody.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--text-muted)">
          <i class="bi bi-file-earmark-x" style="font-size:48px;display:block;margin-bottom:12px;color:var(--border-strong)"></i>
          ไม่พบเอกสารในหมวดนี้
        </div>`;
      pdfViewerMeta.textContent = `รหัสหมวด: ${doctype.DocType} (${doctype.doctype_id}) · ไม่พบเอกสาร`;
      return;
    }

    const doc = docs[0];
    pdfViewerMeta.textContent = `${doc.original_name} · ${fmtSize(doc.file_size)}`;

    // Setup download button
    btnDownloadPdf.style.display = '';
    btnDownloadPdf.onclick = () => {
      const a = document.createElement('a');
      a.href = `../services/download.php?id=${encodeURIComponent(doc.id)}`;
      a.download = doc.original_name;
      a.click();
    };

    // Load PDF
    await loadPdf(`../services/download.php?id=${encodeURIComponent(doc.id)}&inline=1`, doc.original_name);

  } catch(e) {
    viewerBody.innerHTML = `
      <div style="color:var(--danger);padding:32px;text-align:center">
        <i class="bi bi-exclamation-triangle" style="font-size:32px;display:block;margin-bottom:8px"></i>
        เกิดข้อผิดพลาด: ${esc(e.message)}
      </div>`;
  }
}

// ── PDF VIEWER ────────────────────────────────────────
async function loadPdf(url) {
  await viewer.load(url);
}

// ── RESET ─────────────────────────────────────────────
function resetPatientUI() {
  currentHN = '';
  patientInfoBar.classList.remove('show');
  doctypeSection.style.display = 'none';
  pdfViewerWrap.style.display  = 'none';
  doctypeGrid.innerHTML = '';
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
  document.querySelectorAll('.doctype-card').forEach(c => c.classList.remove('selected'));
  doctypeSection.scrollIntoView({ behavior:'smooth', block:'start' });
});
hnInput.focus();