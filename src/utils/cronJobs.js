const cron = require('node-cron');
const { dbQuery } = require('../db');
const { sendWhatsAppMessage } = require('../services/whatsapp');
// Assuming email service is in server.js, we might need to decouple it later, 
// but for now we'll rely on whatsapp for SMS/WhatsApp alerts here or just log them.

const setupCronJobs = () => {
  // 1. Hourly check for scheduled communications
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly check for scheduled communications...');
    const now = new Date().toISOString();
    try {
      const scheduledLogs = await dbQuery.all(`
        SELECT cl.*, c.phone 
        FROM communication_logs cl
        JOIN customers c ON cl.customer_id = c.id
        WHERE cl.status = 'Scheduled' AND cl.scheduled_date <= ?
      `, [now]);

      for (let log of scheduledLogs) {
        if (log.type === 'WhatsApp') {
          await sendWhatsAppMessage(log.phone, log.message);
        } else {
          console.log(`[Cron Dispatch Email/Call] To: ${log.phone} | MSG: ${log.message}`);
        }
        await dbQuery.run(`UPDATE communication_logs SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [log.id]);
      }
    } catch (err) {
      console.error('[Cron] Error processing scheduled communications:', err);
    }
  });

  // 2. Daily morning check (8 AM) for due-today, tomorrow, overdue, and maintenance
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily morning alerts...');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      // Overdue Rentals
      const overdue = await dbQuery.all(`
        SELECT r.id, c.phone, c.name, r.expected_return_date
        FROM equipment_rentals r
        JOIN customers c ON r.customer_id = c.id
        WHERE r.status = 'Overdue' OR (r.status = 'Out for Rental' AND r.expected_return_date < ?)
      `, [todayStr]);

      for (let item of overdue) {
        const msg = `URGENT: Hi ${item.name}, your rental #${item.id} due on ${item.expected_return_date} is OVERDUE. Please return immediately.`;
        await sendWhatsAppMessage(item.phone, msg);
        // Log it
        await dbQuery.run(`INSERT INTO communication_logs (customer_id, type, direction, message, status, notes, source) VALUES (?, 'WhatsApp', 'Outbound', ?, 'Completed', 'Automated Overdue Alert', 'System-Cron')`, [item.id, msg]);
      }

      // Due Today
      const dueToday = await dbQuery.all(`
        SELECT r.id, c.phone, c.name
        FROM equipment_rentals r
        JOIN customers c ON r.customer_id = c.id
        WHERE r.status = 'Out for Rental' AND r.expected_return_date = ?
      `, [todayStr]);

      for (let item of dueToday) {
        const msg = `Reminder: Hi ${item.name}, your equipment rental #${item.id} is due for return TODAY.`;
        await sendWhatsAppMessage(item.phone, msg);
        await dbQuery.run(`INSERT INTO communication_logs (customer_id, type, direction, message, status, notes, source) VALUES (?, 'WhatsApp', 'Outbound', ?, 'Completed', 'Automated Due-Today Alert', 'System-Cron')`, [item.id, msg]);
      }

      // Due Tomorrow
      const dueTomorrow = await dbQuery.all(`
        SELECT r.id, c.phone, c.name
        FROM equipment_rentals r
        JOIN customers c ON r.customer_id = c.id
        WHERE r.status = 'Out for Rental' AND r.expected_return_date = ?
      `, [tomorrowStr]);

      for (let item of dueTomorrow) {
        const msg = `Hi ${item.name}, friendly reminder that your equipment rental #${item.id} is due for return TOMORROW.`;
        await sendWhatsAppMessage(item.phone, msg);
        await dbQuery.run(`INSERT INTO communication_logs (customer_id, type, direction, message, status, notes, source) VALUES (?, 'WhatsApp', 'Outbound', ?, 'Completed', 'Automated Due-Tomorrow Alert', 'System-Cron')`, [item.id, msg]);
      }

      // Maintenance Alerts
      const upcomingMaintenance = await dbQuery.all(`
        SELECT m.id, e.name, m.service_date
        FROM equipment_maintenance m
        JOIN equipment e ON m.equipment_id = e.id
        WHERE m.status = 'Scheduled' AND m.service_date <= ?
      `, [tomorrowStr]);

      if (upcomingMaintenance.length > 0) {
        console.log(`[Cron] Warning: ${upcomingMaintenance.length} equipment items are due for maintenance.`);
      }

    } catch (err) {
      console.error('[Cron] Error running daily checks:', err);
    }
  });

  console.log('Automated Cron Jobs initialized.');
};

module.exports = { setupCronJobs };
