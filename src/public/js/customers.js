// Customers Directory & Profile Controller for SD Digitals Rental CRM

let currentCustomerId = null;

document.addEventListener('DOMContentLoaded', () => {
  highlightNav('nav-customers');
  
  // Route view based on query param
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('id');
  
  if (customerId) {
    currentCustomerId = customerId;
    document.getElementById('panel-directory').style.display = 'none';
    document.getElementById('panel-profile').style.display = 'block';
    loadCustomerProfile(customerId);
  } else {
    document.getElementById('panel-directory').style.display = 'block';
    document.getElementById('panel-profile').style.display = 'none';
    loadCustomersDirectory();
  }
});

// -------------------------------------------------------------
// 1. Directory Operations
// -------------------------------------------------------------
async function loadCustomersDirectory() {
  try {
    const res = await fetch(`${API_BASE}/api/customers`);
    if (!res.ok) throw new Error('Failed to load customers');
    const customers = await res.json();

    const tbody = document.getElementById('customers-list-tbody');
    tbody.innerHTML = '';

    if (customers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px;">
            No customers registered yet. Click "Add Customer" to start.
          </td>
        </tr>
      `;
      return;
    }

    customers.forEach(cust => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <a href="customers.html?id=${cust.id}" style="color: #fff; font-weight: 600; text-decoration: none;">
            ${cust.name}
          </a>
        </td>
        <td>${cust.type}</td>
        <td>${cust.phone}</td>
        <td>
          <span style="font-weight: 600; color: ${cust.active_rentals_count > 0 ? 'var(--accent-warning)' : 'var(--text-muted)'};">
            ${cust.active_rentals_count}
          </span>
        </td>
        <td>
          <span style="font-weight: 600; color: ${cust.active_projects_count > 0 ? 'var(--accent-info)' : 'var(--text-muted)'};">
            ${cust.active_projects_count}
          </span>
        </td>
        <td>
          <span class="badge badge-${cust.status.toLowerCase()}">${cust.status}</span>
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <a href="customers.html?id=${cust.id}" class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px 12px;">Profile</a>
            <button class="btn btn-secondary btn-icon edit-customer-btn" title="Edit Details">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn btn-secondary btn-icon delete-customer-btn" 
                    style="padding: 6px; border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: #fca5a5; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;" 
                    title="Delete Customer">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.edit-customer-btn').addEventListener('click', () => {
        openEditCustomerModal(cust);
      });

      tr.querySelector('.delete-customer-btn').addEventListener('click', (event) => {
        deleteCustomer(event, cust.id, cust.name);
      });

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading directory:', err);
    showNotification('Failed to read customer database.', 'error');
  }
}

// -------------------------------------------------------------
// 2. Profile Details & Active Media Pipelines
// -------------------------------------------------------------
async function loadCustomerProfile(id) {
  try {
    const res = await fetch(`${API_BASE}/api/customers/${id}`);
    if (!res.ok) throw new Error('Failed to load profile details');
    const data = await res.json();

    // Bind left info card
    document.getElementById('prof-name').textContent = data.name;
    document.getElementById('prof-type').textContent = data.type;
    document.getElementById('prof-email').textContent = data.email;
    document.getElementById('prof-phone').textContent = data.phone;
    document.getElementById('prof-status').innerHTML = `<span class="badge badge-${data.status.toLowerCase()}">${data.status}</span>`;
    document.getElementById('prof-notes').textContent = data.notes || 'No general notes logged.';
    document.getElementById('prof-btn-rental').href = `rentals.html?action=new&customerId=${data.id}`;

    // Store details temporarily on client in case of editing
    window.currentCustomerDetails = data;

    // Populate Rentals & Invoices
    populateProfileRentals(data.rentals);

    // Populate Production Projects (scripts, scenes, shots progress)
    populateProfileProjects(data.projects, id);

    // Populate Communication Logs
    populateProfileComms(data.communications);

  } catch (err) {
    console.error('Error loading customer profile details:', err);
    showNotification('Failed to load profile history.', 'error');
  }
}

function populateProfileRentals(rentals) {
  const tbody = document.getElementById('prof-rentals-tbody');
  tbody.innerHTML = '';

  if (rentals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No rental agreements registered.</td></tr>';
    return;
  }

  rentals.forEach(rental => {
    const itemsText = rental.items.map(i => `${i.quantity}x ${i.equipment_name}`).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span style="font-weight: 500;">${formatDate(rental.rental_date)}</span>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Expected: ${formatDate(rental.expected_return_date)}</div>
      </td>
      <td>
        <span style="font-size: 0.85rem; font-weight: 500;">${itemsText}</span>
      </td>
      <td>${formatCurrency(rental.cost_estimate)}</td>
      <td>
        <span style="font-size: 0.82rem; font-weight: 500;">${rental.delivery_status || 'Pending'}</span>
      </td>
      <td>
        <span class="badge badge-${rental.status.replace(/\s+/g, '-').toLowerCase()}">${rental.status}</span>
      </td>
      <td>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.8rem; font-weight: 700;">${formatCurrency(rental.invoice_amount)}</span>
          <span class="badge ${rental.invoice_status === 'Paid' ? 'badge-returned' : 'badge-booked'}" style="padding: 2px 6px; font-size: 0.68rem; justify-content: center;">
            ${rental.invoice_status || 'Draft'}
          </span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function populateProfileProjects(projects, customerId) {
  const container = document.getElementById('prof-projects-container');
  container.innerHTML = '';

  if (projects.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No production projects managed by SD Digitals.</div>';
    return;
  }

  for (let proj of projects) {
    // Fetch detailed project layout (scenes, shots, scripts)
    const res = await fetch(`${API_BASE}/api/projects/${proj.id}`);
    if (!res.ok) continue;
    const detail = await res.json();

    // Calculate overall shot completion percentage
    let totalShots = 0;
    let approvedShots = 0;
    detail.scenes.forEach(sc => {
      sc.shots.forEach(sh => {
        totalShots++;
        if (sh.status === 'Approved') approvedShots++;
      });
    });
    const completionPercent = totalShots > 0 ? Math.round((approvedShots / totalShots) * 100) : 0;

    // Render HTML card layout with progress bars
    const card = document.createElement('div');
    card.className = 'ai-suggestion-card';
    card.style.borderLeft = '4px solid var(--accent-info)';
    card.style.background = 'rgba(255, 255, 255, 0.01)';
    card.style.gap = '14px';

    const scriptInfo = detail.scripts[0] 
      ? `<div style="font-size: 0.82rem; color: var(--text-secondary);">
           Script File: <a href="${detail.scripts[0].content_link}" target="_blank" style="color: var(--accent-info); text-decoration: none;">${detail.scripts[0].title}</a> (${detail.scripts[0].version})
         </div>`
      : `<div style="font-size: 0.82rem; color: var(--text-muted);">No scripts linked yet.</div>`;

    // Render Shot Details List with select element to change status
    let shotsHtml = '';
    detail.scenes.forEach(sc => {
      sc.shots.forEach(sh => {
        shotsHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(0,0,0,0.15); border-radius: 6px; font-size: 0.8rem; border: 1px solid var(--border-color);">
            <span>Scene ${sc.scene_number} - Shot ${sh.shot_number}: <span style="color: var(--text-secondary);">${sh.description}</span></span>
            <select class="form-control" style="padding: 2px 8px; font-size: 0.75rem; width: auto;" onchange="updateShotStatus(${sh.id}, this.value, ${customerId})">
              <option value="Pending" ${sh.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Filmed" ${sh.status === 'Filmed' ? 'selected' : ''}>Filmed</option>
              <option value="In-VFX" ${sh.status === 'In-VFX' ? 'selected' : ''}>In-VFX</option>
              <option value="Approved" ${sh.status === 'Approved' ? 'selected' : ''}>Approved</option>
            </select>
          </div>
        `;
      });
    });

    card.innerHTML = `
      <div class="ai-sugg-title">
        <span style="font-size: 1.05rem;">${proj.title}</span>
        <span class="badge badge-inquiry">${proj.status}</span>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${proj.description || ''}</div>
      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
        <span>Duration: ${formatDate(proj.start_date)} to ${formatDate(proj.end_date)}</span>
        <span>Scenes Count: ${detail.scenes.length}</span>
      </div>
      ${scriptInfo}
      
      <!-- Progress Bar -->
      <div style="margin-top: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; margin-bottom: 4px;">
          <span>VFX Composite / Delivery Status</span>
          <span style="color: var(--accent-info);">${completionPercent}% Complete (${approvedShots}/${totalShots} Approved)</span>
        </div>
        <div style="width: 100%; height: 8px; background-color: var(--border-color); border-radius: 4px; overflow: hidden;">
          <div style="width: ${completionPercent}%; height: 100%; background: linear-gradient(95deg, var(--accent-info), var(--accent-primary)); border-radius: 4px; transition: width 0.4s ease;"></div>
        </div>
      </div>

      <!-- Shot Tracker Collapsible details -->
      <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
        <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Shot Status Pipeline:</span>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; padding-right: 4px;">
          ${shotsHtml || '<div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 10px;">No shots assigned to scenes yet.</div>'}
        </div>
      </div>
    `;
    container.appendChild(card);
  }
}

