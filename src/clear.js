const { dbQuery, dbInitialized } = require('./db');

async function clearData() {
  console.log('Starting database clearing...');
  try {
    await dbInitialized;

    // Clear existing tables and reset autoincrement sequences
    await dbQuery.exec('PRAGMA foreign_keys = OFF');
    const tables = [
      'communication_logs', 'feedback', 'invoices', 'rental_items', 
      'equipment_rentals', 'artist_assignments', 'artists', 'shots', 
      'scenes', 'scripts', 'projects', 'equipment', 'customers'
    ];
    for (const table of tables) {
      await dbQuery.exec(`DELETE FROM ${table}`);
    }
    await dbQuery.exec("DELETE FROM sqlite_sequence WHERE name IN ('" + tables.join("','") + "')");
    await dbQuery.exec('PRAGMA foreign_keys = ON');
    
    console.log('Database tables cleared successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
}

clearData();
