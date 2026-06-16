// Global Utility Functions & Shared Logic for SD Digitals Rental CRM

const API_BASE = window.location.origin;

// Highlights the active sidebar navigation element based on class names
function highlightNav(navId) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeItem = document.getElementById(navId);
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

// Format currency standard (INR)
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Format relative date / readability
function formatDate(dateString) {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleTimeString('en-IN', options);
}

// Create custom snackbar notifications for CRM visual cue feedback
function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-container') || createNotificationContainer();
  const card = document.createElement('div');
  card.className = `notification-toast toast-${type}`;
  card.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon"></span>
      <span class="toast-msg">${message}</span>
    </div>
  `;
  container.appendChild(card);
  
  // Animate toast
  setTimeout(() => card.classList.add('visible'), 50);
  setTimeout(() => {
    card.classList.remove('visible');
    setTimeout(() => card.remove(), 400);
  }, 4000);
}

function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notification-container';
  document.body.appendChild(container);
  
  // Style container
  const style = document.createElement('style');
  style.textContent = `
    #notification-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 10000;
    }
    .notification-toast {
      background: #1f2937;
      color: #fff;
      border: 1px solid #374151;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
      font-size: 0.88rem;
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .notification-toast.visible {
      transform: translateY(0);
      opacity: 1;
    }
    .toast-success { border-left: 4px solid #10b981; }
    .toast-error { border-left: 4px solid #ef4444; }
    .toast-info { border-left: 4px solid #06b6d4; }
  `;
  document.head.appendChild(style);
  return container;
}

// Trigger Simulated Outbound WhatsApp/Email alert
async function triggerOutboundAlert(customerId, type, message, notes = '') {
  try {
    const res = await fetch(`${API_BASE}/api/communications/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        type,
        message,
        notes
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      showNotification(`Simulated ${type} sent successfully!`, 'success');
      // Store in session log for simulation screen
      let logs = JSON.parse(sessionStorage.getItem('sim_logs') || '[]');
      logs.unshift({
        timestamp: new Date().toISOString(),
        type,
        customerId,
        message,
        status: 'Success',
        api_response: data.api_response
      });
      sessionStorage.setItem('sim_logs', JSON.stringify(logs));
      
      // Fire custom event to update simulator interface if open
      window.dispatchEvent(new CustomEvent('simulation_logged'));
      return true;
    } else {
      showNotification(`Simulation dispatch failed.`, 'error');
      return false;
    }
  } catch (err) {
    console.error('Error triggering simulation alert:', err);
    showNotification('Network error dispatching alert.', 'error');
    return false;
  }
}
