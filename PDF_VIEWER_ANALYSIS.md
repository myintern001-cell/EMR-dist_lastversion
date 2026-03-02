# PDF Viewer Code Analysis

## ภาพรวม (Overview)

PDF Viewer เป็นคลาส JavaScript ที่พัฒนาขึ้นสำหรับแสดงไฟล์ PDF ในเว็บแอปพลิเคชัน โดยใช้ PDF.js library จาก Mozilla รองรับการทำงานแบบ lazy loading, zoom, navigation และ thumbnail sidebar

## โครงสร้างไฟล์ (File Structure)

```javascript
// Imports
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs';

// Utility Functions
export function esc(str) { /* HTML escaping */ }
export function fmtSize(b) { /* File size formatting */ }

// Main Class
export class PdfViewer {
    // Constructor and initialization
    // Event binding
    // PDF loading
    // Page rendering
    // Thumbnail generation
    // Navigation and zoom controls
}
```

## Utility Functions

### `esc(str)`
- **วัตถุประสงค์**: Escape HTML characters เพื่อป้องกัน XSS attacks
- **พารามิเตอร์**: `str` - string ที่ต้องการ escape
- **การทำงาน**: แทนที่อักขระพิเศษ (&, <, >, ", ') ด้วย HTML entities
- **การใช้งาน**: ใช้เมื่อต้องแสดงข้อความใน HTML อย่างปลอดภัย

### `fmtSize(b)`
- **วัตถุประสงค์**: แปลงขนาดไฟล์จาก bytes เป็นหน่วยที่อ่านง่าย
- **พารามิเตอร์**: `b` - ขนาดไฟล์ใน bytes
- **การทำงาน**: 
  - < 1024 B: แสดงเป็น B
  - < 1048576 B: แสดงเป็น KB (ทศนิยม 1 ตำแหน่ง)
  - ≥ 1048576 B: แสดงเป็น MB (ทศนิยม 2 ตำแหน่ง)

## PdfViewer Class

### Constructor
```javascript
constructor(opts)
```

**Options ที่รับ:**
- `viewerBody`: Element หลักสำหรับแสดง PDF
- `pageInput`: Input field สำหรับกรอกหมายเลขหน้า
- `totalPagesEl`: Element แสดงจำนวนหน้าทั้งหมด
- `zoomSelect`: Dropdown สำหรับเลือกขนาด zoom
- `btnPrev`, `btnNext`: ปุ่มเลื่อนหน้า
- `btnZoomIn`, `btnZoomOut`: ปุ่ม zoom in/out
- `btnSidebarToggle`: ปุ่มเปิด/ปิด sidebar
- `allowFit`: อนุญาตให้ใช้ fit-to-width mode
- `defaultScale`: ค่า zoom เริ่มต้น (default: '1.25')

**Properties หลัก:**
- `pdfDoc`: PDF document object
- `currentPage`: หน้าปัจจุบัน
- `totalPages`: จำนวนหน้าทั้งหมด
- `currentScale`: ขนาด zoom ปัจจุบัน
- `sidebarOpen`: สถานะการเปิด sidebar
- `pageWrappers`: Array ของ page wrapper elements
- `_renderedPages`: Set ของหน้าที่ render แล้ว
- `_renderingPages`: Set ของหน้าที่กำลัง render

### Methods หลัก

#### `load(url)`
- **วัตถุประสงค์**: โหลดไฟล์ PDF จาก URL
- **การทำงาน**:
  1. รีเซ็ต state ทั้งหมด
  2. แสดง loading spinner
  3. โหลด PDF ด้วย pdfjsLib
  4. สร้าง placeholders สำหรับทุกหน้า
  5. Setup Intersection Observer สำหรับ lazy loading
  6. สร้าง thumbnails ใน sidebar

#### `_buildPlaceholders()`
- **วัตถุประสงค์**: สร้าง placeholder elements สำหรับทุกหน้า
- **การทำงาน**:
  1. คำนวณขนาดจากหน้าแรก
  2. สร้าง wrapper elements พร้อม:
     - Canvas element (ซ่อนไว้ก่อน)
     - Loading spinner
     - Page number label
  3. Render หน้าแรกทันที

#### `_renderPageOnto(num, page, scale, vp)`
- **วัตถุประสงค์**: Render หน้า PDF ลงบน canvas
- **การทำงาน**:
  1. ตรวจสอบว่า render แล้วหรือยัง
  2. ตั้งค่า canvas dimensions
  3. Render PDF page ด้วย PDF.js
  4. แสดง canvas และซ่อน loader
  5. Preload หน้าข้างเคียง

#### `_setupLazyObserver()`
- **วัตถุประสงค์**: Setup Intersection Observer สำหรับ lazy loading
- **การทำงาน**:
  1. สร้าง IntersectionObserver ด้วย threshold 0.1 และ rootMargin 200px
  2. เมื่อ element เข้า viewport:
     - Render หน้านั้น
     - Update current page
     - Highlight thumbnail ที่เลือก
     - Scroll thumbnail เข้ามุมมอง

#### `_buildThumbs()`
- **วัตถุประสงค์**: สร้าง thumbnail images ใน sidebar
- **การทำงาน**:
  1. สำหรับแต่ละหน้า:
     - คำนวณขนาด thumbnail
     - สร้าง canvas และ render
     - Add click event สำหรับ navigation
     - Add page number label

#### `scrollToPage(num)`
- **วัตถุประสงค์**: เลื่อนไปยังหน้าที่ระบุ
- **การทำงาน**: Scroll ไปยัง page wrapper ด้วย smooth behavior

#### `reRender()`
- **วัตถุประสงค์**: Render ใหม่ทั้งหมด (เมื่อเปลี่ยน zoom)
- **การทำงาน**:
  1. เก็บหน้าปัจจุบันไว้
  2. Clear และ rebuild ทุกอย่าง
  3. Scroll กลับไปหน้าเดิม

#### `stepZoom(dir)`
- **วัตถุประสงค์**: ปรับขนาด zoom ขึ้น/ลง
- **การทำงาน**:
  1. กำหนดระดับ zoom ที่เป็นไปได้
  2. เลื่อนไประดับถัดไป
  3. Update UI และ reRender

## Event Handling

### Toolbar Events
- **Previous/Next buttons**: เลื่อนไปหน้าก่อนหน้า/ถัดไป
- **Page input**: กรอกหมายเลขหน้าแล้วกด Enter
- **Zoom select**: เปลี่ยนขนาด zoom
- **Zoom buttons**: ปรับ zoom ขึ้น/ลงทีละระดับ
- **Sidebar toggle**: เปิด/ปิด thumbnail sidebar

## Performance Optimization

### Lazy Loading
- ใช้ Intersection Observer API
- Render หน้าเมื่อเข้ามุมมอง 200px ล่วงหน้า
- Preload หน้าข้างเคียง (prev, next, next+1)

### Memory Management
- Track rendered และ rendering pages ด้วย Sets
- ป้องกันการ render ซ้ำ
- Cleanup ก่อน reRender

### Rendering Pipeline
1. สร้าง placeholders พร้อมขนาดประมาณการ
2. Render หน้าแรกทันที
3. Setup observer สำหรับ lazy loading
4. Render thumbnails แบบ parallel

## UI Components

### Main Structure
```html
<div class="viewer-body">
  <div class="viewer-sidebar" id="vSidebar">
    <!-- Thumbnail items -->
  </div>
  <div class="viewer-canvas-area" id="vCanvasArea">
    <!-- Page wrappers with canvases -->
  </div>
</div>
```

### Page Wrapper
```html
<div class="page-wrapper" data-page="1">
  <div class="page-lazy-loader">
    <!-- Loading spinner -->
  </div>
  <canvas class="page-canvas"></canvas>
  <div class="page-num-label">หน้า 1</div>
</div>
```

### Thumbnail Item
```html
<div class="thumb-item active" data-page="1">
  <canvas class="thumb-canvas"></canvas>
  <div class="thumb-num">1</div>
</div>
```

## Dependencies

- **PDF.js 4.2.67**: จาก CDN (cdnjs.cloudflare.com)
- **Worker**: pdf.worker.min.mjs สำหรับ PDF processing
- **Browser APIs**: Intersection Observer, Canvas API

## Features

✅ **Lazy Loading**: โหลดหน้าเมื่อต้องการ  
✅ **Thumbnail Navigation**: Sidebar พร้อม thumbnails  
✅ **Zoom Controls**: Multiple zoom levels + fit-to-width  
✅ **Keyboard Navigation**: Enter key สำหรับ page input  
✅ **Smooth Scrolling**: Animation เมื่อเปลี่ยนหน้า  
✅ **Responsive Design**: รองรับหลายขนาดหน้าจอ  
✅ **Loading States**: Spinners และ placeholders  
✅ **Memory Efficient**: ไม่โหลดทุกหน้าพร้อมกัน  

## Usage Example

```javascript
const viewer = new PdfViewer({
  viewerBody: document.getElementById('viewer'),
  pageInput: document.getElementById('pageInput'),
  totalPagesEl: document.getElementById('totalPages'),
  zoomSelect: document.getElementById('zoomSelect'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnSidebarToggle: document.getElementById('btnSidebarToggle'),
  allowFit: true,
  defaultScale: '1.25'
});

await viewer.load('/path/to/document.pdf');
```

## ข้อสังเกต (Notes)

- ใช้ ES6 modules syntax
- Thai language สำหรับ UI text
- รองรับ large PDF files ด้วย lazy loading
- Performance optimized สำหรับ web usage
- ไม่มี server-side dependencies
