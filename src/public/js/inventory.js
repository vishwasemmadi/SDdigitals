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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; gap: 8px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
            <span class="equip-rate" style="margin: 0;">${formatCurrency(equip.rental_rate)}/day</span>
            <button class="btn btn-primary book-btn" style="padding: 6px 12px; font-size: 0.8rem; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 4px;" ${equip.status !== 'Available' ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Book
            </button>
          </div>
        </div>
      `;

      card.querySelector('.delete-btn').addEventListener('click', (event) => {
        deleteEquipment(event, equip.id, equip.name);
      });

      if (equip.status === 'Available') {
        card.querySelector('.book-btn').addEventListener('click', () => {
          openBookModal(equip.id, equip.name);
        });
      }

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

// -------------------------------------------------------------
// Booking Modal Actions & Submission
// -------------------------------------------------------------
async function openBookModal(equipId, equipName) {
  document.getElementById('book-form').reset();
  
  document.getElementById('book-equip-id').value = equipId;
  document.getElementById('book-equip-name').value = equipName;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  document.getElementById('book-date').value = today;
  document.getElementById('book-return-date').value = tomorrowStr;

  await Promise.all([
    loadBookCustomersDropdown(),
    loadBookProjectsDropdown()
  ]);

  document.getElementById('book-modal').classList.add('open');
}

function closeBookModal() {
  document.getElementById('book-modal').classList.remove('open');
}

async function loadBookCustomersDropdown() {
  try {
    const res = await fetch(`${API_BASE}/api/customers`);
    if (!res.ok) throw new Error('Failed to load customers');
    const customers = await res.json();

    const select = document.getElementById('book-customer');
    select.innerHTML = '<option value="">Select customer...</option>';

    customers.forEach(cust => {
      const option = document.createElement('option');
      option.value = cust.id;
      option.textContent = `${cust.name} (${cust.type})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading customers dropdown:', err);
  }
}

async function loadBookProjectsDropdown() {
  try {
    const res = await fetch(`${API_BASE}/api/projects`);
    if (!res.ok) throw new Error('Failed to load projects');
    const projects = await res.json();

    const select = document.getElementById('book-project');
    select.innerHTML = '<option value="">None / Direct Rental</option>';

    projects.forEach(proj => {
      const option = document.createElement('option');
      option.value = proj.id;
      option.textContent = `${proj.title} (Client: ${proj.customer_name})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading projects dropdown:', err);
  }
}

async function saveBooking(event) {
  event.preventDefault();

  const equipId = parseInt(document.getElementById('book-equip-id').value);
  const customerId = document.getElementById('book-customer').value;
  const projectId = document.getElementById('book-project').value;
  const rentalDate = document.getElementById('book-date').value;
  const expectedReturnDate = document.getElementById('book-return-date').value;
  const status = document.getElementById('book-status').value;
  const discount = parseFloat(document.getElementById('book-discount').value) || 0.00;

  if (!customerId || !rentalDate || !expectedReturnDate) {
    showNotification('Please fill in customer and dates.', 'error');
    return;
  }

  const items = [{
    equipment_id: equipId,
    quantity: 1
  }];

  try {
    const res = await fetch(`${API_BASE}/api/rentals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: parseInt(customerId),
        project_id: projectId ? parseInt(projectId) : null,
        rental_date: rentalDate,
        expected_return_date: expectedReturnDate,
        status: status,
        discount: discount,
        items: items
      })
    });

    if (res.ok) {
      showNotification('Equipment booked successfully!', 'success');
      closeBookModal();
      loadInventory(); // Refresh equipment status on grid
    } else {
      const err = await res.json();
      showNotification(err.error || 'Failed to create booking.', 'error');
    }
  } catch (err) {
    console.error('Error creating booking:', err);
    showNotification('Network error.', 'error');
  }
}

