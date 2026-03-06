// ============================================================
//  drw·collab – script.js (v5)
//  CROSS-PLATFORM FIX: All coordinates normalized to 0–1 range
//  before broadcast, denormalized on receive. This means a stroke
//  drawn at 80% across a 1920px laptop maps correctly to 80% across
//  a 390px phone screen.
//  Stroke size is normalized against a reference diagonal (1440px).
// ============================================================

const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const cursorDot = document.getElementById('cursor-dot');
const textObjectsLayer = document.getElementById('text-objects-layer');
const colorPicker = document.getElementById('color-picker');
const colorPreview = document.getElementById('color-preview');
const sizeSlider = document.getElementById('size-slider');
const sizeLabel = document.getElementById('size-label');
const clearBtn = document.getElementById('clear-btn');
const saveBtn = document.getElementById('save-btn');
const themeBtn = document.getElementById('theme-btn');
const iconMoon = document.getElementById('icon-moon');
const iconSun = document.getElementById('icon-sun');
const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');

// ─── App State ────────────────────────────────────────────────
let currentTool = 'brush';
let isDrawing = false;
let lastX = 0, lastY = 0;
let currentColor = '#2a85ff';
let currentSize = 5;
let isDarkMode = false;

const LIGHT_BG = '#ffffff';
const DARK_BG = '#16213e';

// Reference diagonal used to normalize stroke sizes so they look
// proportionally consistent across screen sizes.
const REF_DIAG = Math.sqrt(1440 * 1440 + 900 * 900);

function getNormSize(px) {
    const diag = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    return px / diag;
}

function getDenormSize(norm) {
    const diag = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    return norm * diag;
}

