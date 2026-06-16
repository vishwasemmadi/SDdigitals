// Rentals Controller for SD Digitals Rental CRM

let equipmentInventory = [];

document.addEventListener('DOMContentLoaded', () => {
  highlightNav('nav-rentals');

  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const preCustomerId = urlParams.get('customerId');

  if (action === 'new') {
    switchToNewRentalForm(preCustomerId);
  } else {
    loadRentalsList();
  }
});

// -------------------------------------------------------------
// 1. Registry List View
// -------------------------------------------------------------
async function loadRentalsList() {
  try {
    const res = await fetch(`${API_BASE}/api/rentals`);
    if (!res.ok) throw new Error('Failed to load rentals');
    const rentals = await res.json();

    const tbody = document.getElementById('rentals-tbody');
    tbody.innerHTML = '';

    if (rentals.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px;">
            No equipment rentals registered. Click "New Rental Booking" to create.
          </td>
        </tr>
      `;
      return;
    }

    rentals.forEach(rental => {
      const itemsText = rental.items.map(i => `${i.quantity}x ${i.equipment_name}`).join('<br>');
      const durationText = getDurationDays(rental.rental_date, rental.expected_return_date);
      
      const deleteBtnHtml = `
        <button class="btn btn-secondary btn-icon delete-rental-btn" 
                style="padding: 6px; border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: #fca5a5; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;" 
                onclick="deleteRental(event, ${rental.id})" 
                title="Delete Rental Booking">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;

      let statusHtml = '';
      if (rental.status === 'Returned' || rental.status === 'Cancelled') {
        statusHtml = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-${getStatusClass(rental.status)}" style="flex-shrink: 0;">${rental.status}</span>
            ${deleteBtnHtml}
          </div>
        `;
      } else {
        let optionsHtml = '';
        if (rental.status === 'Inquiry') {
          optionsHtml = `
            <option value="Inquiry" selected>Inquiry</option>
            <option value="Quote Sent">Quote Sent</option>
            <option value="Booked">Booked</option>
            <option value="Cancelled">Cancelled</option>
          `;
        } else if (rental.status === 'Quote Sent') {
          optionsHtml = `
            <option value="Quote Sent" selected>Quote Sent</option>
            <option value="Booked">Booked</option>
            <option value="Cancelled">Cancelled</option>
          `;
        } else if (rental.status === 'Booked') {
          optionsHtml = `
            <option value="Booked" selected>Booked</option>
            <option value="Out for Rental">Out for Rental</option>
            <option value="Cancelled">Cancelled</option>
          `;
        } else if (rental.status === 'Out for Rental') {
          optionsHtml = `
            <option value="Out for Rental" selected>Out for Rental</option>
            <option value="Returned">Returned</option>
            <option value="Overdue">Overdue</option>
          `;
        } else if (rental.status === 'Overdue') {
          optionsHtml = `
            <option value="Overdue" selected>Overdue</option>
            <option value="Returned">Returned</option>
          `;
        } else {
          optionsHtml = `<option value="${rental.status}" selected>${rental.status}</option>`;
        }

        statusHtml = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <select class="badge badge-${getStatusClass(rental.status)}" 
                    style="flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; outline: none; font-family: inherit; -webkit-appearance: none; -moz-appearance: none; appearance: none; padding: 6px 24px 6px 12px; background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>'); background-repeat: no-repeat; background-position: right 8px center; background-size: 10px;" 
                    onchange="changeRentalStatus(${rental.id}, this.value)">
              ${optionsHtml}
            </select>
            ${deleteBtnHtml}
          </div>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-family: monospace; font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">
            #${String(rental.id).padStart(4, '0')}
          </div>
          <a href="customers.html?id=${rental.customer_id}" style="color: #fff; font-weight: 600; text-decoration: none;">
            ${rental.customer_name}
          </a>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
            Project: ${rental.project_title || 'Direct Rental'}
          </div>
        </td>
        <td>
          <span style="font-size: 0.85rem; font-weight: 500;">${formatDate(rental.rental_date)}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">to ${formatDate(rental.expected_return_date)} (${durationText} days)</div>
        </td>
        <td style="font-size: 0.82rem; line-height: 1.4; font-weight: 500;">
          ${itemsText}
        </td>
        <td>
          <span style="font-weight: 700;">${formatCurrency(rental.cost_estimate)}</span>
          <div style="font-size: 0.72rem; margin-top: 4px;">
            <span class="badge ${rental.invoice_status === 'Paid' ? 'badge-returned' : 'badge-booked'}" style="padding: 2px 8px; font-size: 0.65rem; border-radius: 4px;">
              Invoice ${rental.invoice_status || 'Draft'}
            </span>
          </div>
        </td>
        <td style="font-size: 0.82rem; font-weight: 600;">
          <span style="color: ${rental.delivery_status === 'Returned' ? 'var(--accent-success)' : (rental.delivery_status === 'Delivered' ? '#a78bfa' : 'var(--text-secondary)')};">
            ${rental.delivery_status || 'Pending'}
          </span>
        </td>
        <td>
          ${statusHtml}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading rentals registry:', err);
    showNotification('Error loading rentals database.', 'error');
  }
}

async function changeRentalStatus(rentalId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/api/rentals/${rentalId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showNotification(`Rental status updated to ${newStatus}.`, 'success');
      loadRentalsList();
    } else {
      const err = await res.json();
      showNotification(err.error || 'Failed to update rental status.', 'error');
    }
  } catch (err) {
    console.error('Error updating status:', err);
    showNotification('Network error.', 'error');
  }
}

// -------------------------------------------------------------
// 2. Contract Creation Form Page
// -------------------------------------------------------------
async function switchToNewRentalForm(preCustomerId = null) {
  document.getElementById('panel-list').style.display = 'none';
  document.getElementById('panel-new').style.display = 'block';

  // Clear form
  document.getElementById('new-rental-form').reset();
  
  // Set default dates: Today and Tomorrow
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  document.getElementById('rent-date').value = today;
  document.getElementById('rent-return-date').value = tomorrowStr;

  // Load clients, projects, and equipment checklists
  await Promise.all([
    loadCustomersDropdown(preCustomerId),
    loadProjectsDropdown(),
    loadEquipmentChecklist()
  ]);

  calculateLiveEstimate();
}

async function loadCustomersDropdown(preCustomerId = null) {
  try {
    const res = await fetch(`${API_BASE}/api/customers`);
    if (!res.ok) throw new Error('Failed to load customers');
    const customers = await res.json();

    const select = document.getElementById('rent-customer');
    select.innerHTML = '<option value="">Select customer...</option>';

    customers.forEach(cust => {
      const option = document.createElement('option');
      option.value = cust.id;
      option.textContent = `${cust.name} (${cust.type})`;
      if (preCustomerId && String(cust.id) === String(preCustomerId)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading customers dropdown:', err);
  }
}

async function loadProjectsDropdown() {
  try {
    const res = await fetch(`${API_BASE}/api/projects`);
    if (!res.ok) throw new Error('Failed to load projects');
    const projects = await res.json();

    const select = document.getElementById('rent-project');
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

async function loadEquipmentChecklist() {
  try {
    const res = await fetch(`${API_BASE}/api/equipment`);
    if (!res.ok) throw new Error('Failed to load equipment list');
    equipmentInventory = await res.json();

    const container = document.getElementById('inventory-checklist-container');
    container.innerHTML = '';

    if (equipmentInventory.length === 0) {
      container.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">No equipment in database.</div>';
      return;
    }

    equipmentInventory.forEach(equip => {
      const item = document.createElement('label');
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.padding = '8px';
      item.style.borderRadius = '6px';
      item.style.cursor = 'pointer';
      item.style.transition = 'background-color 0.2s';
      item.style.borderBottom = '1px solid rgba(255,255,255,0.02)';

      // Style Rented or Maintenance items with distinct text tags
      const badgeClass = equip.status === 'Available' ? 'badge-returned' : (equip.status === 'Rented' ? 'badge-booked' : 'badge-overdue');
      const statusLabel = `<span class="badge ${badgeClass}" style="padding: 1px 6px; font-size: 0.65rem; margin-left: 6px;">${equip.status}</span>`;

      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" name="equipment_item" value="${equip.id}" data-rate="${equip.rental_rate}" onchange="calculateLiveEstimate()">
          <span style="font-size: 0.85rem; font-weight: 500;">${equip.name} ${statusLabel}</span>
        </div>
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-info);">${formatCurrency(equip.rental_rate)}/day</span>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error('Error loading equipment checklist:', err);
  }
}

// -------------------------------------------------------------
// 3. Estimate Calculator
// -------------------------------------------------------------
function calculateLiveEstimate() {
  const startDateStr = document.getElementById('rent-date').value;
  const returnDateStr = document.getElementById('rent-return-date').value;
  const discountInput = parseFloat(document.getElementById('rent-discount').value) || 0.00;

  const duration = getDurationDays(startDateStr, returnDateStr);
  document.getElementById('est-duration').textContent = `${duration} day${duration !== 1 ? 's' : ''}`;

  let subtotal = 0;
  const checkedBoxes = document.querySelectorAll("input[name='equipment_item']:checked");
  
  checkedBoxes.forEach(box => {
    const rate = parseFloat(box.getAttribute('data-rate')) || 0;
    subtotal += rate * duration;
  });

  const tax = Math.max(0, subtotal - discountInput) * 0.18;
  const grandTotal = Math.max(0, subtotal - discountInput + tax);

  document.getElementById('est-subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('est-discount').textContent = `- ${formatCurrency(discountInput)}`;
  document.getElementById('est-tax').textContent = formatCurrency(tax);
  document.getElementById('est-grand-total').textContent = formatCurrency(grandTotal);
}

// -------------------------------------------------------------
// 4. Booking Submission
// -------------------------------------------------------------
async function submitRental(event) {
  event.preventDefault();

  const customer_id = document.getElementById('rent-customer').value;
  const project_id = document.getElementById('rent-project').value;
  const rental_date = document.getElementById('rent-date').value;
  const expected_return_date = document.getElementById('rent-return-date').value;
  const status = document.getElementById('rent-status').value;
  const discount = parseFloat(document.getElementById('rent-discount').value) || 0.00;

  if (!customer_id || !rental_date || !expected_return_date) {
    showNotification('Please fill in client details and dates.', 'error');
    return;
  }

  const checkedBoxes = document.querySelectorAll("input[name='equipment_item']:checked");
  if (checkedBoxes.length === 0) {
    showNotification('Please select at least one equipment item to rent.', 'error');
    return;
  }

  const items = Array.from(checkedBoxes).map(box => ({
    equipment_id: parseInt(box.value),
    quantity: 1
  }));

  try {
    const res = await fetch(`${API_BASE}/api/rentals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: parseInt(customer_id),
        project_id: project_id ? parseInt(project_id) : null,
        rental_date,
        expected_return_date,
        status,
        discount,
        items
      })
    });

    if (res.ok) {
      showNotification('Equipment rental registered successfully!', 'success');
      // Redirect back to list
      window.location.href = 'rentals.html';
    } else {
      const err = await res.json();
      showNotification(err.error || 'Failed to register rental contract.', 'error');
    }
  } catch (err) {
    console.error('Error submitting rental contract:', err);
    showNotification('Network error.', 'error');
  }
}

// Helper: Calculate days between dates
function getDurationDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = e - s;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1; // Default to 1 day if return is same/before start
}

// Maps statuses to color classes
function getStatusClass(status) {
  switch (status) {
    case 'Inquiry': return 'inquiry';
    case 'Quote Sent': return 'quote';
    case 'Booked': return 'booked';
    case 'Out for Rental': return 'out';
    case 'Returned': return 'returned';
    case 'Overdue': return 'overdue';
    case 'Cancelled': return 'cancel';
    default: return 'inactive';
  }
}

async function deleteRental(event, rentalId) {
  event.stopPropagation();
  if (!confirm(`Are you sure you want to delete Rental Booking #${String(rentalId).padStart(4, '0')}?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/rentals/${rentalId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showNotification('Rental booking deleted successfully.', 'success');
      loadRentalsList();
    } else {
      const err = await res.json();
      showNotification(err.error || 'Failed to delete rental booking.', 'error');
    }
  } catch (err) {
    console.error('Error deleting rental booking:', err);
    showNotification('Network error.', 'error');
  }
}
