// js/upload_page.js  (type="module")
'use strict';
import { fmtSize, PdfViewer } from './pdf_viewer.js';

// ── STATE ─────────────────────────────────────────────
let activeFile    = null;
let activeFileUrl = null;
let viewer        = null;

// ── ELEMENTS ──────────────────────────────────────────
const dropZone    = document.getElementById('dropZone');
const fileInput   = document.getElementById('fileInput');
const toastBar    = document.getElementById('toastBar');
const prevHeader  = document.getElementById('previewHeader');
const phName      = document.getElementById('phName');
const phSize      = document.getElementById('phSize');
const phActions   = document.getElementById('phActions');
const viewerShell = document.getElementById('viewerShell');
const viewerBody  = document.getElementById('viewerBody');
const statusText  = document.getElementById('statusText');
const statusPill  = document.getElementById('statusPill');
const pageInput   = document.getElementById('pageInput');
const totalPgEl   = document.getElementById('totalPages');
const zoomSelect  = document.getElementById('zoomSelect');
const dropWrapper = document.getElementById('dropzoneWrapper');
const hnUploadInput = document.getElementById('hnUploadInput');
const doctypeSelect = document.getElementById('doctypeUploadInput');

// ── SELECT2 INIT ──────────────────────────────────────
(function initSelect2() {
  if (typeof $ === 'undefined' || !$.fn.select2) return;
  $('#doctypeUploadInput').select2({
    placeholder: 'เลือกหมวดเอกสาร...',
    allowClear: true,
    language: {
      noResults: () => 'ไม่พบหมวดเอกสาร',
      searching: () => 'กำลังค้นหา...',
    },
  });
  fetch('../services/doctype_list.php')
    .then(r => r.json())
    .then(data => {
      const sel = document.getElementById('doctypeUploadInput');
      (data.doctypes || []).forEach(dt => {
        const opt = document.createElement('option');
        opt.value = dt.doctype_id;
        opt.textContent = `${dt.DocType} — ${dt.DocTypeName}`;
        opt.dataset.doctypeCode = dt.DocType;
        sel.appendChild(opt);
      });
      $('#doctypeUploadInput').trigger('change');
    })
    .catch(() => {});
})();

viewer = new PdfViewer({
  viewerBody,
  pageInput,
  totalPagesEl: totalPgEl,
  zoomSelect,
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnSidebarToggle: document.getElementById('btnSidebar'),
  allowFit: true,
  defaultScale: '1.25',
});

// ── DROP ZONE ─────────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-active');
  document.getElementById('dzTitle').textContent = 'วางได้เลย!';
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-active');
  document.getElementById('dzTitle').textContent = 'วางไฟล์ PDF ที่นี่ หรือคลิกเพื่อเลือกไฟล์';
});
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-active');
  document.getElementById('dzTitle').textContent = 'วางไฟล์ PDF ที่นี่ หรือคลิกเพื่อเลือกไฟล์';
  handleFiles([...e.dataTransfer.files]);
});
fileInput.addEventListener('change', e => handleFiles([...e.target.files]));

function handleFiles(files) {
  const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  if (!pdfs.length) { showToast('error','bi-exclamation-triangle-fill','กรุณาเลือกเฉพาะไฟล์ PDF เท่านั้น'); return; }
  const f = pdfs[0];
  if (f.size > 100*1024*1024) { showToast('error','bi-exclamation-triangle-fill',`"${f.name}" มีขนาดเกิน 100 MB`); return; }
  hideToast();
  dropWrapper.style.display = 'none';
  openFile(f);
}

