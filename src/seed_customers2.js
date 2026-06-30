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

const customerUpdates = [
  { name: 'Rajesh Kumar', category: 'Filmmaker', phone: '+91 9876543201', status: 'Active' },
  { name: 'Priya Films', category: 'Production House', phone: '+91 9876543202', status: 'VIP' },
  { name: 'Vision Studios', category: 'Studio', phone: '+91 9876543203', status: 'Active' },
  { name: 'Creative Lens', category: 'Photographer', phone: '+91 9876543204', status: 'Active' },
  { name: 'Frame Productions', category: 'Production House', phone: '+91 9876543205', status: 'VIP' },
  { name: 'Cine Craft', category: 'Filmmaker', phone: '+91 9876543206', status: 'Returning' },
  { name: 'Motion House', category: 'Content Creator', phone: '+91 9876543207', status: 'Active' },
  { name: 'Star Media', category: 'Advertising Agency', phone: '+91 9876543208', status: 'VIP' },
  { name: 'Film Factory', category: 'Production House', phone: '+91 9876543209', status: 'Active' },
  { name: 'Dream Works Studio', category: 'Studio', phone: '+91 9876543210', status: 'Returning' },
  { name: 'Pixel Productions', category: 'Filmmaker', phone: '+91 9876543211', status: 'Active' },
  { name: 'Light House Films', category: 'Production House', phone: '+91 9876543212', status: 'VIP' },
  { name: 'Visual Edge', category: 'Photographer', phone: '+91 9876543213', status: 'Active' },
  { name: 'Focus Media', category: 'Content Creator', phone: '+91 9876543214', status: 'Returning' },
  { name: 'Elite Weddings', category: 'Wedding Cinematographer', phone: '+91 9876543215', status: 'VIP' },
  { name: 'ABC Advertising', category: 'Advertising Agency', phone: '+91 9876543216', status: 'Active' },
  { name: 'TechVision Ltd', category: 'Corporate Client', phone: '+91 9876543217', status: 'Active' },
  { name: 'Discovery Media', category: 'Broadcaster', phone: '+91 9876543218', status: 'VIP' },
  { name: 'Rhythm Studios', category: 'Music Production', phone: '+91 9876543219', status: 'Returning' },
  { name: 'Nexus Corp', category: 'Corporate Client', phone: '+91 9876543220', status: 'Active' },
  { name: 'Style House', category: 'Fashion Agency', phone: '+91 9876543221', status: 'Active' },
  { name: 'Urban Creators', category: 'YouTuber Team', phone: '+91 9876543222', status: 'New' },
  { name: 'Silver Screen Works', category: 'Film Production', phone: '+91 9876543223', status: 'VIP' },
  { name: 'Inspire Visuals', category: 'Photographer', phone: '+91 9876543224', status: 'Active' },
  { name: 'Golden Reel Studios', category: 'Production House', phone: '+91 9876543225', status: 'VIP' }
];

async function seed() {
  console.log('Updating customer data...');

  for (let c of customerUpdates) {
    const existing = await dbQuery.get('SELECT id FROM customers WHERE name = ?', [c.name]);
    if (existing) {
      await dbQuery.run('UPDATE customers SET type = ?, phone = ?, status = ? WHERE id = ?', 
        [c.category, c.phone, c.status, existing.id]);
    } else {
      await dbQuery.run('INSERT INTO customers (name, email, phone, type, status) VALUES (?, ?, ?, ?, ?)', 
        [c.name, c.name.replace(/\\s+/g, '').toLowerCase() + '@example.com', c.phone, c.category, c.status]);
    }
  }

  console.log('Customer update complete!');
  db.close();
}

seed();
