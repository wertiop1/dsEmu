async function loadTrainerMap(dataPath) {
  const res = await fetch(dataPath);
  const data = await res.json();
  const splitSelect = document.getElementById('split-select');
  const mapContainer = document.getElementById('trainer-map');

  if (!data || !Array.isArray(data.splits)) {
    mapContainer.innerHTML = '<div class="trainer-empty">Invalid trainer split data.</div>';
    return;
  }

  data.splits.forEach((split) => {
    const option = document.createElement('option');
    option.value = split.id;
    option.textContent = split.name;
    splitSelect.appendChild(option);
  });

  const render = () => {
    const selected = splitSelect.value || (data.splits[0] && data.splits[0].id);
    const split = data.splits.find((s) => s.id === selected) || data.splits[0];
    renderSplit(mapContainer, split);
  };

  splitSelect.addEventListener('change', render);
  render();
}

function renderSplit(container, split) {
  container.innerHTML = '';
  if (!split) {
    container.innerHTML = '<div class="trainer-empty">No split data.</div>';
    return;
  }

  if (split.description) {
    const desc = document.createElement('div');
    desc.className = 'trainer-empty';
    desc.textContent = split.description;
    container.appendChild(desc);
  }

  if (!split.sections || !split.sections.length) {
    const empty = document.createElement('div');
    empty.className = 'trainer-empty';
    empty.textContent = 'No trainers listed for this split yet.';
    container.appendChild(empty);
    return;
  }

  split.sections.forEach((section) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'trainer-section';

    const header = document.createElement('div');
    header.className = 'trainer-section-header';
    header.textContent = section.title || 'Section';
    wrapper.appendChild(header);

    if (!section.trainers || !section.trainers.length) {
      const empty = document.createElement('div');
      empty.className = 'trainer-empty';
      empty.textContent = 'No trainers in this section yet.';
      wrapper.appendChild(empty);
      container.appendChild(wrapper);
      return;
    }

    const table = document.createElement('table');
    table.className = 'trainer-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Trainer</th>
          <th>Location</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    section.trainers.forEach((trainer) => {
      const tr = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.textContent = trainer.name || '—';
      const locationCell = document.createElement('td');
      locationCell.textContent = trainer.location || '—';
      const notesCell = document.createElement('td');
      notesCell.textContent = trainer.notes || '—';
      tr.appendChild(nameCell);
      tr.appendChild(locationCell);
      tr.appendChild(notesCell);
      tbody.appendChild(tr);
    });
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  });
}