function populateProfileComms(comms) {
  const tbody = document.getElementById('prof-comms-tbody');
  tbody.innerHTML = '';

  if (comms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No logs recorded.</td></tr>';
    return;
  }

  comms.forEach(log => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span style="font-size: 0.8rem; color: var(--text-secondary);">${log.scheduled_date ? formatDateTime(log.scheduled_date) : formatDateTime(log.created_at)}</span>
      </td>
      <td>
        <span class="badge ${log.type === 'WhatsApp' ? 'badge-returned' : (log.type === 'Email' ? 'badge-inquiry' : 'badge-booked')}">
          ${log.type}
        </span>
      </td>
      <td>
        <span style="font-size: 0.8rem; font-weight: 600; color: ${log.direction === 'Outbound' ? 'var(--accent-info)' : 'var(--accent-success)'};">
          ${log.direction}
        </span>
      </td>
      <td>
        <div style="font-size: 0.85rem; max-width: 380px; line-height: 1.4; white-space: pre-wrap;">${log.message}</div>
      </td>
      <td>
        <span style="font-style: italic; font-size: 0.8rem; color: var(--text-secondary);">${log.notes || '-'}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Update shot status endpoint helper
async function updateShotStatus(shotId, newStatus, customerId) {
  try {
    const res = await fetch(`${API_BASE}/api/projects/shots/${shotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showNotification('VFX shot pipeline updated.', 'success');
      loadCustomerProfile(customerId); // Reload details to re-render progress calculations
    } else {
      showNotification('Failed to update shot status.', 'error');
    }
  } catch (err) {
    console.error('Error updating shot status:', err);
    showNotification('Network error.', 'error');
  }
}

// -------------------------------------------------------------
// 3. Client Creation / Updates Modals
// -------------------------------------------------------------
function openAddCustomerModal() {
  document.getElementById('modal-customer-title').textContent = 'Add New Customer';
  document.getElementById('btn-customer-submit').textContent = 'Create Profile';
  document.getElementById('cust-id').value = '';
  document.getElementById('customer-form').reset();
  document.getElementById('customer-modal').classList.add('open');
}

function openEditCustomerModal(custData = null) {
  // If called without arguments from profile screen, fetch current details
  const data = custData || window.currentCustomerDetails;
  if (!data) return;

  document.getElementById('modal-customer-title').textContent = 'Edit Customer Details';
  document.getElementById('btn-customer-submit').textContent = 'Update Profile';
  
  document.getElementById('cust-id').value = data.id;
  document.getElementById('cust-name').value = data.name;
  document.getElementById('cust-email').value = data.email;
  document.getElementById('cust-phone').value = data.phone;
  document.getElementById('cust-type').value = data.type;
  document.getElementById('cust-status').value = data.status;
  document.getElementById('cust-notes').value = data.notes || '';

  document.getElementById('customer-modal').classList.add('open');
}

function closeCustomerModal() {
  document.getElementById('customer-modal').classList.remove('open');
}

async function saveCustomer(event) {
  event.preventDefault();
  const id = document.getElementById('cust-id').value;
  const name = document.getElementById('cust-name').value;
  const email = document.getElementById('cust-email').value;
  const phone = document.getElementById('cust-phone').value;
  const type = document.getElementById('cust-type').value;
  const status = document.getElementById('cust-status').value;
  const notes = document.getElementById('cust-notes').value;

  const url = id ? `${API_BASE}/api/customers/${id}` : `${API_BASE}/api/customers`;
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, type, status, notes })
    });

    if (res.ok) {
      showNotification(id ? 'Customer updated.' : 'Customer registered.', 'success');
      closeCustomerModal();
      if (id) {
        loadCustomerProfile(id); // Reload details
      } else {
        loadCustomersDirectory(); // Reload listing
      }
    } else {
      const err = await res.json();
      showNotification(err.error || 'Failed to register customer.', 'error');
    }
  } catch (err) {
    console.error('Error saving customer:', err);
    showNotification('Network error.', 'error');
  }
}

// -------------------------------------------------------------
// 4. Communication Logging Modals
// -------------------------------------------------------------
function openLogCallModal() {
  document.getElementById('comm-form').reset();
  document.getElementById('comm-modal').classList.add('open');
}

function closeLogCallModal() {
  document.getElementById('comm-modal').classList.remove('open');
}

async function saveCommunication(event) {
  event.preventDefault();
  const type = document.getElementById('comm-type').value;
  const direction = document.getElementById('comm-direction').value;
  const message = document.getElementById('comm-message').value;
  const notes = document.getElementById('comm-notes').value;

  if (!currentCustomerId) return;

  try {
    const res = await fetch(`${API_BASE}/api/communications/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: currentCustomerId,
        type,
        direction,
        message,
        notes,
        status: 'Completed'
      })
    });

    if (res.ok) {
      showNotification('Conversation logged successfully.', 'success');
      closeLogCallModal();
      loadCustomerProfile(currentCustomerId); // Refresh logs
    } else {
      showNotification('Failed to log conversation.', 'error');
    }
  } catch (err) {
    console.error('Error saving comm log:', err);
    showNotification('Network error.', 'error');
  }
}

async function deleteCustomer(event, id, name) {
  event.stopPropagation();
  if (!confirm(`Are you sure you want to delete customer "${name}"? This will remove all their historical data.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/customers/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showNotification('Customer profile successfully deleted.', 'success');
      loadCustomersDirectory();
    } else {
      const err = await res.json();
      showNotification(err.error || 'Failed to delete customer.', 'error');
    }
  } catch (err) {
    console.error('Error deleting customer:', err);
    showNotification('Network error.', 'error');
  }
}
