require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const { dbQuery, dbInitialized } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to wrap async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Configure Gmail transporter (only if credentials are set in .env)
const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_APP_PASSWORD;
const emailConfigured = gmailUser && gmailPass 
  && gmailUser !== 'your_gmail@gmail.com' 
  && gmailPass !== 'your_16_char_app_password';

let transporter = null;
if (emailConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });
  console.log(`Email service configured: sending as ${gmailUser}`);
} else {
  console.log('Email service: running in simulation mode (no Gmail credentials in .env)');
}

// Send automated booking confirmation email
async function sendBookingConfirmationEmail(rentalId) {
  try {
    const rental = await dbQuery.get(`
      SELECT r.*, c.name AS customer_name, c.email AS customer_email
      FROM equipment_rentals r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.id = ?
    `, [rentalId]);

    if (!rental) return;

    const items = await dbQuery.all(`
      SELECT ri.quantity, e.name AS equipment_name
      FROM rental_items ri
      JOIN equipment e ON ri.equipment_id = e.id
      WHERE ri.rental_id = ?
    `, [rentalId]);

    const ref = String(rental.id).padStart(4, '0');
    const itemsList = items.map(i => `• ${i.quantity}x ${i.equipment_name}`).join('<br>');
    const itemsListText = items.map(i => `  - ${i.quantity}x ${i.equipment_name}`).join('\n');

    const subject = `Booking Confirmation: Rental #${ref}`;
    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">SD Digitals</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0;">Equipment Rental Confirmation</p>
  </div>
  <div style="padding: 32px; background: white;">
    <h2 style="color: #1f2937; margin-top: 0;">Booking Confirmed ✅</h2>
    <p style="color: #374151;">Dear <strong>${rental.customer_name}</strong>,</p>
    <p style="color: #374151;">Your equipment rental booking at SD Digitals is officially confirmed!</p>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #374151; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Booking Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #6b7280; padding: 4px 0;">Booking Ref</td><td style="color: #1f2937; font-weight: 600;">#${ref}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Pickup Date</td><td style="color: #1f2937; font-weight: 600;">${rental.rental_date}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Return By</td><td style="color: #1f2937; font-weight: 600;">${rental.expected_return_date}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Estimated Total</td><td style="color: #1f2937; font-weight: 600;">INR ${rental.cost_estimate}</td></tr>
      </table>
    </div>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #374151; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Gear Package</h3>
      <p style="color: #374151; margin: 0;">${itemsList}</p>
    </div>
    <p style="color: #374151;">Thank you for choosing SD Digitals. Please contact our operations desk for delivery coordination or additional accessories.</p>
  </div>
  <div style="background: #f3f4f6; padding: 20px; text-align: center;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">SD Digitals Operations Team | Camera &amp; Equipment Rentals</p>
  </div>
</div>`;

    const plainText = `Dear ${rental.customer_name},\n\nYour equipment rental booking at SD Digitals is officially confirmed!\n\nBooking Summary:\n- Booking Ref: #${ref}\n- Pickup: ${rental.rental_date}\n- Return By: ${rental.expected_return_date}\n- Total: INR ${rental.cost_estimate}\n\nGear Package:\n${itemsListText}\n\nBest regards,\nSD Digitals Operations Team`;

    const logMessage = `Subject: ${subject}\nTo: ${rental.customer_email}\n\n${plainText}`;

    await dbQuery.run(`
      INSERT INTO communication_logs (customer_id, type, direction, message, status, notes)
      VALUES (?, 'Email', 'Outbound', ?, 'Completed', ?)
    `, [rental.customer_id, logMessage, `Automated booking confirmation for Rental #${rentalId}`]);

    if (transporter) {
      await transporter.sendMail({
        from: `"${process.env.SENDER_NAME || 'SD Digitals Operations'}" <${gmailUser}>`,
        to: rental.customer_email,
        subject: subject,
        text: plainText,
        html: htmlBody
      });
      console.log(`✉️  Booking confirmation email SENT to ${rental.customer_email} (Rental #${rentalId})`);
    } else {
      console.log(`Automated booking confirmation email logged for Rental #${rentalId} to ${rental.customer_email} [simulation mode]`);
    }
  } catch (err) {
    console.error('Error sending booking confirmation email:', err);
  }
}

