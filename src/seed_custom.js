const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

const customersList = [
  'Rajesh Kumar', 'Priya Films', 'Vision Studios', 'Creative Lens', 
  'Frame Productions', 'Cine Craft', 'Motion House', 'Star Media', 
  'Film Factory', 'Dream Works Studio', 'Pixel Productions', 'Light House Films', 
  'Visual Edge', 'Focus Media', 'ABC Advertising', 'Elite Weddings', 
  'TechVision Ltd', 'Discovery Media', 'Rhythm Studios', 'Nexus Corp', 'Style House'
];

const equipmentList = [
  { name: 'Sony FX6 Camera Kit', category: 'Camera' },
  { name: 'Canon C300 Mark III', category: 'Camera' },
  { name: 'DJI Ronin 4D', category: 'Rigging' },
  { name: 'ARRI Alexa Mini LF', category: 'Camera' },
  { name: 'Sony A7S III Kit', category: 'Camera' },
  { name: 'Blackmagic 6K Pro', category: 'Camera' },
  { name: 'RED Komodo Kit', category: 'Camera' },
  { name: 'Sony FX9', category: 'Camera' },
  { name: 'Canon R5 Kit', category: 'Camera' },
  { name: 'DJI Inspire 3', category: 'Rigging' },
  { name: 'ARRI Signature Lens Set', category: 'Lens' },
  { name: 'Sennheiser Audio Kit', category: 'Audio' },
  { name: 'Sony Venice Camera', category: 'Camera' },
  { name: 'Aputure Lighting Kit', category: 'Lighting' }
];

const rentalsData = [
  { customer: 'Rajesh Kumar', equipment: 'Sony FX6 Camera Kit', pickup: '2026-06-18', return: '2026-06-21', status: 'Booked' },
  { customer: 'Priya Films', equipment: 'Canon C300 Mark III', pickup: '2026-06-17', return: '2026-06-20', status: 'Out for Rental' },
  { customer: 'Vision Studios', equipment: 'DJI Ronin 4D', pickup: '2026-06-18', return: '2026-06-22', status: 'Out for Rental' },
  { customer: 'Creative Lens', equipment: 'ARRI Alexa Mini LF', pickup: '2026-06-19', return: '2026-06-24', status: 'Booked' },
  { customer: 'Frame Productions', equipment: 'Sony A7S III Kit', pickup: '2026-06-18', return: '2026-06-20', status: 'Out for Rental' },
  { customer: 'Cine Craft', equipment: 'Blackmagic 6K Pro', pickup: '2026-06-19', return: '2026-06-23', status: 'Booked' },
  { customer: 'Motion House', equipment: 'RED Komodo Kit', pickup: '2026-06-18', return: '2026-06-21', status: 'Out for Rental' }
];

const overdueData = [
  { customer: 'Star Media', equipment: 'Sony FX9', pickup: '2026-06-10', return: '2026-06-15', status: 'Overdue' },
  { customer: 'Film Factory', equipment: 'Canon R5 Kit', pickup: '2026-06-10', return: '2026-06-14', status: 'Overdue' },
  { customer: 'Dream Works Studio', equipment: 'DJI Inspire 3', pickup: '2026-06-10', return: '2026-06-13', status: 'Overdue' },
  { customer: 'Pixel Productions', equipment: 'ARRI Signature Lens Set', pickup: '2026-06-12', return: '2026-06-16', status: 'Overdue' },
  { customer: 'Light House Films', equipment: 'Sennheiser Audio Kit', pickup: '2026-06-12', return: '2026-06-15', status: 'Overdue' },
  { customer: 'Visual Edge', equipment: 'Sony Venice Camera', pickup: '2026-06-08', return: '2026-06-12', status: 'Overdue' },
  { customer: 'Focus Media', equipment: 'Aputure Lighting Kit', pickup: '2026-06-10', return: '2026-06-14', status: 'Overdue' }
];

