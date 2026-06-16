// Dashboard Controller for SD Digitals Rental CRM

document.addEventListener('DOMContentLoaded', () => {
  highlightNav('nav-dashboard');
  loadStats();
  loadRecentRentals();
  loadAISuggestions();

  // Listen to simulator logs events to refresh stats/insights
  window.addEventListener('simulation_logged', () => {
    loadStats();
    loadAISuggestions();
  });
});

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();

    document.getElementById('stat-active-rentals').textContent = data.activeRentals;
    document.getElementById('stat-overdue-rentals').textContent = data.overdueRentals;
    document.getElementById('stat-active-projects').textContent = data.activeProjects;
    document.getElementById('stat-utilization').textContent = `${data.equipmentUtilization}%`;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadRecentRentals() {
  try {
    const res = await fetch(`${API_BASE}/api/rentals`);
    if (!res.ok) throw new Error('Failed to fetch rentals');
    const rentals = await res.json();

    const tbody = document.getElementById('recent-rentals-tbody');
    tbody.innerHTML = '';

    // Filter to active rentals (Inquiry, Quote Sent, Booked, Out for Rental, Overdue)
    const active = rentals.filter(r => ['Inquiry', 'Quote Sent', 'Booked', 'Out for Rental', 'Overdue'].includes(r.status));

    if (active.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
            No active equipment rentals at the moment.
          </td>
        </tr>
      `;
      return;
    }

    // Show up to 5 items
    active.slice(0, 5).forEach(rental => {
      const itemsText = rental.items.map(i => `${i.quantity}x ${i.equipment_name}`).join(', ');
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <a href="customers.html?id=${rental.customer_id}" style="color: #fff; font-weight: 500; text-decoration: none;">
            ${rental.customer_name}
          </a>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${rental.customer_email}</div>
        </td>
        <td>
          <span style="font-weight: 500;">${itemsText}</span>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Value: ${formatCurrency(rental.cost_estimate)}</div>
        </td>
        <td>${formatDate(rental.expected_return_date)}</td>
        <td>
          <span class="badge ${rental.invoice_status === 'Paid' ? 'badge-returned' : 'badge-booked'}">
            ${rental.invoice_status || 'Draft'}
          </span>
        </td>
        <td>
          <span class="badge badge-${getStatusClass(rental.status)}">${rental.status}</span>
        </td>
        <td>
          <a href="customers.html?id=${rental.customer_id}" class="btn btn-secondary btn-icon" title="View Profile">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading recent rentals:', err);
    document.getElementById('recent-rentals-tbody').innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--accent-danger); padding: 30px;">
          Failed to load active rental registry.
        </td>
      </tr>
    `;
  }
}

async function loadAISuggestions() {
  try {
    const res = await fetch(`${API_BASE}/api/ai/insights`);
    if (!res.ok) throw new Error('Failed to fetch AI insights');
    const insights = await res.json();

    const container = document.getElementById('ai-suggestions-container');
    container.innerHTML = '';

    if (insights.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 30px 0;">
          All set! No overdue items, delayed quotes, or relationship follow-ups detected.
        </div>
      `;
      return;
    }

    insights.forEach(item => {
      const card = document.createElement('div');
      card.className = 'ai-suggestion-card';
      
      let badgeColor = 'indigo';
      if (item.priority === 'high') badgeColor = 'crimson';
      else if (item.priority === 'medium') badgeColor = 'gold';

      let actionsHtml = '';
      if (item.template) {
        actionsHtml = `
          <div class="action-box" id="template-${item.id}">${item.template}</div>
            <div class="ai-sugg-action">
            <span class="ai-sugg-meta meta-${item.type}">${item.type} delay</span>
            <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" 
                    onclick="sendAISimulatedAlert('${item.customer_id}', '${item.phone || ''}', '${item.type === 'overdue' ? 'WhatsApp' : 'WhatsApp'}', '${item.id}')">
              Send Alert
            </button>
          </div>
        `;
      } else {
        // Warning with no text templates (e.g. inventory shortage)
        actionsHtml = `
          <div class="ai-sugg-action">
            <span class="ai-sugg-meta meta-${item.type}">${item.type} bottleneck</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Operations Advisory</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="ai-sugg-title">
          <span>${item.title}</span>
          <span class="badge badge-${item.priority === 'high' ? 'overdue' : 'booked'}">${item.priority}</span>
        </div>
        <div class="ai-sugg-desc">${item.message}</div>
        ${actionsHtml}
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading AI insights:', err);
    document.getElementById('ai-suggestions-container').innerHTML = `
      <div style="text-align: center; color: var(--accent-danger); padding: 30px 0;">
        Failed to fetch smart follow-up suggestions.
      </div>
    `;
  }
}

// Simulated action from AI insights pane
async function sendAISimulatedAlert(customerId, phone, channel, insightId) {
  const textElement = document.getElementById(`template-${insightId}`);
  if (!textElement) return;

  const msg = textElement.textContent;

  if (channel === 'WhatsApp' && phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  }

  const note = `Auto-suggested followup for insight ref: ${insightId}`;
  
  const success = await triggerOutboundAlert(customerId, channel, msg, note);
  if (success) {
    // If successfully sent, reload everything to trigger state recalculations
    loadStats();
    loadAISuggestions();
  }
}

// Maps rental statuses to style classes
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
