async function fetchAndDisplayCSV(csvPath) {
  const response = await fetch(csvPath);
  const text = await response.text();
  const rows = text.trim().split('\n').map(row => row.split(','));
  const table = document.getElementById('csv-table');
  table.innerHTML = '';
  const headerCells = rows[0].map(cell => cell.trim());
  const nameIndex = headerCells.findIndex(cell => cell.toLowerCase() === 'name');
  const idIndex = headerCells.findIndex(cell => cell.toLowerCase() === 'id number');
  const excludedColumns = new Set(
    headerCells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.toLowerCase() === 'do not touch')
      .map(({ index }) => index)
  );

  const iconBaseUrl = 'https://play.pokemonshowdown.com/sprites/gen5icons';
  // Add header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  rows[0].forEach((cell, cellIndex) => {
    if (excludedColumns.has(cellIndex)) return;
    const th = document.createElement('th');
    th.textContent = cell;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  // Add body
  const tbody = document.createElement('tbody');
  rows.slice(1).forEach(row => {
    const idValue = idIndex >= 0 ? row[idIndex] : null;
    const numericId = idValue ? Number.parseInt(idValue, 10) : NaN;
    if (Number.isFinite(numericId) && numericId === 0) return;
    const tr = document.createElement('tr');
    row.forEach((cell, cellIndex) => {
      if (excludedColumns.has(cellIndex)) return;
      const td = document.createElement('td');
      if (nameIndex >= 0 && idIndex >= 0 && cellIndex === nameIndex) {
        const nameWrap = document.createElement('span');
        nameWrap.className = 'pk-name-cell';
        const spriteId = Number.isFinite(numericId) ? String(numericId) : '0';
        const icon = document.createElement('img');
        icon.className = 'pk-icon';
        icon.alt = cell;
        icon.loading = 'lazy';
        icon.dataset.pkId = spriteId;
        icon.src = `${iconBaseUrl}/${spriteId}.png`;
        const nameText = document.createElement('span');
        nameText.textContent = cell;
        nameWrap.appendChild(icon);
        nameWrap.appendChild(nameText);
        td.appendChild(nameWrap);
      } else {
        td.textContent = cell;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // Search functionality
  document.getElementById('search').addEventListener('input', function() {
    const filter = this.value.toLowerCase();
    Array.from(tbody.rows).forEach(tr => {
      tr.style.display = Array.from(tr.cells).some(td => td.textContent.toLowerCase().includes(filter)) ? '' : 'none';
    });
  });

}
