let rows = [];

function setupDrop() {
    const drop = document.getElementById('drop');
    const input = document.getElementById('file');
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
    ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
}

function handleFile(file) {
    document.getElementById('err').textContent = '';
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: res => {
            const needed = ['fecha', 'pdv', 'estado'];
            const cols = res.meta.fields || [];
            if (!needed.every(c => cols.includes(c))) {
                document.getElementById('err').textContent = 'El CSV debe incluir las columnas: fecha, pdv, estado.';
                return;
            }
            rows = res.data;
            render();
        },
        error: err => { document.getElementById('err').textContent = 'No se pudo leer el archivo: ' + err.message; }
    });
}

function process() {
    const byPdv = {};
    rows.forEach(r => {
        const pdv = (r.pdv || '').trim();
        const fecha = (r.fecha || '').trim();
        if (!pdv || !fecha) return;
        const day = fecha.slice(0, 10);
        if (!byPdv[pdv]) byPdv[pdv] = { days: new Set(), pendingDays: new Set() };
        byPdv[pdv].days.add(day);
        if ((r.estado || '').trim().toLowerCase() === 'pending') byPdv[pdv].pendingDays.add(day);
    });
    const thYellow = parseInt(document.getElementById('thYellow').value);
    const thRed = parseInt(document.getElementById('thRed').value);
    const list = Object.entries(byPdv).map(([pdv, d]) => {
        const revisados = d.days.size;
        const pendDays = Array.from(d.pendingDays).sort();
        const pendientes = pendDays.length;
        const pct = revisados ? (pendientes / revisados * 100) : 0;
        let estado = 'green';
        if (pendientes >= thRed) estado = 'red'; else if (pendientes >= thYellow) estado = 'yellow';
        return { pdv, diasPendientes: pendDays.map(d => d.slice(8, 10)).join(', ') || '—', revisados, pendientes, pct, estado };
    });
    list.sort((a, b) => b.pendientes - a.pendientes || a.pdv.localeCompare(b.pdv));
    return list;
}

function render() {
    const list = process();
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = list.map(r => `
    <tr>
      <td class="pdv">${r.pdv}</td>
      <td>${r.diasPendientes}</td>
      <td>${r.revisados}</td>
      <td>${r.pendientes}</td>
      <td>${r.pct.toFixed(1)}%</td>
      <td><span class="dot ${r.estado}"></span></td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">Sin datos</td></tr>';
    document.getElementById('resultCard').style.display = 'block';
}

document.getElementById('thYellow').addEventListener('change', () => { if (rows.length) render(); });
document.getElementById('thRed').addEventListener('change', () => { if (rows.length) render(); });

function toCsv(list) {
    const headers = ['PDV', 'Dias pendientes', 'Dias revisados', 'Pendientes', '% Pendiente', 'Estado'];
    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(',')];
    list.forEach(r => {
        lines.push([r.pdv, r.diasPendientes, r.revisados, r.pendientes, r.pct.toFixed(1) + '%', r.estado].map(escape).join(','));
    });
    return lines.join('\r\n');
}

// Descarga estándar de navegador: funciona en GitHub Pages, localhost, etc.
function downloadCsv(filename, csvText) {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById('exportBtn').addEventListener('click', () => {
    const errEl = document.getElementById('exportErr');
    errEl.textContent = '';
    if (!rows.length) { errEl.textContent = 'Primero carga un CSV.'; return; }
    try {
        downloadCsv('reporte_cierres_var.csv', toCsv(process()));
    } catch (e) {
        errEl.textContent = 'No se pudo exportar el archivo.';
    }
});

//===================================================================================

// ---- Exportar como imagen (compacta, tipo tabla de hoja de cálculo) ----
function toImageCanvas(list) {
    const headers = ['PDV', 'Dias pendientes', 'Dias revisados', 'Pendientes', '% Pendiente', 'Estado'];
    const dotColors = { red: '#e0455a', yellow: '#f2b90c', green: '#2fb673' };
    const fontFamily = 'Arial, Helvetica, sans-serif';
    const normal = `14px ${fontFamily}`;
    const bold = `bold 14px ${fontFamily}`;
    const rowH = 30, padX = 12, scale = 2;

    const data = list.map(r => [
        r.pdv, r.diasPendientes, String(r.revisados), String(r.pendientes),
        r.pct.toFixed(1).replace('.', ',') + '%', ''
    ]);

    // Medir anchos de columna según el contenido
    const m = document.createElement('canvas').getContext('2d');
    const widths = headers.map((h, i) => {
        m.font = bold;
        let w = m.measureText(h).width;
        m.font = i === 0 ? bold : normal;
        data.forEach(row => { w = Math.max(w, m.measureText(row[i]).width); });
        return Math.ceil(w + padX * 2);
    });
    widths[5] = Math.max(widths[5], 70);

    const width = widths.reduce((a, b) => a + b, 0);
    const height = rowH * (data.length + 1);

    const canvas = document.createElement('canvas');
    canvas.width = (width + 2) * scale;
    canvas.height = (height + 2) * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(1, 1);

    // Fondo siempre blanco (aunque la página esté en modo oscuro)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -1, width + 2, height + 2);

    // Líneas de la cuadrícula
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    for (let r = 1; r <= data.length; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * rowH); ctx.lineTo(width, r * rowH); ctx.stroke();
    }
    let x = 0;
    for (let c = 0; c < widths.length - 1; c++) {
        x += widths[c];
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }

    // Texto y puntos
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    const drawRow = (cells, y, isHeader, estado) => {
        let cx = 0;
        cells.forEach((text, i) => {
            const cy = y + rowH / 2;
            if (i === 5 && !isHeader) {
                ctx.fillStyle = dotColors[estado];
                ctx.beginPath(); ctx.arc(cx + widths[i] / 2, cy, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000000';
            } else {
                ctx.font = (isHeader || i === 0) ? bold : normal;
                if (i === 0) { ctx.textAlign = 'left'; ctx.fillText(text, cx + padX, cy); }
                else { ctx.textAlign = 'center'; ctx.fillText(text, cx + widths[i] / 2, cy); }
            }
            cx += widths[i];
        });
    };
    drawRow(headers, 0, true);
    data.forEach((row, i) => drawRow(row, (i + 1) * rowH, false, list[i].estado));

    // Borde exterior y línea bajo el encabezado
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, rowH); ctx.lineTo(width, rowH); ctx.stroke();

    return canvas;
}

document.getElementById('exportImgBtn').addEventListener('click', () => {
    const errEl = document.getElementById('exportErr');
    errEl.textContent = '';
    if (!rows.length) { errEl.textContent = 'Primero carga un CSV.'; return; }
    try {
        const list = process();
        if (!list.length) { errEl.textContent = 'No hay datos para exportar.'; return; }
        toImageCanvas(list).toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'reporte_cierres_var.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    } catch (e) {
        errEl.textContent = 'No se pudo exportar la imagen.';
    }
});

setupDrop();