// ─── WebSocket Logic ──────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
let room = urlParams.get('room');
if (!room) {
    room = Math.random().toString(36).substring(2, 9);
    window.history.replaceState({}, '', `?room=${room}`);
}

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}/?room=${room}`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleRemoteEvent(data);
};

function broadcast(data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function handleRemoteEvent(data) {
    if (data.type === 'draw') {
        renderRemoteStroke(data);
    } else if (data.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        applyContext();
    } else if (data.type === 'text') {
        handleRemoteText(data);
    } else if (data.type === 'init') {
        // Replay all stored strokes for a new joiner
        if (Array.isArray(data.strokes)) {
            data.strokes.forEach(s => renderRemoteStroke(s));
        }
    }
}

// ─── Theme ───────────────────────────────────────────────────
function applyTheme(dark) {
    isDarkMode = dark;
    document.body.classList.toggle('dark', dark);
    iconMoon.style.display = dark ? 'none' : '';
    iconSun.style.display = dark ? '' : 'none';
}

themeBtn.addEventListener('click', () => applyTheme(!isDarkMode));

// ─── Canvas Sizing ────────────────────────────────────────────
function resizeCanvas() {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.putImageData(img, 0, 0);
    applyContext();
}

function applyContext() {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

// ─── Tool Selection ───────────────────────────────────────────
function setTool(name) {
    currentTool = name;
    toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === name));
    canvas.style.cursor = 'none';
    updateCursorDot();
}

toolBtns.forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

// ─── Color ────────────────────────────────────────────────────
colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
    colorPreview.style.backgroundColor = currentColor;
    updateCursorDot();
    applyContext();
});

// ─── Size ─────────────────────────────────────────────────────
sizeSlider.addEventListener('input', (e) => {
    currentSize = parseInt(e.target.value, 10);
    sizeLabel.textContent = currentSize + 'px';
    updateCursorDot();
    applyContext();
});

// ─── Clear ────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyContext();
    broadcast({ type: 'clear' });
});

// ─── Save ────────────────────────────────────────────────────
saveBtn.addEventListener('click', () => {
    const off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    const offCtx = off.getContext('2d');

    offCtx.fillStyle = isDarkMode ? DARK_BG : LIGHT_BG;
    offCtx.fillRect(0, 0, off.width, off.height);
    offCtx.drawImage(canvas, 0, 0);

    document.querySelectorAll('.text-object').forEach(el => {
        drawTextToCanvas(el, offCtx);
    });

    const a = document.createElement('a');
    a.download = 'drw-collab-' + Date.now() + '.png';
    a.href = off.toDataURL('image/png');
    a.click();
});

// ─── Custom Cursor Dot ────────────────────────────────────────
function updateCursorDot() {
    if (currentTool === 'text') {
        const s = 20;
        cursorDot.style.width = s + 'px';
        cursorDot.style.height = s + 'px';
        cursorDot.style.borderRadius = '4px';
        cursorDot.style.borderColor = currentColor;
        cursorDot.style.boxShadow = `0 0 0 1.5px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.5)`;
        cursorDot.style.background = hexToRgba(currentColor, 0.18);
    } else {
        const s = Math.max(currentSize, 4);
        cursorDot.style.width = s + 'px';
        cursorDot.style.height = s + 'px';
        cursorDot.style.borderRadius = '50%';
        cursorDot.style.borderColor = 'rgba(255,255,255,0.95)';
        cursorDot.style.boxShadow = '0 0 0 1.5px rgba(0,0,0,0.80)';
        cursorDot.style.background = 'transparent';
    }
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

canvas.addEventListener('mouseenter', () => {
    cursorDot.style.display = 'block';
    updateCursorDot();
});
canvas.addEventListener('mouseleave', () => { cursorDot.style.display = 'none'; });
document.addEventListener('mousemove', (e) => {
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
});

// ─── Drawing ─────────────────────────────────────────────────
function getPos(e) {
    const r = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0)
        return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

// Normalise absolute pixel coords → 0–1 fractions
function norm(x, y) {
    return { nx: x / canvas.width, ny: y / canvas.height };
}

// Denormalise 0–1 fractions → pixel coords for THIS screen
function denorm(nx, ny) {
    return { x: nx * canvas.width, y: ny * canvas.height };
}

function startDraw(e) {
    isDrawing = true;
    const { x, y } = getPos(e);
    lastX = x; lastY = y;

    // Render locally with raw pixels
    renderStroke({
        subType: 'start', x, y,
        color: currentTool === 'eraser' ? 'eraser' : currentColor,
        size: currentSize
    });

    // Broadcast normalised
    const { nx, ny } = norm(x, y);
    broadcast({
        type: 'draw', subType: 'start',
        nx, ny,
        nsize: getNormSize(currentSize),
        color: currentTool === 'eraser' ? 'eraser' : currentColor
    });
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);

    // Render locally
    renderStroke({
        subType: 'move', x, y, lastX, lastY,
        color: currentTool === 'eraser' ? 'eraser' : currentColor,
        size: currentSize
    });

    // Broadcast normalised
    const { nx, ny } = norm(x, y);
    const { nx: nlx, ny: nly } = norm(lastX, lastY);
    broadcast({
        type: 'draw', subType: 'move',
        nx, ny, nlx, nly,
        nsize: getNormSize(currentSize),
        color: currentTool === 'eraser' ? 'eraser' : currentColor
    });

    lastX = x; lastY = y;
}

function stopDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    applyContext();
    broadcast({ type: 'draw', subType: 'stop' });
}

// Render stroke using ABSOLUTE pixel values (local or already-denorm'd)
function renderStroke(data) {
    ctx.beginPath();
    if (data.color === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = data.color;
        ctx.fillStyle = data.color;
    }
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (data.subType === 'start') {
        ctx.arc(data.x, data.y, data.size / 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (data.subType === 'move') {
        ctx.moveTo(data.lastX, data.lastY);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
    }
}

// Receive normalised, convert to local pixels, then render
function renderRemoteStroke(data) {
    if (data.subType === 'stop') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        applyContext();
        return;
    }

    // Denormalise to this screen's pixel space
    const { x, y } = denorm(data.nx, data.ny);
    const size = getDenormSize(data.nsize);
    const lastX = data.nlx !== undefined ? denorm(data.nlx, data.nly).x : 0;
    const lastY = data.nly !== undefined ? denorm(data.nlx, data.nly).y : 0;

    renderStroke({ subType: data.subType, x, y, lastX, lastY, color: data.color, size });
}

// ─── TEXT OBJECTS SYSTEM ─────────────────────────────────────
function getTextBg() {
    return isDarkMode ? 'rgba(18,16,42,0.94)' : 'rgba(255,255,255,0.94)';
}

function drawTextToCanvas(el, targetCtx) {
    const textarea = el.querySelector('.text-obj-area');
    const text = textarea.value.trim();
    if (!text) return;

    const fontSize = parseInt(el.dataset.fontSize, 10) || 20;
    const color = el.dataset.color || currentColor;
    const rect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const objLeft = rect.left - canvasRect.left + 12;
    const objTop = rect.top - canvasRect.top + el.querySelector('.text-obj-header').offsetHeight + 10;

    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.font = `500 ${fontSize}px Inter, sans-serif`;
    targetCtx.fillStyle = color;
    targetCtx.textBaseline = 'top';

    const lines = text.split('\n');
    const lineH = fontSize * 1.5;
    lines.forEach((line, i) => targetCtx.fillText(line, objLeft, objTop + i * lineH));
    targetCtx.textBaseline = 'alphabetic';
}

function createTextObject(canvasX, canvasY, id = null, isRemote = false) {
    const objId = id || Math.random().toString(36).substring(2, 9);
    const color = currentColor;
    const fontSize = Math.max(Math.round(currentSize * 2.5), 14);

    const el = document.createElement('div');
    el.className = 'text-object';
    el.id = `text-${objId}`;
    el.dataset.color = color;
    el.dataset.fontSize = fontSize;
    el.style.left = canvasX + 'px';
    el.style.top = canvasY + 'px';
    el.style.setProperty('--tobj-border', color);

    el.innerHTML = `
        <div class="text-obj-header">
            <div class="text-obj-grip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9"  cy="5"  r="1.6"/>
                    <circle cx="15" cy="5"  r="1.6"/>
                    <circle cx="9"  cy="12" r="1.6"/>
                    <circle cx="15" cy="12" r="1.6"/>
                    <circle cx="9"  cy="19" r="1.6"/>
                    <circle cx="15" cy="19" r="1.6"/>
                </svg>
                <span>Text</span>
            </div>
            <div class="text-obj-actions">
                <button class="text-obj-delete" title="Remove (Esc)">✕</button>
            </div>
        </div>
        <textarea class="text-obj-area" rows="1" placeholder="Type here…"></textarea>
    `;

    const textarea = el.querySelector('.text-obj-area');
    textarea.style.fontSize = fontSize + 'px';
    textarea.style.color = color;
    textarea.style.caretColor = color;
    textarea.style.background = getTextBg();

    el.querySelector('.text-obj-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        el.remove();
        broadcast({ type: 'text', subType: 'delete', id: objId });
    });

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            el.remove();
            broadcast({ type: 'text', subType: 'delete', id: objId });
            document.body.focus();
        }
        e.stopPropagation();
    });

    textarea.addEventListener('blur', () => {
        if (textarea.value.trim() === '') {
            el.remove();
            broadcast({ type: 'text', subType: 'delete', id: objId });
        }
    });

    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        broadcast({ type: 'text', subType: 'update', id: objId, content: textarea.value });
    });

    el.addEventListener('mousedown', (e) => e.stopPropagation());
    el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });

    makeDraggable(el, el.querySelector('.text-obj-header'), objId);

    textObjectsLayer.appendChild(el);
    if (!isRemote) {
        setTimeout(() => textarea.focus(), 10);
        // Normalise text object position too
        const { nx, ny } = norm(canvasX, canvasY);
        broadcast({ type: 'text', subType: 'create', id: objId, nx, ny, color, fontSize });
    }
    return el;
}

function handleRemoteText(data) {
    const el = document.getElementById(`text-${data.id}`);
    if (data.subType === 'create') {
        if (!el) {
            // Denormalise position for this screen
            const { x, y } = denorm(data.nx, data.ny);
            createTextObject(x, y, data.id, true);
        }
    } else if (data.subType === 'update') {
        if (el) {
            const area = el.querySelector('.text-obj-area');
            area.value = data.content;
            area.style.height = 'auto';
            area.style.height = area.scrollHeight + 'px';
        }
    } else if (data.subType === 'move') {
        if (el) {
            const { x, y } = denorm(data.nx, data.ny);
            el.style.left = x + 'px';
            el.style.top = y + 'px';
        }
    } else if (data.subType === 'delete') {
        if (el) el.remove();
    }
}

// ─── Drag Logic ───────────────────────────────────────────────
function makeDraggable(el, handle, id) {
    let dragging = false;
    let offX = 0, offY = 0;

    function onDown(e) {
        if (e.target.closest('.text-obj-actions')) return;
        dragging = true;
        const rect = el.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        offX = clientX - rect.left;
        offY = clientY - rect.top;
        el.style.transition = 'none';
        e.preventDefault();
    }

    function onMove(e) {
        if (!dragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const newLeft = clientX - offX;
        const newTop = clientY - offY;
        const x = Math.max(0, Math.min(newLeft, window.innerWidth - el.offsetWidth));
        const y = Math.max(0, Math.min(newTop, window.innerHeight - el.offsetHeight));
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        // Normalise position before broadcast
        const { nx, ny } = norm(x, y);
        broadcast({ type: 'text', subType: 'move', id, nx, ny });
    }

    function onUp() { dragging = false; }

    handle.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    handle.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('touchmove', (e) => { if (dragging) { onMove(e); e.preventDefault(); } }, { passive: false });
    document.addEventListener('touchend', onUp);
}

// ─── Canvas Events ────────────────────────────────────────────
canvas.addEventListener('mousedown', (e) => {
    if (currentTool === 'text') { createTextObject(e.clientX, e.clientY); return; }
    startDraw(e);
});
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseleave', stopDraw);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (currentTool === 'text') { const t = e.touches[0]; createTextObject(t.clientX, t.clientY); return; }
    startDraw(e);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
canvas.addEventListener('touchend', stopDraw);

// ─── Global Keyboard Shortcuts ────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('text-obj-area')) return;
    switch (e.key.toLowerCase()) {
        case 'b': setTool('brush'); break;
        case 'e': setTool('eraser'); break;
        case 't': setTool('text'); break;
    }
});

// ─── Init ─────────────────────────────────────────────────────
window.addEventListener('resize', resizeCanvas);
colorPreview.style.backgroundColor = currentColor;
applyTheme(false);
resizeCanvas();
applyContext();
updateCursorDot();