// Send automated status update email based on state transition
async function sendStatusUpdateEmail(rentalId, status) {
  try {
    const rental = await dbQuery.get(`
      SELECT r.*, c.name AS customer_name, c.email AS customer_email
      FROM equipment_rentals r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.id = ?
    `, [rentalId]);

    if (!rental) return null;

    const items = await dbQuery.all(`
      SELECT ri.quantity, e.name AS equipment_name
      FROM rental_items ri
      JOIN equipment e ON ri.equipment_id = e.id
      WHERE ri.rental_id = ?
    `, [rentalId]);

    const itemsList = items.map(i => `${i.quantity}x ${i.equipment_name}`).join('\n');
    const ref = String(rental.id).padStart(4, '0');

    let subject = `Rental Status Update: Rental #${ref}`;
    let bodyIntro = `We are writing to inform you that your equipment rental status has been updated to: ${status}.`;

    if (status === 'Inquiry') {
      subject = `Rental Inquiry Received: Rental #${ref}`;
      bodyIntro = `Thank you for your inquiry regarding equipment rentals at SD Digitals. We have received your request and are checking gear availability.`;
    } else if (status === 'Quote Sent') {
      subject = `Equipment Rental Quote: Rental #${ref}`;
      bodyIntro = `Here is the quote for your requested equipment rental at SD Digitals. Please confirm your booking to reserve the gear.`;
    } else if (status === 'Booked') {
      subject = `Booking Confirmation: Rental #${ref}`;
      bodyIntro = `Your equipment rental booking at SD Digitals is officially confirmed!`;
    } else if (status === 'Out for Rental') {
      subject = `Gear Dispatched / Out for Rental: Rental #${ref}`;
      bodyIntro = `Your equipment rental package has been checked out and is now out for rental.`;
    } else if (status === 'Returned') {
      subject = `Gear Safely Returned: Rental #${ref}`;
      bodyIntro = `Thank you for returning the equipment. All items have been inspected and checked back into our inventory.`;
    } else if (status === 'Overdue') {
      subject = `URGENT - Overdue Equipment Rental: Rental #${ref}`;
      bodyIntro = `This is an urgent reminder that your equipment rental package is overdue. Please return the gear immediately to prevent additional late fee charges.`;
    } else if (status === 'Cancelled') {
      subject = `Rental Booking Cancelled: Rental #${ref}`;
      bodyIntro = `We confirm that your equipment rental booking has been cancelled.`;
    }

    const statusColor = {
      'Booked': '#6366f1', 'Out for Rental': '#a78bfa', 'Overdue': '#ef4444',
      'Returned': '#10b981', 'Cancelled': '#6b7280', 'Quote Sent': '#f59e0b', 'Inquiry': '#3b82f6'
    }[status] || '#6366f1';

    const itemsListHtml = items.map(i => `• ${i.quantity}x ${i.equipment_name}`).join('<br>');
    const itemsListText = items.map(i => `  - ${i.quantity}x ${i.equipment_name}`).join('\n');

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, ${statusColor}, #4f46e5); padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">SD Digitals</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0;">Rental Status Update</p>
  </div>
  <div style="padding: 32px; background: white;">
    <div style="display: inline-block; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44; border-radius: 6px; padding: 4px 14px; font-size: 13px; font-weight: 700; margin-bottom: 20px;">${status}</div>
    <p style="color: #374151;">Dear <strong>${rental.customer_name}</strong>,</p>
    <p style="color: #374151;">${bodyIntro}</p>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #374151; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Booking Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #6b7280; padding: 4px 0;">Booking Ref</td><td style="color: #1f2937; font-weight: 600;">#${ref}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Pickup Date</td><td style="color: #1f2937; font-weight: 600;">${rental.rental_date}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Return By</td><td style="color: #1f2937; font-weight: 600;">${rental.expected_return_date}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Estimated Total</td><td style="color: #1f2937; font-weight: 600;">INR ${rental.cost_estimate}</td></tr>
      </table>
    </div>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #374151; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Gear Package</h3>
      <p style="color: #374151; margin: 0;">${itemsListHtml}</p>
    </div>
    <p style="color: #374151;">For queries, contact SD Digitals operations team.</p>
  </div>
  <div style="background: #f3f4f6; padding: 20px; text-align: center;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">SD Digitals Operations Team | Camera &amp; Equipment Rentals</p>
  </div>
</div>`;

    const plainText = `Dear ${rental.customer_name},\n\n${bodyIntro}\n\nBooking Summary:\n- Booking Ref: #${ref}\n- Pickup: ${rental.rental_date}\n- Return By: ${rental.expected_return_date}\n- Total: INR ${rental.cost_estimate}\n\nGear Package:\n${itemsListText}\n\nBest regards,\nSD Digitals Operations Team`;
    const logMessage = `Subject: ${subject}\nTo: ${rental.customer_email}\n\n${plainText}`;

    await dbQuery.run(`
      INSERT INTO communication_logs (customer_id, type, direction, message, status, notes)
      VALUES (?, 'Email', 'Outbound', ?, 'Completed', ?)
    `, [rental.customer_id, logMessage, `Automated ${status} notification for Rental #${rentalId}`]);

    if (transporter) {
      await transporter.sendMail({
        from: `"${process.env.SENDER_NAME || 'SD Digitals Operations'}" <${gmailUser}>`,
        to: rental.customer_email,
        subject: subject,
        text: plainText,
        html: htmlBody
      });
      console.log(`✉️  Status update email SENT to ${rental.customer_email} (${status} — Rental #${rentalId})`);
    } else {
      console.log(`Automated ${status} email logged for Rental #${rentalId} to ${rental.customer_email} [simulation mode]`);
    }

    return {
      customer_id: rental.customer_id,
      email: rental.customer_email,
      subject: subject,
      message: logMessage,
      api_response: transporter
        ? `200 OK - Email dispatched via Gmail to ${rental.customer_email}`
        : `SIMULATED - Logged to communication_logs (configure .env to send real emails)`
    };
  } catch (err) {
    console.error('Error sending status update email:', err);
    return null;
  }
}