async function openFile(file) {
  activeFile = file;
  phName.textContent = file.name;
  phSize.textContent = fmtSize(file.size);
  prevHeader.classList.add('visible');
  viewerShell.classList.add('visible');
  statusText.textContent = 'ตรวจสอบต้นฉบับ';
  statusPill.querySelector('.dot-pulse').style.background = '#2980b9';

  phActions.innerHTML = `
    <button class="btn btn-primary" id="btnUpload"><i class="bi bi-cloud-arrow-up-fill"></i> Upload</button>
    <button class="btn btn-danger-soft" id="btnReset"><i class="bi bi-x-circle"></i> ยกเลิก</button>`;
  document.getElementById('btnUpload').addEventListener('click', doUpload);
  document.getElementById('btnReset').addEventListener('click', clearAll);

  await loadPdf(URL.createObjectURL(file));

  // Auto-scroll to viewer after file loaded
  setTimeout(() => viewerShell.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

function clearAll() {
  activeFile = null;
  if (activeFileUrl) URL.revokeObjectURL(activeFileUrl);
  activeFileUrl = null;
  fileInput.value = '';
  if (hnUploadInput) hnUploadInput.value = '';
  if (doctypeSelect) {
    doctypeSelect.value = '';
    if (typeof $ !== 'undefined' && $.fn.select2) $('#doctypeUploadInput').val('').trigger('change');
  }
  hideToast();
  dropWrapper.style.display = '';
  prevHeader.classList.remove('visible');
  viewerShell.classList.remove('visible');
  statusText.textContent = 'พร้อมรับไฟล์';
  statusPill.querySelector('.dot-pulse').style.background = '#1dd1bd';
  viewerBody.innerHTML = '';
  zoomSelect.value = '1.25';
}

// ── UPLOAD ────────────────────────────────────────────
async function doUpload() {
  if (!activeFile) return;
  const hn = (hnUploadInput?.value || '').trim();
  const doctype_id = (doctypeSelect?.value || '').trim();
  if (!hn || !doctype_id) {
    await Swal.fire({
      icon:'warning',
      title:'กรอกข้อมูลไม่ครบ',
      text:'กรุณากรอก HN และเลือกหมวดเอกสาร ก่อนอัปโหลด',
      confirmButtonText:'ตกลง',
      confirmButtonColor:'#1dd1bd',
    });
    if (!hn) hnUploadInput?.focus();
    else $('#doctypeUploadInput').select2('open');
    return;
  }
  const btn = document.getElementById('btnUpload');
  btn.disabled = true;
  showToast('loading', null, 'กำลังอัปโหลดเข้าระบบ...');
  const form = new FormData();
  form.append('pdf', activeFile);
  form.append('hn', hn);
  form.append('doctype_id', doctype_id);
  try {
    const res  = await fetch('../services/upload_doc.php', { method:'POST', body:form });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Server response (not JSON):', text);
      throw new Error(`Server error: ${text.replace(/<[^>]*>/g, '').trim().substring(0, 200)}`);
    }
    hideToast();
    if (data.message === 'Upload success') {
      await Swal.fire({
        icon:'success', title:'อัปโหลดสำเร็จ!',
        text:`"${activeFile.name}" บันทึกเข้าระบบเรียบร้อยแล้ว`,
        confirmButtonText:'ตกลง', confirmButtonColor:'#1dd1bd',
        timer:3000, timerProgressBar:true,
      });
      clearAll();
    } else {
      throw new Error(data.message || 'ไม่สามารถอัปโหลดได้');
    }
  } catch(err) {
    hideToast();
    await Swal.fire({ icon:'error', title:'เกิดข้อผิดพลาด', text:err.message, confirmButtonText:'ปิด', confirmButtonColor:'#e05c5c' });
    btn.disabled = false;
  }
}

// ── PDF VIEWER ────────────────────────────────────────
async function loadPdf(url) {
  if (activeFileUrl && activeFileUrl !== url) URL.revokeObjectURL(activeFileUrl);
  activeFileUrl = url;
  await viewer.load(url);
}

// ── TOAST ─────────────────────────────────────────────
function showToast(type, icon, msg) {
  toastBar.className = `toast-bar show ${type}`;
  toastBar.innerHTML = type==='loading'
    ? `<div class="toast-spinner"></div> ${msg}`
    : `<i class="bi ${icon}"></i> ${msg}`;
}
function hideToast() { toastBar.className = 'toast-bar'; toastBar.innerHTML = ''; }