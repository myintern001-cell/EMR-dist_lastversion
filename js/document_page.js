// js/document_page.js
'use strict';

const PAGE_SIZE = 7;
let allDocs      = [];
let filteredDocs = [];
let currentFilter = 'all';
let currentSort   = 'date_desc';
let currentPage   = 1;

// ── HELPERS ───────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmtSize(b) {
  b = parseInt(b) || 0;
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(2) + ' MB';
}
function statusBadge(s) {
  const m = { uploaded:['uploaded','อัปโหลดสำเร็จ'], pending:['pending','รอดำเนินการ'], error:['error','ข้อผิดพลาด'] };
  const [cls,label] = m[s] || ['pending', s];
  return `<span class="status-badge ${cls}"><span class="s-dot"></span>${label}</span>`;
}

// ── FETCH ─────────────────────────────────────────────
async function loadDocs() {
  document.getElementById('tableBody').innerHTML =
    `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">
      <div class="spin-ring" style="border-top-color:var(--primary);border-color:#e0e0e0;margin:0 auto 12px"></div>
      กำลังโหลด...
    </td></tr>`;
  try {
    const res  = await fetch('../services/documents_api.php');
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    allDocs = json.data || [];
  } catch(e) {
    allDocs = [];
    Swal.fire({ icon:'error', title:'โหลดข้อมูลไม่ได้', text:e.message, confirmButtonColor:'#e05c5c' });
  }
  updateStats();
  updateCounts();
  applyFilterSort();
  renderTable();
}

// ── STATS ─────────────────────────────────────────────
function updateStats() {
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  const totalSize = allDocs.reduce((a,b) => a + parseInt(b.file_size||0), 0);
  set('statTotal',    allDocs.length);
  set('statUploaded', allDocs.filter(d => d.status === 'uploaded').length);
  set('statPending',  allDocs.filter(d => d.status === 'pending').length);
  set('statSize',    (totalSize/1048576).toFixed(1));
}

function updateCounts() {
  document.getElementById('countAll').textContent      = allDocs.length;
  document.getElementById('countUploaded').textContent = allDocs.filter(d=>d.status==='uploaded').length;
  document.getElementById('countPending').textContent  = allDocs.filter(d=>d.status==='pending').length;
  document.getElementById('countError').textContent    = allDocs.filter(d=>d.status==='error').length;
}

// ── FILTER & SORT ─────────────────────────────────────
function applyFilterSort() {
  let docs = [...allDocs];
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  if (q) docs = docs.filter(d => d.original_name.toLowerCase().includes(q) || String(d.id).includes(q));
  if (currentFilter !== 'all') docs = docs.filter(d => d.status === currentFilter);
  const sorts = {
    date_desc: (a,b) => b.uploaded_at.localeCompare(a.uploaded_at),
    date_asc:  (a,b) => a.uploaded_at.localeCompare(b.uploaded_at),
    name_asc:  (a,b) => a.original_name.localeCompare(b.original_name,'th'),
    size_desc: (a,b) => b.file_size - a.file_size,
  };
  docs.sort(sorts[currentSort] || sorts.date_desc);
  filteredDocs = docs;
  currentPage = 1;
}