// -------------------------------------------------------------
// 1. Dashboard Statistics
// -------------------------------------------------------------
app.get('/api/dashboard/stats', asyncHandler(async (req, res) => {
  // Count active rentals (Booked, Out for Rental, Overdue)
  const activeRentals = await dbQuery.get(`
    SELECT COUNT(*) AS count FROM equipment_rentals 
    WHERE status IN ('Booked', 'Out for Rental', 'Overdue')
  `);

  // Count overdue rentals
  const overdueRentals = await dbQuery.get(`
    SELECT COUNT(*) AS count FROM equipment_rentals WHERE status = 'Overdue'
  `);

  // Count active production/VFX projects
  const activeProjects = await dbQuery.get(`
    SELECT COUNT(*) AS count FROM projects WHERE status != 'Completed'
  `);

  // Calculate total revenue from paid invoices
  const totalRevenue = await dbQuery.get(`
    SELECT SUM(amount) AS sum FROM invoices WHERE status = 'Paid'
  `);

  // Count total equipment and check available count to calculate utilization
  const totalEquip = await dbQuery.get(`SELECT COUNT(*) AS count FROM equipment`);
  const rentedEquip = await dbQuery.get(`SELECT COUNT(*) AS count FROM equipment WHERE status = 'Rented'`);

  // Calculate equipment utilization rate
  const utilization = totalEquip.count > 0 
    ? Math.round((rentedEquip.count / totalEquip.count) * 100) 
    : 0;

  // Get active notifications count (overdue, quote sent and idle, scheduled for today)
  const today = new Date().toISOString().split('T')[0];
  const pendingFollowups = await dbQuery.get(`
    SELECT COUNT(*) AS count FROM communication_logs 
    WHERE status = 'Scheduled' AND (scheduled_date <= ? OR scheduled_date LIKE ?)
  `, [new Date().toISOString(), `${today}%`]);

  res.json({
    activeRentals: activeRentals.count,
    overdueRentals: overdueRentals.count,
    activeProjects: activeProjects.count,
    totalRevenue: totalRevenue.sum || 0,
    equipmentUtilization: utilization,
    pendingFollowups: pendingFollowups.count,
    totalEquipment: totalEquip.count,
    rentedEquipment: rentedEquip.count
  });
}));

// -------------------------------------------------------------
// 2. Customers API
// -------------------------------------------------------------
app.get('/api/customers', asyncHandler(async (req, res) => {
  const query = `
    SELECT c.*,
      (SELECT COUNT(*) FROM equipment_rentals r WHERE r.customer_id = c.id AND r.status IN ('Booked', 'Out for Rental', 'Overdue')) AS active_rentals_count,
      (SELECT COUNT(*) FROM projects p WHERE p.customer_id = c.id AND p.status != 'Completed') AS active_projects_count
    FROM customers c
    ORDER BY c.name ASC
  `;
  const customers = await dbQuery.all(query);
  res.json(customers);
}));

app.get('/api/customers/:id', asyncHandler(async (req, res) => {
  const customerId = req.params.id;
  const customer = await dbQuery.get('SELECT * FROM customers WHERE id = ?', [customerId]);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Fetch rentals linked to this customer
  const rentals = await dbQuery.all(`
    SELECT r.*, i.amount AS invoice_amount, i.status AS invoice_status, i.due_date AS invoice_due_date
    FROM equipment_rentals r
    LEFT JOIN invoices i ON i.rental_id = r.id
    WHERE r.customer_id = ?
    ORDER BY r.rental_date DESC
  `, [customerId]);

  // For each rental, fetch the detailed rental items
  for (let rental of rentals) {
    rental.items = await dbQuery.all(`
      SELECT ri.*, e.name AS equipment_name, e.category AS equipment_category, e.serial_number AS equipment_serial
      FROM rental_items ri
      JOIN equipment e ON ri.equipment_id = e.id
      WHERE ri.rental_id = ?
    `, [rental.id]);
  }

  // Fetch production projects managed for this customer
  const projects = await dbQuery.all(`
    SELECT p.*
    FROM projects p
    WHERE p.customer_id = ?
    ORDER BY p.start_date DESC
  `, [customerId]);

  // Fetch communication logs
  const communications = await dbQuery.all(`
    SELECT * FROM communication_logs
    WHERE customer_id = ?
    ORDER BY created_at DESC, scheduled_date DESC
  `, [customerId]);

  // Fetch feedback
  const feedback = await dbQuery.all(`
    SELECT f.*, r.rental_date, r.status AS rental_status
    FROM feedback f
    LEFT JOIN equipment_rentals r ON f.rental_id = r.id
    WHERE f.customer_id = ?
    ORDER BY f.created_at DESC
  `, [customerId]);

  res.json({
    ...customer,
    rentals,
    projects,
    communications,
    feedback
  });
}));

