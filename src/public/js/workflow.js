// Workflow / Kanban Controller for SD Digitals Rental CRM

document.addEventListener('DOMContentLoaded', () => {
  highlightNav('nav-workflow');
  loadWorkflowBoard();
});

async function loadWorkflowBoard() {
  try {
    const res = await fetch(`${API_BASE}/api/rentals`);
    if (!res.ok) throw new Error('Failed to load rentals');
    const rentals = await res.json();

    // Reset columns
    const columns = ['Inquiry', 'Quote Sent', 'Booked', 'Out for Rental', 'Returned'];
    const containers = {};
    const counts = {};

    columns.forEach(col => {
      const idStr = col.replace(/\s+/g, '-');
      const container = document.getElementById(`container-${idStr}`);
      if (container) {
        container.innerHTML = '';
        containers[col] = container;
        counts[col] = 0;
      }
    });

    rentals.forEach(rental => {
      // Map 'Overdue' rentals to 'Out for Rental' column for Kanban representation
      let mappedStatus = rental.status;
      if (mappedStatus === 'Overdue') {
        mappedStatus = 'Out for Rental';
      }

      const container = containers[mappedStatus];
      if (!container) return;

      counts[mappedStatus]++;

      const card = document.createElement('div');
      card.className = `kanban-card ${rental.status === 'Overdue' ? 'border-overdue' : ''}`;
      card.id = `rental-card-${rental.id}`;
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', dragStart);

      const itemsText = rental.items.map(i => `${i.quantity}x ${i.equipment_name}`).join(', ');
      const overdueAlert = rental.status === 'Overdue'
        ? `<div style="color: var(--accent-danger); font-size: 0.72rem; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
             OVERDUE RETURN
           </div>`
        : '';

      card.innerHTML = `
        <div class="card-project-title">
          ${rental.project_title || 'Direct Gear Rental'}
        </div>
        <div class="card-customer">
          Client: <strong>${rental.customer_name}</strong>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
          ${itemsText}
        </div>
        ${overdueAlert}
        <div class="card-footer">
          <span class="card-amount">${formatCurrency(rental.cost_estimate)}</span>
          <span>Due: ${formatDate(rental.expected_return_date)}</span>
        </div>
      `;
      container.appendChild(card);
    });

    // Update column counters
    columns.forEach(col => {
      const idStr = col.replace(/\s+/g, '-');
      const counter = document.getElementById(`count-${idStr}`);
      if (counter) {
        counter.textContent = counts[col];
      }
    });

    addStyleForOverdueCard();

  } catch (err) {
    console.error('Error loading workflow board:', err);
    showNotification('Error loading board pipeline data.', 'error');
  }
}

// Add CSS helpers if not present in main stylesheet for overdue border alerts
function addStyleForOverdueCard() {
  if (!document.getElementById('kanban-card-styles')) {
    const style = document.createElement('style');
    style.id = 'kanban-card-styles';
    style.textContent = `
      .kanban-card.border-overdue {
        border-color: rgba(239, 68, 68, 0.4);
        background: linear-gradient(180deg, var(--bg-card), rgba(239, 68, 68, 0.05));
      }
      .kanban-card.border-overdue:hover {
        border-color: var(--accent-danger);
      }
    `;
    document.head.appendChild(style);
  }
}

// Drag & Drop event wrappers
function dragStart(event) {
  event.dataTransfer.setData('text/plain', event.target.id);
  event.dataTransfer.effectAllowed = 'move';
}

function allowDrop(event) {
  event.preventDefault();
}

async function dropCard(event, newStatus) {
  event.preventDefault();
  const cardId = event.dataTransfer.getData('text/plain');
  const card = document.getElementById(cardId);
  if (!card) return;

  const rentalId = cardId.replace('rental-card-', '');
  const emailAutomationEnabled = localStorage.getItem('emailAutomationEnabled') !== 'false';

  try {
    const res = await fetch(`${API_BASE}/api/rentals/${rentalId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        send_email: emailAutomationEnabled
      })
    });

    if (res.ok) {
      const data = await res.json();
      showNotification(`Rental shifted to ${newStatus} state.`, 'success');

      if (data.emailSent) {
        let logs = JSON.parse(sessionStorage.getItem('sim_logs') || '[]');
        logs.unshift({
          timestamp: new Date().toISOString(),
          type: 'Email',
          customerId: data.emailSent.customer_id,
          message: data.emailSent.message,
          status: 'Success',
          api_response: data.emailSent.api_response
        });
        sessionStorage.setItem('sim_logs', JSON.stringify(logs));
        window.dispatchEvent(new CustomEvent('simulation_logged'));
      }

      loadWorkflowBoard(); // Reload to refresh counters, gear availability, dates
    } else {
      const err = await res.json();
      showNotification(`Failed to transition rental: ${err.error || 'Unknown error'}`, 'error');
    }
  } catch (err) {
    console.error('Error on card transition drop:', err);
    showNotification('Network error processing status change.', 'error');
  }
}