const projectsData = [
  { title: 'Brand Commercial Shoot', client: 'ABC Advertising', status: 'Equipment Reserved' },
  { title: 'Wedding Film Production', client: 'Elite Weddings', status: 'Shoot Scheduled' },
  { title: 'Product Launch Video', client: 'TechVision Ltd', status: 'Editing' },
  { title: 'Documentary Series', client: 'Discovery Media', status: 'Shoot In Progress' },
  { title: 'Music Video Project', client: 'Rhythm Studios', status: 'Client Review' },
  { title: 'Corporate Interview Series', client: 'Nexus Corp', status: 'Pre-Production' },
  { title: 'Fashion Campaign Shoot', client: 'Style House', status: 'Equipment Reserved' }
];

async function seed() {
  console.log('Seeding custom data...');

  // Create Customers
  for (let c of customersList) {
    const existing = await dbQuery.get('SELECT id FROM customers WHERE name = ?', [c]);
    if (!existing) {
      await dbQuery.run('INSERT INTO customers (name, email, phone, type) VALUES (?, ?, ?, ?)', 
        [c, c.replace(/\\s+/g, '').toLowerCase() + '@example.com', '555-0100', 'Production House']);
    }
  }

  // Create Equipment
  for (let e of equipmentList) {
    const existing = await dbQuery.get('SELECT id FROM equipment WHERE name = ?', [e.name]);
    if (!existing) {
      const serial = 'SN-' + Math.floor(Math.random() * 1000000);
      await dbQuery.run('INSERT INTO equipment (name, category, serial_number, rental_rate, status) VALUES (?, ?, ?, ?, ?)', 
        [e.name, e.category, serial, 2500, 'Available']);
    }
  }

  // Insert Rentals (Active & Confirmed)
  for (let r of rentalsData) {
    const customer = await dbQuery.get('SELECT id FROM customers WHERE name = ?', [r.customer]);
    const equip = await dbQuery.get('SELECT id, rental_rate FROM equipment WHERE name = ?', [r.equipment]);
    
    if (customer && equip) {
      const rental = await dbQuery.run(
        'INSERT INTO equipment_rentals (customer_id, rental_date, expected_return_date, status, cost_estimate) VALUES (?, ?, ?, ?, ?)',
        [customer.id, r.pickup, r.return, r.status, equip.rental_rate * 3]
      );
      await dbQuery.run('INSERT INTO rental_items (rental_id, equipment_id, quantity, rental_rate) VALUES (?, ?, ?, ?)',
        [rental.id, equip.id, 1, equip.rental_rate]);
      await dbQuery.run('UPDATE equipment SET status = ? WHERE id = ?', [r.status === 'Booked' ? 'Rented' : 'Rented', equip.id]);
    }
  }

  // Insert Overdue Rentals
  for (let r of overdueData) {
    const customer = await dbQuery.get('SELECT id FROM customers WHERE name = ?', [r.customer]);
    const equip = await dbQuery.get('SELECT id, rental_rate FROM equipment WHERE name = ?', [r.equipment]);
    
    if (customer && equip) {
      const rental = await dbQuery.run(
        'INSERT INTO equipment_rentals (customer_id, rental_date, expected_return_date, status, cost_estimate) VALUES (?, ?, ?, ?, ?)',
        [customer.id, r.pickup, r.return, r.status, equip.rental_rate * 4]
      );
      await dbQuery.run('INSERT INTO rental_items (rental_id, equipment_id, quantity, rental_rate) VALUES (?, ?, ?, ?)',
        [rental.id, equip.id, 1, equip.rental_rate]);
      await dbQuery.run('UPDATE equipment SET status = ? WHERE id = ?', ['Rented', equip.id]);
    }
  }

  // Insert Projects
  for (let p of projectsData) {
    const customer = await dbQuery.get('SELECT id FROM customers WHERE name = ?', [p.client]);
    if (customer) {
      await dbQuery.run('INSERT INTO projects (customer_id, title, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
        [customer.id, p.title, p.status, '2026-06-20', '2026-07-20']);
    }
  }

  console.log('Seeding complete!');
  db.close();
}

seed();