app.post('/api/customers', asyncHandler(async (req, res) => {
  const { name, email, phone, type, status, notes } = req.body;
  if (!name || !email || !phone || !type) {
    return res.status(400).json({ error: 'Name, email, phone, and type are required' });
  }

  try {
    const result = await dbQuery.run(`
      INSERT INTO customers (name, email, phone, type, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, email, phone, type, status || 'Active', notes || '']);
    
    res.status(201).json({ id: result.id, name, email, phone, type, status, notes });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'A customer with this email already exists' });
    } else {
      throw err;
    }
  }
}));

app.put('/api/customers/:id', asyncHandler(async (req, res) => {
  const { name, email, phone, type, status, notes } = req.body;
  const customerId = req.params.id;

  if (!name || !email || !phone || !type) {
    return res.status(400).json({ error: 'Name, email, phone, and type are required' });
  }

  await dbQuery.run(`
    UPDATE customers 
    SET name = ?, email = ?, phone = ?, type = ?, status = ?, notes = ?
    WHERE id = ?
  `, [name, email, phone, type, status, notes, customerId]);

  res.json({ message: 'Customer updated successfully' });
}));

app.delete('/api/customers/:id', asyncHandler(async (req, res) => {
  const customerId = req.params.id;

  // Check if customer has active rentals (Booked, Out for Rental, Overdue)
  const activeRentals = await dbQuery.get(`
    SELECT COUNT(*) AS count 
    FROM equipment_rentals 
    WHERE customer_id = ? AND status IN ('Booked', 'Out for Rental', 'Overdue')
  `, [customerId]);

  if (activeRentals.count > 0) {
    return res.status(400).json({ error: 'Cannot delete customer with active bookings.' });
  }

  // Check if customer has active projects (not Completed)
  const activeProjects = await dbQuery.get(`
    SELECT COUNT(*) AS count 
    FROM projects 
    WHERE customer_id = ? AND status != 'Completed'
  `, [customerId]);

  if (activeProjects.count > 0) {
    return res.status(400).json({ error: 'Cannot delete customer with active projects.' });
  }

  await dbQuery.run('DELETE FROM customers WHERE id = ?', [customerId]);
  res.json({ message: 'Customer deleted successfully' });
}));

// -------------------------------------------------------------
// 3. Equipment Inventory API
// -------------------------------------------------------------
app.get('/api/equipment', asyncHandler(async (req, res) => {
  const equipment = await dbQuery.all('SELECT * FROM equipment ORDER BY category ASC, name ASC');
  res.json(equipment);
}));

app.post('/api/equipment', asyncHandler(async (req, res) => {
  const { name, category, company, serial_number, rental_rate, status, image_url } = req.body;
  if (!name || !category || !serial_number || !rental_rate) {
    return res.status(400).json({ error: 'Name, category, serial_number, and rental_rate are required' });
  }

  try {
    const result = await dbQuery.run(`
      INSERT INTO equipment (name, category, company, serial_number, rental_rate, status, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, category, company || '', serial_number, rental_rate, status || 'Available', image_url || '']);
    res.status(201).json({ id: result.id, name, category, company, serial_number, rental_rate, status, image_url });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Equipment with this serial number already exists' });
    } else {
      throw err;
    }
  }
}));

app.put('/api/equipment/:id', asyncHandler(async (req, res) => {
  const { name, category, company, serial_number, rental_rate, status, image_url } = req.body;
  const equipId = req.params.id;

  await dbQuery.run(`
    UPDATE equipment
    SET name = ?, category = ?, company = ?, serial_number = ?, rental_rate = ?, status = ?, image_url = ?
    WHERE id = ?
  `, [name, category, company || '', serial_number, rental_rate, status, image_url, equipId]);

  res.json({ message: 'Equipment updated successfully' });
}));

app.delete('/api/equipment/:id', asyncHandler(async (req, res) => {
  const equipId = req.params.id;

  // Check if equipment is currently rented or has active bookings
  const activeBookings = await dbQuery.get(`
    SELECT COUNT(*) AS count 
    FROM rental_items ri
    JOIN equipment_rentals r ON ri.rental_id = r.id
    WHERE ri.equipment_id = ? AND r.status IN ('Booked', 'Out for Rental', 'Overdue')
  `, [equipId]);

  if (activeBookings.count > 0) {
    return res.status(400).json({ error: 'Cannot delete equipment that is currently rented or booked.' });
  }

  await dbQuery.run('DELETE FROM equipment WHERE id = ?', [equipId]);
  res.json({ message: 'Equipment deleted successfully' });
}));

