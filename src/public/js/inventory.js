// Inventory Controller for SD Digitals Rental CRM

let allEquipment = [];
let selectedCategory = 'All';

document.addEventListener('DOMContentLoaded', () => {
  highlightNav('nav-inventory');
  loadInventory();
});

async function loadInventory() {
  try {
    const res = await fetch(`${API_BASE}/api/equipment`);
    if (!res.ok) throw new Error('Failed to load equipment');
    allEquipment = await res.json();
    renderInventory();
  } catch (err) {
    console.error('Error loading inventory:', err);
    document.getElementById('inventory-grid-container').innerHTML = `
      <div style="text-align: center; color: var(--accent-danger); padding: 40px; grid-column: 1 / -1;">
        Failed to read equipment database.
      </div>
    `;
  }
}

function renderInventory() {
  const container = document.getElementById('inventory-grid-container');
  container.innerHTML = '';

  const filtered = selectedCategory === 'All'
    ? allEquipment
    : allEquipment.filter(e => e.category === selectedCategory);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px; grid-column: 1 / -1;">
        No equipment items found in category "${selectedCategory}".
      </div>
    `;
    return;
  }

  // Group by company
  const grouped = filtered.reduce((acc, equip) => {
    const comp = equip.company || 'Other';
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(equip);
    return acc;
  }, {});

  // Sort companies alphabetically
  const sortedCompanies = Object.keys(grouped).sort();

  sortedCompanies.forEach(company => {
    const items = grouped[company];

    // Add company header
    const sectionTitle = document.createElement('h3');
    sectionTitle.style.width = '100%';
    sectionTitle.style.gridColumn = '1 / -1';
    sectionTitle.style.marginTop = '20px';
    sectionTitle.style.marginBottom = '10px';
    sectionTitle.style.borderBottom = '1px solid var(--border-color)';
    sectionTitle.style.paddingBottom = '8px';
    sectionTitle.style.color = 'var(--text-color)';
    sectionTitle.textContent = company;
    container.appendChild(sectionTitle);

    items.forEach(equip => {
      const imgUrl = equip.image_url || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop';
      const statusBadgeClass = equip.status === 'Available' ? 'badge-returned' : (equip.status === 'Rented' ? 'badge-booked' : 'badge-overdue');

      const card = document.createElement('div');
      card.className = 'inventory-card';
      card.innerHTML = `
        <div class="equip-image" style="background-image: url('${imgUrl}');">
          <span class="equip-category-tag">${equip.category}</span>
          <span class="equip-status-indicator badge ${statusBadgeClass}">${equip.status}</span>
        </div>
        <div class="inventory-body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
            <h4 class="equip-name" style="margin: 0;">${equip.name}</h4>
            <button class="btn btn-secondary btn-icon delete-btn" style="padding: 4px; border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: #fca5a5; cursor: pointer; border-radius: 6px;" title="Delete Equipment">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
          <span class="equip-serial">Serial: ${equip.serial_number}</span>
          <span class="equip-rate" style="margin-top: auto;">${formatCurrency(equip.rental_rate)}/day</span>
        </div>
      `;

      card.querySelector('.delete-btn').addEventListener('click', (event) => {
        deleteEquipment(event, equip.id, equip.name);
      });

      container.appendChild(card);
    });
  });
}

function filterCategory(category) {
  selectedCategory = category;
  renderInventory();
}

// Modal actions
function openAddEquipModal() {
  document.getElementById('equip-form').reset();
  document.getElementById('equip-modal').classList.add('open');
}

function closeAddEquipModal() {
  document.getElementById('equip-modal').classList.remove('open');
}

async function saveEquipment(event) {
  event.preventDefault();

  const name = document.getElementById('eq-name').value;
  const category = document.getElementById('eq-category').value;
  const company = document.getElementById('eq-company') ? document.getElementById('eq-company').value : '';
  const serial_number = document.getElementById('eq-serial').value;
  const rental_rate = parseFloat(document.getElementById('eq-rate').value);
  const status = document.getElementById('eq-status').value;
  const image_url = document.getElementById('eq-image').value;

  try {
    const res = await fetch(`${API_BASE}/api/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, company, serial_number, rental_rate, status, image_url })
    });

    if (res.ok) {
      showNotification('Equipment successfully registered into pool.', 'success');
      closeAddEquipModal();
      loadInventory(); // Refresh list
    } else {
      const err = await res.json();
      showNotification(err.error || 'Failed to register equipment.', 'error');
    }
  } catch (err) {
    console.error('Error saving equipment:', err);
    showNotification('Network error.', 'error');
  }
}

async function deleteEquipment(event, id, name) {
  event.stopPropagation();
  if (!confirm(`Are you sure you want to remove "${name}" from the inventory pool?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/equipment/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showNotification('Equipment successfully removed from pool.', 'success');
      loadInventory();
    } else {
      const err = await res.json();
      showNotification(err.error || 'Failed to remove equipment.', 'error');
    }
  } catch (err) {
    console.error('Error removing equipment:', err);
    showNotification('Network error.', 'error');
  }
}
