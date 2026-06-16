// Schedule & Reminders Controller for SD Digitals Rental CRM

document.addEventListener('DOMContentLoaded', () => {
  highlightNav('nav-schedule');
  loadSchedule();
});

async function loadSchedule() {
  try {
    const res = await fetch(`${API_BASE}/api/communications/reminders`);
    if (!res.ok) throw new Error('Failed to load reminders');
    const data = await res.json();

    populateOverdueTable(data.overdueRentals);
    populateScheduledTable(data.scheduled);

  } catch (err) {
    console.error('Error loading schedule lists:', err);
    showNotification('Error loading schedule databases.', 'error');
  }
}

function populateOverdueTable(overdues) {
  const tbody = document.getElementById('overdue-tbody');
  tbody.innerHTML = '';

  if (overdues.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
          Clean Slate! No overdue camera equipment rentals detected.
        </td>
      </tr>
    `;
    return;
  }

  overdues.forEach(item => {
    const tr = document.createElement('tr');
    
    // Generate simulated overdue warning message
    const reminderMsg = `Hi ${item.customer_name}! This is SD Digitals operations team. Our records show your camera rental package due on ${formatDate(item.expected_return_date)} has not been returned yet. Please contact us to coordinate pickup or arrange extensions. Thank you!`;

    tr.innerHTML = `
      <td>
        <a href="customers.html?id=${item.customer_id}" style="color: #fff; font-weight: 600; text-decoration: none;">
          ${item.customer_name}
        </a>
        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px;">${item.customer_phone}</div>
      </td>
      <td style="color: var(--accent-danger); font-weight: 500;">
        ${formatDate(item.expected_return_date)}
      </td>
      <td>
        ${formatCurrency(item.cost_estimate)}
      </td>
      <td>
        <span class="badge ${item.overdue_alerts_sent > 0 ? 'badge-overdue' : 'badge-inactive'}">
          ${item.overdue_alerts_sent} Alert${item.overdue_alerts_sent !== 1 ? 's' : ''} Sent
        </span>
      </td>
      <td>
        <button class="btn btn-primary" style="font-size: 0.78rem; padding: 6px 12px;" 
                onclick="sendOverdueAlert('${item.customer_id}', '${item.customer_phone}', '${reminderMsg.replace(/'/g, "\\'")}')">
          Send WhatsApp Reminder
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateScheduledTable(scheduled) {
  const tbody = document.getElementById('scheduled-tbody');
  tbody.innerHTML = '';

  if (scheduled.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No upcoming relationship follow-ups scheduled.
        </td>
      </tr>
    `;
    return;
  }

  scheduled.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <a href="customers.html?id=${item.customer_id}" style="color: #fff; font-weight: 600; text-decoration: none;">
          ${item.customer_name}
        </a>
      </td>
      <td style="font-weight: 500;">
        ${formatDateTime(item.scheduled_date)}
      </td>
      <td>
        <span class="badge ${item.type === 'WhatsApp' ? 'badge-returned' : (item.type === 'Email' ? 'badge-inquiry' : 'badge-booked')}">
          ${item.type}
        </span>
      </td>
      <td style="font-size: 0.82rem; line-height: 1.4; max-width: 320px; white-space: pre-wrap;">${item.message}</td>
      <td style="font-style: italic; font-size: 0.82rem; color: var(--text-secondary);">${item.notes || '-'}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" style="font-size: 0.75rem; padding: 5px 10px;" 
                  onclick="executeScheduledCall(${item.id}, ${item.customer_id}, '${item.customer_phone}', '${item.type}', '${item.message.replace(/'/g, "\\'")}', '${item.notes || ''}')">
            Execute Now
          </button>
          <button class="btn btn-danger" style="font-size: 0.75rem; padding: 5px 10px;" onclick="cancelScheduledCall(${item.id})">
            Dismiss
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Simulated alert from Overdue panel
async function sendOverdueAlert(customerId, phone, message) {
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  }
  const success = await triggerOutboundAlert(customerId, 'WhatsApp', message, 'Manual overdue checkout check-in.');
  if (success) {
    // Reload database grids to update alert counts
    loadSchedule();
  }
}

// Executes a scheduled follow-up
async function executeScheduledCall(commId, customerId, phone, type, message, notes) {
  if (type === 'WhatsApp' && phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  }
  // 1. Dispatch simulation
  const success = await triggerOutboundAlert(customerId, type, message, `Executed scheduled task. Original notes: ${notes}`);
  if (success) {
    // 2. Mark database record as completed
    try {
      const res = await fetch(`${API_BASE}/api/communications/${commId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });

      if (res.ok) {
        showNotification('Task logged as Completed.', 'success');
        loadSchedule();
      }
    } catch (err) {
      console.error('Error completing schedule item:', err);
    }
  }
}

// Cancels / deletes a scheduled task (just updates status to Cancelled)
async function cancelScheduledCall(commId) {
  try {
    const res = await fetch(`${API_BASE}/api/communications/${commId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Cancelled' })
    });

    if (res.ok) {
      showNotification('Scheduled action dismissed.', 'info');
      loadSchedule();
    } else {
      showNotification('Failed to update task status.', 'error');
    }
  } catch (err) {
    console.error('Error cancelling schedule item:', err);
    showNotification('Network error.', 'error');
  }
}