// -------------------------------------------------------------
// 4. Equipment Rentals API
// -------------------------------------------------------------
app.get('/api/rentals', asyncHandler(async (req, res) => {
  const query = `
    SELECT r.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
           p.title AS project_title, i.amount AS invoice_amount, i.status AS invoice_status, i.id AS invoice_id
    FROM equipment_rentals r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN projects p ON r.project_id = p.id
    LEFT JOIN invoices i ON i.rental_id = r.id
    ORDER BY r.rental_date DESC
  `;
  const rentals = await dbQuery.all(query);
  
  // Attach items to rentals
  for (let rental of rentals) {
    rental.items = await dbQuery.all(`
      SELECT ri.*, e.name AS equipment_name, e.category AS equipment_category, e.serial_number AS equipment_serial
      FROM rental_items ri
      JOIN equipment e ON ri.equipment_id = e.id
      WHERE ri.rental_id = ?
    `, [rental.id]);
  }
  
  res.json(rentals);
}));

app.post('/api/rentals', asyncHandler(async (req, res) => {
  const { customer_id, project_id, rental_date, expected_return_date, status, items, discount } = req.body;
  
  if (!customer_id || !rental_date || !expected_return_date || !items || items.length === 0) {
    return res.status(400).json({ error: 'customer_id, rental_date, expected_return_date, and items are required' });
  }

  // Calculate costs based on items and duration
  const start = new Date(rental_date);
  const end = new Date(expected_return_date);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // At least 1 day

  let calculatedCost = 0;
  for (let item of items) {
    const equip = await dbQuery.get('SELECT rental_rate FROM equipment WHERE id = ?', [item.equipment_id]);
    if (equip) {
      calculatedCost += (equip.rental_rate * item.quantity) * diffDays;
    }
  }

  const finalDiscount = parseFloat(discount) || 0.00;
  const costEstimate = Math.max(0, calculatedCost - finalDiscount);

  // Insert master rental record
  const deliveryStatus = (status === 'Out for Rental') ? 'Delivered' : 'Pending';
  const rentalResult = await dbQuery.run(`
    INSERT INTO equipment_rentals (customer_id, project_id, rental_date, expected_return_date, status, cost_estimate, delivery_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [customer_id, project_id || null, rental_date, expected_return_date, status || 'Inquiry', costEstimate, deliveryStatus]);

  const rentalId = rentalResult.id;

  // Insert individual items
  for (let item of items) {
    const equip = await dbQuery.get('SELECT rental_rate, status FROM equipment WHERE id = ?', [item.equipment_id]);
    if (equip) {
      await dbQuery.run(`
        INSERT INTO rental_items (rental_id, equipment_id, quantity, rental_rate)
        VALUES (?, ?, ?, ?)
      `, [rentalId, item.equipment_id, item.quantity, equip.rental_rate]);

      // If rental is active immediately, mark equipment as Rented
      if (status === 'Booked' || status === 'Out for Rental' || status === 'Overdue') {
        await dbQuery.run('UPDATE equipment SET status = "Rented" WHERE id = ?', [item.equipment_id]);
      }
    }
  }

  // Create invoice (18% GST standard tax rate)
  const tax = costEstimate * 0.18;
  const invoiceAmount = costEstimate + tax;
  const invoiceStatus = (status === 'Returned') ? 'Paid' : (status === 'Out for Rental' ? 'Sent' : 'Draft');

  await dbQuery.run(`
    INSERT INTO invoices (rental_id, amount, tax, discount, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [rentalId, invoiceAmount, tax, finalDiscount, invoiceStatus, expected_return_date]);

  if (status === 'Booked') {
    await sendBookingConfirmationEmail(rentalId);
  }

  res.status(201).json({ id: rentalId, message: 'Rental and invoice registered successfully', costEstimate });
}));

app.put('/api/rentals/:id/status', asyncHandler(async (req, res) => {
  const rentalId = req.params.id;
  const { status, delivery_status } = req.body;
  const send_email = req.body.send_email !== false;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  // Get current rental details
  const rental = await dbQuery.get('SELECT * FROM equipment_rentals WHERE id = ?', [rentalId]);
  if (!rental) {
    return res.status(404).json({ error: 'Rental not found' });
  }

  const oldStatus = rental.status;

  // Get equipment items linked to this rental
  const items = await dbQuery.all('SELECT equipment_id FROM rental_items WHERE rental_id = ?', [rentalId]);

  let actualReturnDate = rental.actual_return_date;
  let finalDeliveryStatus = delivery_status || rental.delivery_status;

  if (status === 'Returned') {
    actualReturnDate = new Date().toISOString().split('T')[0]; // Set actual return to today
    finalDeliveryStatus = 'Returned';

    // Free the equipment back to 'Available'
    for (let item of items) {
      await dbQuery.run('UPDATE equipment SET status = "Available" WHERE id = ?', [item.equipment_id]);
    }
    
    // Automatically update invoice status to Paid if it was returned
    await dbQuery.run('UPDATE invoices SET status = "Paid" WHERE rental_id = ? AND status != "Paid"', [rentalId]);

  } else if (status === 'Out for Rental' || status === 'Booked' || status === 'Overdue') {
    actualReturnDate = null;
    if (status === 'Out for Rental') {
      finalDeliveryStatus = 'Delivered';
    }
    // Reserve the equipment
    for (let item of items) {
      await dbQuery.run('UPDATE equipment SET status = "Rented" WHERE id = ?', [item.equipment_id]);
    }
  } else if (status === 'Cancelled' || status === 'Inquiry' || status === 'Quote Sent') {
    actualReturnDate = null;
    // Free the equipment
    for (let item of items) {
      await dbQuery.run('UPDATE equipment SET status = "Available" WHERE id = ?', [item.equipment_id]);
    }
  }

  await dbQuery.run(`
    UPDATE equipment_rentals
    SET status = ?, actual_return_date = ?, delivery_status = ?
    WHERE id = ?
  `, [status, actualReturnDate, finalDeliveryStatus, rentalId]);

  let emailSent = null;
  if (send_email) {
    emailSent = await sendStatusUpdateEmail(rentalId, status);
  } else if (status === 'Booked' && oldStatus !== 'Booked') {
    await sendBookingConfirmationEmail(rentalId);
  }

  res.json({ message: 'Rental status updated successfully', status, actualReturnDate, emailSent });
}));

app.delete('/api/rentals/:id', asyncHandler(async (req, res) => {
  const rentalId = req.params.id;

  const rental = await dbQuery.get('SELECT * FROM equipment_rentals WHERE id = ?', [rentalId]);
  if (!rental) {
    return res.status(404).json({ error: 'Rental not found' });
  }

  const items = await dbQuery.all('SELECT equipment_id FROM rental_items WHERE rental_id = ?', [rentalId]);

  if (['Booked', 'Out for Rental', 'Overdue'].includes(rental.status)) {
    for (let item of items) {
      await dbQuery.run('UPDATE equipment SET status = "Available" WHERE id = ?', [item.equipment_id]);
    }
  }

  await dbQuery.run('DELETE FROM equipment_rentals WHERE id = ?', [rentalId]);
  res.json({ message: 'Rental booking deleted successfully' });
}));

// -------------------------------------------------------------
// 5. Creative Projects / Media Pipeline API
// -------------------------------------------------------------
app.get('/api/projects', asyncHandler(async (req, res) => {
  const query = `
    SELECT p.*, c.name AS customer_name, c.email AS customer_email,
           (SELECT COUNT(*) FROM scenes s JOIN scripts sc ON s.script_id = sc.id WHERE sc.project_id = p.id) AS scene_count,
           (SELECT COUNT(*) FROM shots sh JOIN scenes s ON sh.scene_id = s.id JOIN scripts sc ON s.script_id = sc.id WHERE sc.project_id = p.id) AS shot_count,
           (SELECT COUNT(*) FROM shots sh JOIN scenes s ON sh.scene_id = s.id JOIN scripts sc ON s.script_id = sc.id WHERE sc.project_id = p.id AND sh.status = 'Approved') AS approved_shot_count
    FROM projects p
    JOIN customers c ON p.customer_id = c.id
    ORDER BY p.start_date DESC
  `;
  const projects = await dbQuery.all(query);
  res.json(projects);
}));

app.get('/api/projects/:id', asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const project = await dbQuery.get(`
    SELECT p.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
    FROM projects p
    JOIN customers c ON p.customer_id = c.id
    WHERE p.id = ?
  `, [projectId]);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Scripts
  const scripts = await dbQuery.all('SELECT * FROM scripts WHERE project_id = ?', [projectId]);

  // Scenes & Shots
  const scenes = [];
  for (let script of scripts) {
    const scriptScenes = await dbQuery.all('SELECT * FROM scenes WHERE script_id = ? ORDER BY scene_number ASC', [script.id]);
    for (let scene of scriptScenes) {
      scene.shots = await dbQuery.all('SELECT * FROM shots WHERE scene_id = ? ORDER BY shot_number ASC', [scene.id]);
      scenes.push(scene);
    }
  }

  // Assigned Artists
  const artists = await dbQuery.all(`
    SELECT aa.role_assigned, a.*
    FROM artist_assignments aa
    JOIN artists a ON aa.artist_id = a.id
    WHERE aa.project_id = ?
  `, [projectId]);

  res.json({
    ...project,
    scripts,
    scenes,
    artists
  });
}));

