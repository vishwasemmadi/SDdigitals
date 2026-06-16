// Automated Verification Test Suite for SD Digitals Rental CRM
const { dbQuery, dbInitialized } = require('./db');

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('RUNNING SYSTEM INTEGRITY & DATABASE ASSERTION CHECKS');
  console.log('----------------------------------------------------');
  
  try {
    // Wait for SQLite database to connect and tables to construct
    await dbInitialized;
    console.log('✔ DB Connection & Schema check passed.');

    // 1. Assert tables are present and populated
    const customersCount = await dbQuery.get('SELECT COUNT(*) AS count FROM customers');
    console.log(`✔ Customers Count: ${customersCount.count}`);
    if (customersCount.count === 0) throw new Error('Customers table is empty!');

    const equipmentCount = await dbQuery.get('SELECT COUNT(*) AS count FROM equipment');
    console.log(`✔ Equipment Count: ${equipmentCount.count}`);
    if (equipmentCount.count === 0) throw new Error('Equipment table is empty!');

    const rentalsCount = await dbQuery.get('SELECT COUNT(*) AS count FROM equipment_rentals');
    console.log(`✔ Rentals Count: ${rentalsCount.count}`);
    if (rentalsCount.count === 0) throw new Error('Equipment Rentals table is empty!');

    const projectsCount = await dbQuery.get('SELECT COUNT(*) AS count FROM projects');
    console.log(`✔ Production Projects Count: ${projectsCount.count}`);
    if (projectsCount.count === 0) throw new Error('Projects table is empty!');

    // 2. Validate Relational Operations: Join check
    const joinResult = await dbQuery.all(`
      SELECT r.id, c.name, i.amount
      FROM equipment_rentals r
      JOIN customers c ON r.customer_id = c.id
      JOIN invoices i ON i.rental_id = r.id
      LIMIT 1
    `);
    if (joinResult.length > 0) {
      console.log(`✔ Relational constraints verify: Rental ID #${joinResult[0].id} links to client "${joinResult[0].name}" for amount ${joinResult[0].amount}.`);
    } else {
      throw new Error('Join test failed or returned no records.');
    }

    // 3. Test Delay Detection Rules (AI Suggestions Heuristics)
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueRentals = await dbQuery.all(`
      SELECT r.id, c.name 
      FROM equipment_rentals r
      JOIN customers c ON r.customer_id = c.id
      WHERE (r.status = 'Overdue' OR (r.status = 'Out for Rental' AND r.expected_return_date < ?))
        AND r.actual_return_date IS NULL
    `, [todayStr]);
    console.log(`✔ Heuristic check - Overdue Rentals detected: ${overdueRentals.length}`);

    const pendingQuotes = await dbQuery.all(`
      SELECT r.id, c.name
      FROM equipment_rentals r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.status = 'Quote Sent'
    `);
    console.log(`✔ Heuristic check - Pending Quotes in funnel: ${pendingQuotes.length}`);

    console.log('----------------------------------------------------');
    console.log('✔ ALL AUTOMATED TEST ASSERTIONS PASSED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
    process.exit(0);

  } catch (err) {
    console.error('❌ SYSTEM INTEGRITY CHECKS FAILED:');
    console.error(err);
    process.exit(1);
  }
}

runTests();
