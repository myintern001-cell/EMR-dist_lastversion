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

const upStep1       = document.getElementById('upStep1');
const upStep2       = document.getElementById('upStep2');
const upStep3       = document.getElementById('upStep3');
const upStep4       = document.getElementById('upStep4');
const upArrow1      = document.getElementById('upArrow1');
const upArrow2      = document.getElementById('upArrow2');
const upArrow3      = document.getElementById('upArrow3');
const hnValidation  = document.getElementById('hnValidation');
const dtValidation  = document.getElementById('doctypeValidation');
const summaryBar    = document.getElementById('uploadSummaryBar');
const summaryHn     = document.getElementById('summaryHn');
const summaryDoctype = document.getElementById('summaryDoctype');
const summaryFile   = document.getElementById('summaryFile');
const summarySize   = document.getElementById('summarySize');
const uploadProgressWrap = document.getElementById('uploadProgressWrap');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const uploadProgressPct  = document.getElementById('uploadProgressPct');
const postUploadActions  = document.getElementById('postUploadActions');
const postUploadTitle    = document.getElementById('postUploadTitle');
const postUploadSub      = document.getElementById('postUploadSub');
const postBtnViewPatient = document.getElementById('postBtnViewPatient');
const postBtnUploadMore  = document.getElementById('postBtnUploadMore');

// ── STEPPER LOGIC ───────────────────────────────────────
function setUploadStep(step) {
  [upStep1, upStep2, upStep3, upStep4].forEach((el, i) => {
    if (!el) return;
    el.classList.remove('active', 'done');
    if (i + 1 < step) el.classList.add('done');
    else if (i + 1 === step) el.classList.add('active');
  });
  [upArrow1, upArrow2, upArrow3].forEach((el, i) => {
    if (!el) return;
    el.classList.toggle('done', i + 1 < step);
  });
}

// ── VALIDATION CHIPS ───────────────────────────────────
function showValidation(el, type, msg) {
  if (!el) return;
  el.className = `validation-chip show ${type}`;
  el.innerHTML = `<i class="bi ${type === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle'}"></i> ${msg}`;
}

function hideValidation(el) {
  if (!el) return;
  el.className = 'validation-chip';
  el.innerHTML = '';
}

function validateFields() {
  const hn = (hnUploadInput?.value || '').trim();
  const dt = (doctypeSelect?.value || '').trim();
  let valid = true;
  if (!hn) {
    showValidation(hnValidation, 'error', 'กรุณากรอก HN');
    valid = false;
  } else {
    showValidation(hnValidation, 'success', `HN: ${hn}`);
  }
  if (!dt) {
    showValidation(dtValidation, 'error', 'กรุณาเลือกหมวดเอกสาร');
    valid = false;
  } else {
    const selText = doctypeSelect.options[doctypeSelect.selectedIndex]?.text || dt;
    showValidation(dtValidation, 'success', selText);
  }
  return valid;
}

// ── SUMMARY BAR ────────────────────────────────────────
function updateSummaryBar() {
  if (!summaryBar) return;
  const hn = (hnUploadInput?.value || '').trim();
  const dt = (doctypeSelect?.value || '').trim();
  if (!hn && !dt && !activeFile) {
    summaryBar.classList.remove('show');
    return;
  }
  if (summaryHn) summaryHn.textContent = hn || '—';
  if (summaryDoctype) {
    const selText = dt ? (doctypeSelect.options[doctypeSelect.selectedIndex]?.text || dt) : '—';
    summaryDoctype.textContent = selText;
  }
  if (summaryFile) summaryFile.textContent = activeFile ? activeFile.name : '—';
  if (summarySize) summarySize.textContent = activeFile ? fmtSize(activeFile.size) : '—';
  if (activeFile && hn && dt) {
    summaryBar.classList.add('show');
  } else {
    summaryBar.classList.remove('show');
  }
}

// ── STEPPER AUTO-UPDATE ─────────────────────────────────
function refreshStepperState() {
  const hn = (hnUploadInput?.value || '').trim();
  const dt = (doctypeSelect?.value || '').trim();
  if (activeFile && hn && dt) {
    setUploadStep(3);
  } else if (activeFile) {
    setUploadStep(3);
  } else if (hn && dt) {
    setUploadStep(2);
  } else {
    setUploadStep(1);
  }
  updateSummaryBar();
}