app.post('/api/projects', asyncHandler(async (req, res) => {
  const { customer_id, title, description, status, start_date, end_date } = req.body;
  if (!customer_id || !title || !start_date || !end_date) {
    return res.status(400).json({ error: 'customer_id, title, start_date, and end_date are required' });
  }

  const result = await dbQuery.run(`
    INSERT INTO projects (customer_id, title, description, status, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [customer_id, title, description || '', status || 'Pre-Production', start_date, end_date]);

  res.status(201).json({ id: result.id, title, status });
}));

// Create Shot
app.post('/api/projects/scenes/:sceneId/shots', asyncHandler(async (req, res) => {
  const sceneId = req.params.sceneId;
  const { shot_number, description, status } = req.body;

  if (!shot_number || !description) {
    return res.status(400).json({ error: 'shot_number and description are required' });
  }

  const result = await dbQuery.run(`
    INSERT INTO shots (scene_id, shot_number, description, status)
    VALUES (?, ?, ?, ?)
  `, [sceneId, shot_number, description, status || 'Pending']);

  res.status(201).json({ id: result.id, shot_number, description, status });
}));

// Update Shot status
app.put('/api/projects/shots/:shotId', asyncHandler(async (req, res) => {
  const shotId = req.params.shotId;
  const { status } = req.body;

  await dbQuery.run('UPDATE shots SET status = ? WHERE id = ?', [status, shotId]);
  res.json({ message: 'Shot updated successfully' });
}));

// -------------------------------------------------------------
// 6. Communications & Follow-ups API
// -------------------------------------------------------------
app.get('/api/communications/reminders', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Scheduled active reminders
  const scheduled = await dbQuery.all(`
    SELECT cl.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
    FROM communication_logs cl
    JOIN customers c ON cl.customer_id = c.id
    WHERE cl.status = 'Scheduled'
    ORDER BY cl.scheduled_date ASC
  `);

  // Overdue rental followups needed
  const overdueRentals = await dbQuery.all(`
    SELECT r.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           (SELECT COUNT(*) FROM communication_logs cl WHERE cl.customer_id = c.id AND cl.message LIKE '%overdue%') AS overdue_alerts_sent
    FROM equipment_rentals r
    JOIN customers c ON r.customer_id = c.id
    WHERE r.status = 'Overdue' OR (r.status = 'Out for Rental' AND r.expected_return_date < ?)
  `, [today]);

  res.json({
    scheduled,
    overdueRentals
  });
}));

app.post('/api/communications/log', asyncHandler(async (req, res) => {
  const { customer_id, type, direction, message, status, scheduled_date, notes } = req.body;

  if (!customer_id || !type || !direction || !message) {
    return res.status(400).json({ error: 'customer_id, type, direction, and message are required' });
  }

  const result = await dbQuery.run(`
    INSERT INTO communication_logs (customer_id, type, direction, message, status, scheduled_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [customer_id, type, direction, message, status || 'Completed', scheduled_date || null, notes || '']);

  res.status(201).json({ id: result.id, message: 'Communication logged successfully' });
}));

// Simulate WhatsApp / Email dispatch
app.post('/api/communications/send-alert', asyncHandler(async (req, res) => {
  const { customer_id, type, message, notes } = req.body;

  if (!customer_id || !type || !message) {
    return res.status(400).json({ error: 'customer_id, type, and message are required' });
  }

  // Insert direct outbound communication log
  const result = await dbQuery.run(`
    INSERT INTO communication_logs (customer_id, type, direction, message, status, notes)
    VALUES (?, ?, 'Outbound', ?, 'Completed', ?)
  `, [customer_id, type, message, notes || 'Dispatched via API Simulator.']);

  // If this was an overdue alert, we log it, and if there is a schedule matching it, we resolve it.
  res.json({
    id: result.id,
    status: 'Success',
    timestamp: new Date().toISOString(),
    api_response: `200 OK - Message dispatched successfully to WhatsApp/Email gateways for customer ID ${customer_id}`
  });
}));

app.put('/api/communications/:id/status', asyncHandler(async (req, res) => {
  const commId = req.params.id;
  const { status } = req.body;
  await dbQuery.run('UPDATE communication_logs SET status = ? WHERE id = ?', [status, commId]);
  res.json({ message: 'Communication log status updated successfully' });
}));

// -------------------------------------------------------------
// 7. Smart AI Suggestions & Delay Engine (AI Layer Rules)
// -------------------------------------------------------------
app.get('/api/ai/insights', asyncHandler(async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const insights = [];

  // Insight 1: Overdue Equipment Follow-up Alert
  const overdueRentals = await dbQuery.all(`
    SELECT r.id, r.expected_return_date, c.name, c.phone, c.id AS customer_id, 
           (SELECT GROUP_CONCAT(eq.name, ', ') FROM rental_items ri JOIN equipment eq ON ri.equipment_id = eq.id WHERE ri.rental_id = r.id) AS equipment_names
    FROM equipment_rentals r
    JOIN customers c ON r.customer_id = c.id
    WHERE (r.status = 'Overdue' OR (r.status = 'Out for Rental' AND r.expected_return_date < ?))
      AND r.actual_return_date IS NULL
  `, [todayStr]);

  for (let item of overdueRentals) {
    insights.push({
      id: `overdue-${item.id}`,
      customer_id: item.customer_id,
      phone: item.phone,
      type: 'delay',
      priority: 'high',
      title: `Overdue Equipment: ${item.name}`,
      message: `${item.name} has not returned [${item.equipment_names}] which was due on ${item.expected_return_date}.`,
      suggestedAction: `Send WhatsApp return reminder to ${item.phone}.`,
      template: `Hi ${item.name}! Friendly reminder from SD Digitals. Your rental of [${item.equipment_names}] was expected back on ${item.expected_return_date}. Please let us know if you need to extend the booking or schedule a return pickup. Thank you!`
    });
  }

  // Insight 2: Quote Pending Follow-up
  // Look for rentals created in "Quote Sent" state more than 2 days ago
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

  const pendingQuotes = await dbQuery.all(`
    SELECT r.id, r.rental_date, c.name, c.phone, c.id AS customer_id, r.cost_estimate
    FROM equipment_rentals r
    JOIN customers c ON r.customer_id = c.id
    WHERE r.status = 'Quote Sent' AND r.rental_date <= ?
  `, [twoDaysAgoStr]);

  for (let item of pendingQuotes) {
    insights.push({
      id: `quote-${item.id}`,
      customer_id: item.customer_id,
      phone: item.phone,
      type: 'sales',
      priority: 'medium',
      title: `Quote Follow-up Pending: ${item.name}`,
      message: `Quote of INR ${item.cost_estimate} was sent to ${item.name} over 2 days ago on ${item.rental_date}. No decision response logged.`,
      suggestedAction: `Call customer to negotiate/confirm order.`,
      template: `Hi ${item.name}, I wanted to quickly follow up on the equipment rental quote we sent for your upcoming shoot on ${item.rental_date}. Let us know if you need any adjustments to the gear list or budget. We are happy to help! - SD Digitals`
    });
  }

  // Insight 3: Post-Rental Relationship Follow-up
  // Customer returned gear within the last 7 days, but no follow-up is logged or scheduled since
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const postRentals = await dbQuery.all(`
    SELECT r.id, r.actual_return_date, c.name, c.phone, c.id AS customer_id,
           (SELECT COUNT(*) FROM communication_logs cl WHERE cl.customer_id = c.id AND cl.created_at >= r.actual_return_date) AS followups_done
    FROM equipment_rentals r
    JOIN customers c ON r.customer_id = c.id
    WHERE r.status = 'Returned' AND r.actual_return_date >= ? AND followups_done = 0
  `, [sevenDaysAgoStr]);

  for (let item of postRentals) {
    insights.push({
      id: `relationship-${item.id}`,
      customer_id: item.customer_id,
      phone: item.phone,
      type: 'relationship',
      priority: 'medium',
      title: `Post-Rental Follow-up: ${item.name}`,
      message: `${item.name} returned equipment on ${item.actual_return_date}. No post-rental thank-you or feedback conversation has been registered.`,
      suggestedAction: `Check shoot outcome and log review.`,
      template: `Hi ${item.name}! Hope your shoot went great. We wanted to confirm the equipment was returned in perfect condition. How was your experience with the cameras and lenses? We would love to hear your feedback! - SD Digitals`
    });
  }

  // Insight 4: Re-engage Churn-Risk customers
  const churnCustomers = await dbQuery.all(`
    SELECT c.id, c.name, c.phone, c.notes
    FROM customers c
    WHERE c.status = 'Churn-Risk'
  `);

  for (let item of churnCustomers) {
    insights.push({
      id: `churn-${item.id}`,
      customer_id: item.id,
      phone: item.phone,
      type: 'churn',
      priority: 'low',
      title: `Re-engage Churn-Risk: ${item.name}`,
      message: `${item.name} is flagged as Churn-Risk. (Notes: ${item.notes || 'No recent rentals'}).`,
      suggestedAction: `Send re-engagement promotional code.`,
      template: `Hi ${item.name}, we haven't seen you at SD Digitals in a while! We have recently updated our camera inventory with the new Sony FX6 units and Prime kits. Use code SDWELCOME10 for a 10% discount on your next equipment rental booking. Let us know if you have any upcoming projects!`
    });
  }

  // Insight 5: Equipment Shortage Alert
  // If all cameras are rented, flag a shortage warning
  const cameraInventory = await dbQuery.all("SELECT status FROM equipment WHERE category = 'Camera'");
  const totalCameras = cameraInventory.length;
  const rentedCameras = cameraInventory.filter(c => c.status === 'Rented').length;

  if (totalCameras > 0 && (rentedCameras / totalCameras) >= 0.75) {
    insights.push({
      id: `shortage-camera`,
      type: 'inventory',
      priority: 'high',
      title: 'Camera Inventory Bottleneck',
      message: `High Demand: ${rentedCameras}/${totalCameras} (${Math.round((rentedCameras/totalCameras)*100)}%) camera bodies are currently rented out. Upcoming inquiries might face availability conflicts.`,
      suggestedAction: 'Consider rate optimizations or coordinate sub-leases with partner vendors.',
      template: null
    });
  }

  res.json(insights);
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred: ' + err.message });
});

// Start listening after database tables are validated
dbInitialized.then(() => {
  app.listen(PORT, () => {
    console.log(`SD Digitals Rental Tracker API server running on: http://localhost:${PORT}`);
  });
});

module.exports = app;
