async function loadEncounters({ encountersCsvPath, statsCsvPath }) {
  const [encountersText, statsText] = await Promise.all([
    fetch(encountersCsvPath).then((res) => res.text()),
    fetch(statsCsvPath).then((res) => res.text())
  ]);

  const encountersRows = encountersText.trim().split('\n').map((row) => row.split(','));
  const statsRows = statsText.trim().split('\n').map((row) => row.split(','));

  const nameToId = buildNameToIdMap(statsRows);
  const locations = getLocations(encountersRows[0]);

  const locationSelect = document.getElementById('location-select');
  const searchInput = document.getElementById('encounter-search');
  const listContainer = document.getElementById('encounters-list');

  locations.forEach((loc) => {
    const option = document.createElement('option');
    option.value = loc.name;
    option.textContent = loc.name;
    locationSelect.appendChild(option);
  });

  const render = () => {
    const selected = locationSelect.value;
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      const grouped = locations
        .map((loc) => ({
          name: loc.name,
          sections: buildSections(encountersRows, loc, nameToId, query)
        }))
        .filter((group) => group.sections.length);
      renderGroupedSections(listContainer, grouped, query);
    } else {
      const loc = locations.find((l) => l.name === selected) || locations[0];
      const sections = buildSections(encountersRows, loc, nameToId, query);
      renderSections(listContainer, sections, query);
    }
  };

  locationSelect.addEventListener('change', render);
  searchInput.addEventListener('input', render);
  render();
}

function buildNameToIdMap(statsRows) {
  const header = statsRows[0].map((cell) => cell.trim().toLowerCase());
  const nameIndex = header.indexOf('name');
  const idIndex = header.indexOf('id number');
  const map = new Map();
  for (let i = 1; i < statsRows.length; i++) {
    const row = statsRows[i];
    const name = row[nameIndex];
    const id = row[idIndex];
    if (!name || !id) continue;
    const numericId = Number.parseInt(id, 10);
    if (!Number.isFinite(numericId) || numericId === 0) continue;
    map.set(normalizeName(name), String(numericId));
  }
  return map;
}

function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ');
}

function getLocations(headerRow) {
  const locations = [];
  headerRow.forEach((cell, index) => {
    const name = cell.trim();
    if (name) locations.push({ name, start: index, end: headerRow.length });
  });
  for (let i = 0; i < locations.length - 1; i++) {
    locations[i].end = locations[i + 1].start;
  }
  return locations;
}

function isSectionLabel(label) {
  if (!label) return false;
  const trimmed = label.trim();
  return trimmed && !/^\d+$/.test(trimmed);
}

function buildSections(rows, location, nameToId, query) {
  const sections = [];
  let current = null;
  const iconBase = 'https://play.pokemonshowdown.com/sprites/gen5icons';

  const startRow = rows.findIndex((row, idx) => idx > 0 && isSectionLabel(row[0]));

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (isSectionLabel(row[0])) {
      current = { label: row[0].trim(), entries: [] };
      sections.push(current);
    }
    if (!current) continue;
    const slice = row.slice(location.start, location.end);
    for (let c = 0; c < slice.length; c += 4) {
      const rate = (slice[c] || '').trim();
      const species = (slice[c + 1] || '').trim();
      const level = (slice[c + 2] || '').trim();
      const flag = (slice[c + 3] || '').trim();
      if (!rate && !species && !level && !flag) continue;
      if (species === '-----') continue;

      const rateLike = /%/.test(rate) || /gift/i.test(rate) || rate === '-----';
      const levelLike = /^\d+(-\d+)?$/.test(level);
      if (!rateLike && !(rate === '' && levelLike)) continue;

      let note = '';
      let displayRate = rate;
      if (/gift/i.test(rate)) {
        note = rate;
        displayRate = '';
      }
      if (flag && flag.toLowerCase() !== 'false') {
        note = note ? `${note} • ${flag}` : flag;
      }

      const normalized = normalizeName(species);
      const id = nameToId.get(normalized);
      const icon = id ? `${iconBase}/${id}.png` : '';

      const matches =
        !query ||
        species.toLowerCase().includes(query) ||
        displayRate.toLowerCase().includes(query) ||
        note.toLowerCase().includes(query);

      if (!matches) continue;
      if (!species && !note) continue;

      current.entries.push({
        rate: displayRate,
        species,
        level,
        note,
        icon
      });
    }
  }

  return sections.filter((section) => section.entries.length);
}

function renderSections(container, sections, query) {
  container.innerHTML = '';
  if (!sections.length) {
    const empty = document.createElement('div');
    empty.className = 'encounter-empty';
    empty.textContent = query ? 'No matches for that search.' : 'No encounters found.';
    container.appendChild(empty);
    return;
  }

  appendSections(container, sections, { showLocation: false, locationName: '' });
}

function appendSections(container, sections, { showLocation, locationName }) {
  sections.forEach((section) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'encounter-section';

    const header = document.createElement('div');
    header.className = 'encounter-section-header';
    header.textContent = section.label;
    wrapper.appendChild(header);

    const table = document.createElement('table');
    table.className = 'encounter-table';
    table.innerHTML = `
      <thead>
        <tr>
          ${showLocation ? '<th>Location</th>' : ''}
          <th>Rate</th>
          <th>Pokémon</th>
          <th>Level</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    section.entries.forEach((entry) => {
      const tr = document.createElement('tr');
      if (showLocation) {
        const locationCell = document.createElement('td');
        locationCell.textContent = locationName || '—';
        tr.appendChild(locationCell);
      }

      const rateCell = document.createElement('td');
      rateCell.innerHTML = entry.rate || '—';

      const pokemonCell = document.createElement('td');
      if (entry.icon) {
        const wrap = document.createElement('span');
        wrap.className = 'pk-name-cell';
        const img = document.createElement('img');
        img.className = 'pk-icon';
        img.src = entry.icon;
        img.alt = entry.species;
        img.loading = 'lazy';
        const text = document.createElement('span');
        text.textContent = entry.species || '—';
        wrap.appendChild(img);
        wrap.appendChild(text);
        pokemonCell.appendChild(wrap);
      } else {
        pokemonCell.textContent = entry.species || '—';
      }

      const levelCell = document.createElement('td');
      levelCell.textContent = entry.level || '—';

      const noteCell = document.createElement('td');
      noteCell.textContent = entry.note || '—';

      tr.appendChild(rateCell);
      tr.appendChild(pokemonCell);
      tr.appendChild(levelCell);
      tr.appendChild(noteCell);
      tbody.appendChild(tr);
    });

    wrapper.appendChild(table);
    container.appendChild(wrapper);
  });
}

function renderGroupedSections(container, grouped, query) {
  container.innerHTML = '';
  if (!grouped.length) {
    const empty = document.createElement('div');
    empty.className = 'encounter-empty';
    empty.textContent = query ? 'No matches for that search.' : 'No encounters found.';
    container.appendChild(empty);
    return;
  }

  grouped.forEach((group) => {
    const header = document.createElement('div');
    header.className = 'location-header';
    header.textContent = group.name;
    container.appendChild(header);
    appendSections(container, group.sections, { showLocation: true, locationName: group.name });
  });
}