hnUploadInput?.addEventListener('input', () => {
  hideValidation(hnValidation);
  refreshStepperState();
});
hnUploadInput?.addEventListener('blur', () => {
  const hn = (hnUploadInput.value || '').trim();
  if (hn) showValidation(hnValidation, 'success', `HN: ${hn}`);
  else hideValidation(hnValidation);
});

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
  fetch(BASE_URL + '/api/doctypes')
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

  // Wire up doctype change for validation + stepper
  $('#doctypeUploadInput').on('change', () => {
    hideValidation(dtValidation);
    const dt = (doctypeSelect?.value || '').trim();
    if (dt) {
      const selText = doctypeSelect.options[doctypeSelect.selectedIndex]?.text || dt;
      showValidation(dtValidation, 'success', selText);
    }
    refreshStepperState();
  });
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
  refreshStepperState();

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
  hideValidation(hnValidation);
  hideValidation(dtValidation);
  if (summaryBar) summaryBar.classList.remove('show');
  if (uploadProgressWrap) uploadProgressWrap.classList.remove('show');
  if (postUploadActions) postUploadActions.classList.remove('show');
  setUploadStep(1);
}

// ── UPLOAD ────────────────────────────────────────────
async function doUpload() {
  if (!activeFile) return;
  const hn = (hnUploadInput?.value || '').trim();
  const doctype_id = (doctypeSelect?.value || '').trim();

  if (!validateFields()) {
    if (!hn) hnUploadInput?.focus();
    else if (typeof $ !== 'undefined' && $.fn.select2) $('#doctypeUploadInput').select2('open');
    return;
  }

  const btn = document.getElementById('btnUpload');
  btn.disabled = true;
  setUploadStep(4);
  hideToast();

  if (uploadProgressWrap) uploadProgressWrap.classList.add('show');
  if (uploadProgressFill) uploadProgressFill.style.width = '0%';
  if (uploadProgressPct) uploadProgressPct.textContent = '0%';

  statusText.textContent = 'กำลังอัปโหลด...';
  statusPill.querySelector('.dot-pulse').style.background = '#f5a623';

  const form = new FormData();
  form.append('pdf', activeFile);
  form.append('hn', hn);
  form.append('doctype_id', doctype_id);

  const savedFileName = activeFile.name;

  try {
    const data = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', BASE_URL + '/api/upload');
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          if (uploadProgressFill) uploadProgressFill.style.width = pct + '%';
          if (uploadProgressPct) uploadProgressPct.textContent = pct + '%';
        }
      });
      xhr.addEventListener('load', () => {
        if (uploadProgressFill) uploadProgressFill.style.width = '100%';
        if (uploadProgressPct) uploadProgressPct.textContent = '100%';
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error(`Server error: ${xhr.responseText.replace(/<[^>]*>/g, '').trim().substring(0, 200)}`));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ')));
      xhr.send(form);
    });

    if (uploadProgressWrap) uploadProgressWrap.classList.remove('show');
    hideToast();

    if (data.message === 'Upload success') {
      statusText.textContent = 'อัปโหลดสำเร็จ';
      statusPill.querySelector('.dot-pulse').style.background = '#27ae60';

      prevHeader.classList.remove('visible');
      viewerShell.classList.remove('visible');
      if (summaryBar) summaryBar.classList.remove('show');

      if (postUploadTitle) postUploadTitle.textContent = 'อัปโหลดสำเร็จ!';
      if (postUploadSub) postUploadSub.textContent = `"${savedFileName}" บันทึกเข้าระบบเรียบร้อยแล้ว`;
      if (postBtnViewPatient) {
        postBtnViewPatient.href = BASE_URL + `/patient/${encodeURIComponent(hn)}`;
      }
      if (postUploadActions) postUploadActions.classList.add('show');

      postBtnUploadMore?.addEventListener('click', () => {
        clearAll();
      }, { once: true });

    } else {
      throw new Error(data.message || 'ไม่สามารถอัปโหลดได้');
    }
  } catch(err) {
    if (uploadProgressWrap) uploadProgressWrap.classList.remove('show');
    hideToast();
    statusText.textContent = 'เกิดข้อผิดพลาด';
    statusPill.querySelector('.dot-pulse').style.background = '#e05c5c';
    setUploadStep(3);
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
