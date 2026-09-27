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

let downloadsCap = null;
claude.use('downloads').then(c => { downloadsCap = c; if (!c) document.getElementById('exportBtn').style.display = 'none'; });

function toCsv(list) {
    const headers = ['PDV', 'Dias pendientes', 'Dias revisados', 'Pendientes', '% Pendiente', 'Estado'];
    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(',')];
    list.forEach(r => {
        lines.push([r.pdv, r.diasPendientes, r.revisados, r.pendientes, r.pct.toFixed(1) + '%', r.estado].map(escape).join(','));
    });
    return lines.join('\r\n');
}

document.getElementById('exportBtn').addEventListener('click', async () => {
    const errEl = document.getElementById('exportErr');
    errEl.textContent = '';
    if (!rows.length) { errEl.textContent = 'Primero carga un CSV.'; return; }
    if (!downloadsCap) { errEl.textContent = 'La exportación no está disponible en esta vista.'; return; }
    const csv = toCsv(process());
    try {
        await downloadsCap.save({ filename: 'reporte_cierres_pendientes.csv', data: csv });
    } catch (e) {
        if (e && e.code === 'declined') return;
        errEl.textContent = 'No se pudo exportar el archivo.';
    }
});

setupDrop();