// ── RENDER TABLE ──────────────────────────────────────
function renderTable() {
  const tbody  = document.getElementById('tableBody');
  const empty  = document.getElementById('emptyState');
  const pgRow  = document.getElementById('paginationRow');
  const start  = (currentPage - 1) * PAGE_SIZE;
  const page   = filteredDocs.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = '';
  if (!filteredDocs.length) {
    empty.classList.add('show');
    pgRow.style.display = 'none';
    return;
  }
  empty.classList.remove('show');
  pgRow.style.display = 'flex';

  page.forEach(doc => {
    const [dateStr, timeStr] = (doc.uploaded_at || '').split(' ');
    const status = doc.status || 'uploaded';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="file-cell">
          <div class="file-icon-wrap"><i class="bi bi-filetype-pdf"></i></div>
          <div class="file-details">
            <div class="file-name" title="${esc(doc.original_name)}">${esc(doc.original_name)}</div>
            <div class="file-id">ID: ${esc(doc.id)}</div>
          </div>
        </div>
      </td>
      <td><span class="size-badge">${fmtSize(doc.file_size)}</span></td>
      <td>${statusBadge(status)}</td>
      <td><div class="date-cell"><div class="date-main">${esc(dateStr||'—')}</div><div class="date-time">${esc(timeStr||'')}</div></div></td>
      <td>
        <div class="action-cell">
          <button class="act-btn view-act" title="รายละเอียด"><i class="bi bi-info-circle"></i></button>
          <button class="act-btn dl-act"   title="ดาวน์โหลด"><i class="bi bi-download"></i></button>
          <button class="act-btn del-act"  title="ลบ"><i class="bi bi-trash3"></i></button>
        </div>
      </td>`;
    tr.querySelector('.view-act').onclick = e => { e.stopPropagation(); openPanel(doc); };
    tr.querySelector('.dl-act').onclick   = e => { e.stopPropagation(); doDownload(doc); };
    tr.querySelector('.del-act').onclick  = e => { e.stopPropagation(); doDelete(doc.id); };
    tr.onclick = () => openPanel(doc);
    tbody.appendChild(tr);
  });

  renderPagination();
}

// ── PAGINATION ────────────────────────────────────────
function renderPagination() {
  const total  = filteredDocs.length;
  const pages  = Math.ceil(total / PAGE_SIZE);
  const start  = (currentPage - 1) * PAGE_SIZE + 1;
  const end    = Math.min(currentPage * PAGE_SIZE, total);

  document.getElementById('pageInfo').innerHTML = `แสดง <b>${start}–${end}</b> จาก <b>${total}</b> รายการ`;
  const ctrl = document.getElementById('pageControls');
  ctrl.innerHTML = '';

  const mk = (html, pg, disabled, active) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (active ? ' active' : '');
    b.innerHTML = html; b.disabled = disabled;
    if (!disabled && !active) b.onclick = () => { currentPage = pg; renderTable(); };
    ctrl.appendChild(b);
  };
  mk('<i class="bi bi-chevron-left"></i>', currentPage-1, currentPage===1);
  for (let i=1; i<=pages; i++) {
    if (pages > 7 && i>2 && i<pages-1 && Math.abs(i-currentPage)>1) {
      if (i===3||i===pages-2) mk('…',i,true);
      continue;
    }
    mk(i, i, false, i===currentPage);
  }
  mk('<i class="bi bi-chevron-right"></i>', currentPage+1, currentPage===pages);
}

// ── DETAIL PANEL ──────────────────────────────────────
function openPanel(doc) {
  const [dateStr, timeStr] = (doc.uploaded_at||'').split(' ');
  document.getElementById('dpBody').innerHTML = `
    <div class="dp-preview-box"><i class="bi bi-file-earmark-pdf"></i></div>
    <div class="dp-section">
      <div class="dp-section-title">ข้อมูลไฟล์</div>
      <div class="dp-field"><span class="dp-key">ชื่อไฟล์</span><span class="dp-val">${esc(doc.original_name)}</span></div>
      <div class="dp-field"><span class="dp-key">ชื่อที่เก็บ</span><span class="dp-val mono">${esc(doc.stored_name)}</span></div>
      <div class="dp-field"><span class="dp-key">ขนาด</span><span class="dp-val mono">${fmtSize(doc.file_size)}</span></div>
      <div class="dp-field"><span class="dp-key">ประเภท</span><span class="dp-val mono">${esc(doc.mime_type)}</span></div>
      <div class="dp-field"><span class="dp-key">สถานะ</span><span class="dp-val">${statusBadge(doc.status||'uploaded')}</span></div>
    </div>
    <div class="dp-section">
      <div class="dp-section-title">ข้อมูลการอัปโหลด</div>
      <div class="dp-field"><span class="dp-key">วันที่</span><span class="dp-val">${esc(dateStr||'—')}</span></div>
      <div class="dp-field"><span class="dp-key">เวลา</span><span class="dp-val mono">${esc(timeStr||'—')}</span></div>
      <div class="dp-field"><span class="dp-key">Path</span><span class="dp-val mono">${esc(doc.file_path)}</span></div>
    </div>
    <div class="dp-section">
      <div class="dp-section-title">การดำเนินการ</div>
      <div class="dp-actions">
        <button class="dp-act-btn" id="dpDlBtn"><i class="bi bi-download"></i> ดาวน์โหลดไฟล์</button>
        <button class="dp-act-btn danger" id="dpDelBtn"><i class="bi bi-trash3"></i> ลบเอกสาร</button>
      </div>
    </div>`;
  document.getElementById('dpDlBtn').onclick  = () => doDownload(doc);
  document.getElementById('dpDelBtn').onclick = () => doDelete(doc.id);
  document.getElementById('detailPanel').classList.add('open');
}

function closePanel() {
  document.getElementById('detailPanel').classList.remove('open');
}

// ── DOWNLOAD & DELETE ─────────────────────────────────
function doDownload(doc) {
  const a = document.createElement('a');
  a.href = `../services/download.php?id=${encodeURIComponent(doc.id)}`;
  a.download = doc.original_name;
  a.click();
}

async function doDelete(id) {
  const result = await Swal.fire({
    icon:'warning', title:'ยืนยันการลบ',
    text:'ต้องการลบเอกสารนี้ออกจากระบบ?',
    showCancelButton:true,
    confirmButtonText:'ลบเลย', confirmButtonColor:'#e05c5c',
    cancelButtonText:'ยกเลิก',
  });
  if (!result.isConfirmed) return;
  try {
    const res  = await fetch('../services/delete_doc.php', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      closePanel();
      allDocs = allDocs.filter(d => d.id !== id);
      updateStats(); updateCounts(); applyFilterSort(); renderTable();
      Swal.fire({ icon:'success', title:'ลบสำเร็จ', timer:1500, showConfirmButton:false, timerProgressBar:true });
    } else throw new Error(data.message || 'เกิดข้อผิดพลาด');
  } catch(e) {
    Swal.fire({ icon:'error', title:'ลบไม่สำเร็จ', text:e.message, confirmButtonColor:'#e05c5c' });
  }
}

// ── BIND EVENTS ───────────────────────────────────────
document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    applyFilterSort(); renderTable();
  });
});
document.getElementById('sortSelect').addEventListener('change', e => {
  currentSort = e.target.value; applyFilterSort(); renderTable();
});
let searchTimer;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { applyFilterSort(); renderTable(); }, 280);
});
document.getElementById('dpCloseBtn').addEventListener('click', closePanel);
document.addEventListener('click', e => {
  if (!e.target.closest('.detail-panel') && !e.target.closest('.act-btn') && !e.target.closest('.dp-act-btn'))
    closePanel();
});

// ── INIT ──────────────────────────────────────────────
loadDocs();
