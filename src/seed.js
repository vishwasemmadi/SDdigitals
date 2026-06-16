const { dbQuery, dbInitialized } = require('./db');

async function seed() {
  console.log('Starting database seeding...');
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
    console.log('Cleared existing database tables.');

    // 1. Seed Customers
    await dbQuery.run(`
      INSERT INTO customers (name, email, phone, type, status, notes) VALUES
      ('Anirudh Sharma', 'anirudh@creatorlabs.in', '+91 98765 43210', 'YouTuber', 'Active', 'Tech YouTuber. Rents high-end cameras and wireless mics. Prefers weekend rentals.'),
      ('Kabir Mehta Films', 'kabir@mehtafilms.co', '+91 91234 56789', 'Filmmaker', 'Active', 'Boutique indie production house. Frequently rents Cinema packages (RED/ARRI). Needs prompt quoting.'),
      ('Priya Nair', 'priya.nair@visuals.com', '+91 98111 22233', 'Photographer', 'Active', 'Fashion & commercial photographer. Rents portrait prime lenses and studio flash units.'),
      ('Apex Studios', 'info@apexstudios.com', '+91 88888 77777', 'Production House', 'Active', 'Full-service advertising agency. Rents complete kits including rigging, lighting, and audio equipment.'),
      ('Rohan Verma', 'rohan.v@vloggers.com', '+91 77777 66666', 'YouTuber', 'Churn-Risk', 'Travel vlogger. Has not rented in 60 days. Last feedback noted rental rates were slightly high.')
    `);
    console.log('Seeded customers.');

    // 2. Seed Equipment
    await dbQuery.run(`
      INSERT INTO equipment (name, category, company, serial_number, rental_rate, status, image_url) VALUES
      ('ARRI Alexa Mini LF', 'Camera', 'ARRI', 'ARRI-LF-9821', 45000.00, 'Rented', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80'),
      ('ARRI Alexa 35', 'Camera', 'ARRI', 'ARRI-A35-102', 55000.00, 'Available', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80'),
      ('RED V-Raptor 8K', 'Camera', 'RED', 'RED-VR-3012', 38000.00, 'Available', 'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=600&q=80'),
      ('RED Komodo-X', 'Camera', 'RED', 'RED-KX-8822', 20000.00, 'Available', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'),
      ('Sony FX6', 'Camera', 'Sony', 'SONY-FX6-5541', 12000.00, 'Rented', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'),
      ('Sony FX9', 'Camera', 'Sony', 'SONY-FX9-1122', 18000.00, 'Available', 'https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=600&q=80'),
      ('Sony Burano', 'Camera', 'Sony', 'SONY-BUR-901', 35000.00, 'Available', 'https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=600&q=80'),
      ('Canon C300 Mark III', 'Camera', 'Canon', 'CANON-C3-1102', 15000.00, 'Available', 'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=600&q=80'),
      ('Canon C70', 'Camera', 'Canon', 'CANON-C70-9921', 8000.00, 'Available', 'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=600&q=80'),
      ('Blackmagic URSA Mini Pro 12K', 'Camera', 'Blackmagic', 'BMD-URSA-12K', 20000.00, 'Available', 'https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=600&q=80'),

      ('ARRI Signature Prime 35mm', 'Lens', 'ARRI', 'ARRI-LN-4431', 8000.00, 'Rented', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=600&q=80'),
      ('ARRI Signature Prime 50mm', 'Lens', 'ARRI', 'ARRI-LN-4450', 8000.00, 'Available', 'https://images.unsplash.com/photo-1617791160536-598cf32026fb?auto=format&fit=crop&w=600&q=80'),
      ('Sony FE 24-70mm GM II', 'Lens', 'Sony', 'SONY-LN-0982', 3000.00, 'Available', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=600&q=80'),
      ('Sony FE 70-200mm GM II', 'Lens', 'Sony', 'SONY-LN-1193', 4000.00, 'Available', 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?auto=format&fit=crop&w=600&q=80'),
      ('Canon CN-E 50mm', 'Lens', 'Canon', 'CANON-LN-50', 4500.00, 'Available', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=600&q=80'),
      ('Zeiss Supreme Prime 50mm', 'Lens', 'Zeiss', 'ZEISS-LN-50', 7000.00, 'Available', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80'),
      ('Sigma Cine Prime 85mm', 'Lens', 'Sigma', 'SIGMA-LN-85', 3500.00, 'Available', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=600&q=80'),

      ('Sennheiser MKH416 Kit', 'Audio', 'Sennheiser', 'SENN-MIC-2201', 1500.00, 'Available', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80'),
      ('Rode NTG5', 'Audio', 'Rode', 'RODE-NTG5-1', 1200.00, 'Available', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80'),
      ('Zoom F8n Pro Recorder', 'Audio', 'Zoom', 'ZOOM-F8N-1', 2000.00, 'Available', 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?auto=format&fit=crop&w=600&q=80'),
      ('Sound Devices MixPre-6 II', 'Audio', 'Sound Devices', 'SD-MP6-1', 2500.00, 'Available', 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?auto=format&fit=crop&w=600&q=80'),
      ('Sennheiser Wireless Mic Kit', 'Audio', 'Sennheiser', 'SENN-WL-1120', 1800.00, 'Available', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80'),
      ('DJI Mic 2', 'Audio', 'DJI', 'DJI-MIC2-1', 1000.00, 'Available', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80'),

      ('Aputure LS 600d Pro', 'Lighting', 'Aputure', 'APUT-LT-8812', 4000.00, 'Available', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80'),
      ('ARRI SkyPanel S60-C', 'Lighting', 'ARRI', 'ARRI-LT-9911', 7000.00, 'Available', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80'),
      ('Aputure Nova P300c', 'Lighting', 'Aputure', 'APUT-NOVA-1', 5500.00, 'Available', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80'),
      ('Nanlite Forza 500', 'Lighting', 'Nanlite', 'NAN-F500-1', 3500.00, 'Available', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80'),
      ('Godox VL300', 'Lighting', 'Godox', 'GOD-VL300-1', 2000.00, 'Available', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80'),

      ('DJI Ronin 2', 'Rigging', 'DJI', 'DJI-RN-7761', 5000.00, 'Maintenance', 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=600&q=80'),
      ('DJI RS 4 Pro', 'Rigging', 'DJI', 'DJI-RS4-1104', 2500.00, 'Available', 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=600&q=80'),
      ('EasyRig Vario 5', 'Rigging', 'EasyRig', 'EASY-V5-1', 3000.00, 'Available', 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=600&q=80'),
      ('Tilta Ring Grip', 'Rigging', 'Tilta', 'TILTA-RG-1', 1500.00, 'Available', 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=600&q=80'),
      ('SmallRig Shoulder Rig', 'Rigging', 'SmallRig', 'SR-SR-1', 800.00, 'Available', 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=600&q=80'),

      ('DJI Inspire 3', 'Drone', 'DJI', 'DJI-IN3-9932', 15000.00, 'Available', 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=600&q=80'),
      ('DJI Mavic 3 Pro Cine', 'Drone', 'DJI', 'DJI-M3P-1', 5000.00, 'Available', 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=600&q=80'),
      ('DJI Air 3S', 'Drone', 'DJI', 'DJI-A3S-1', 3000.00, 'Available', 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=600&q=80'),

      ('SmallHD Cine 7', 'Monitor', 'SmallHD', 'SHD-C7-1', 3000.00, 'Available', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=600&q=80'),
      ('Atomos Shogun Ultra', 'Monitor', 'Atomos', 'ATO-SU-1', 2500.00, 'Available', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=600&q=80'),
      ('Blackmagic Video Assist 7"', 'Monitor', 'Blackmagic', 'BMD-VA7-1', 2000.00, 'Available', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=600&q=80'),

      ('Sachtler Flowtech Tripod', 'Support', 'Sachtler', 'SACH-FT-1', 2500.00, 'Available', 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?auto=format&fit=crop&w=600&q=80'),
      ('Manfrotto 504X Tripod', 'Support', 'Manfrotto', 'MAN-504X-1', 1500.00, 'Available', 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?auto=format&fit=crop&w=600&q=80'),
      ('Dana Dolly Kit', 'Support', 'Dana Dolly', 'DANA-DK-1', 4000.00, 'Available', 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=600&q=80'),
      ('Slider Plus Pro', 'Support', 'Edelkrone', 'EDEL-SPP-1', 2000.00, 'Available', 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=600&q=80'),

      ('1TB CFexpress Card', 'Storage', 'Sony', 'SONY-CFX-1TB', 500.00, 'Available', 'https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&w=600&q=80'),
      ('RED Mini-Mag 1TB', 'Storage', 'RED', 'RED-MAG-1TB', 1000.00, 'Available', 'https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&w=600&q=80'),
      ('Angelbird CFexpress Card', 'Storage', 'Angelbird', 'ANG-CFX-1', 500.00, 'Available', 'https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&w=600&q=80'),
      ('Samsung T7 SSD 2TB', 'Storage', 'Samsung', 'SAM-T7-2TB', 300.00, 'Available', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80'),

      ('V-Mount Battery Kit', 'Accessory', 'IDX', 'IDX-VM-1', 800.00, 'Available', 'https://images.unsplash.com/photo-1624996379697-f01d168b1a52?auto=format&fit=crop&w=600&q=80'),
      ('Teradek Bolt 6 Wireless Kit', 'Accessory', 'Teradek', 'TER-B6-1', 4500.00, 'Available', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80'),
      ('Follow Focus System', 'Accessory', 'Tilta', 'TILTA-FF-1', 1500.00, 'Available', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80'),
      ('Matte Box Kit', 'Accessory', 'SmallRig', 'SR-MB-1', 1000.00, 'Available', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80'),
      ('Camera Cage Kit', 'Accessory', 'SmallRig', 'SR-CC-1', 500.00, 'Available', 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=600&q=80')
    `);
    console.log('Seeded equipment.');

    // 3. Seed Projects
    await dbQuery.run(`
      INSERT INTO projects (customer_id, title, description, status, start_date, end_date) VALUES
      (2, 'The Silent Valley', 'Independent short film. Post-production including dubbing and color grading handled by SD Digitals.', 'Production', '2026-06-01', '2026-06-25'),
      (4, 'Super Sonic Shoes Commercial', 'Ad Campaign VFX production. 12 shots involving chroma keying and 3D modeling.', 'VFX', '2026-06-05', '2026-06-20'),
      (1, 'Tech Review 2026', 'Weekly tech channel review episode. Production editing and rendering assistance.', 'Completed', '2026-05-28', '2026-06-01')
    `);
    console.log('Seeded projects.');

    // 4. Seed Scripts
    await dbQuery.run(`
      INSERT INTO scripts (project_id, title, version, content_link) VALUES
      (1, 'The Silent Valley Script - Final Draft', 'v2.1', 'https://docs.google.com/document/d/silent-valley'),
      (2, 'Super Sonic Shoes Ad Storyboard & Copy', 'v1.0', 'https://docs.google.com/document/d/sonic-shoes')
    `);
    console.log('Seeded scripts.');

    // 5. Seed Scenes
    await dbQuery.run(`
      INSERT INTO scenes (script_id, scene_number, description, location) VALUES
      (1, 1, 'Opening shot: Mist over the hills at dawn. Quiet tension.', 'Munnar Hills'),
      (1, 2, 'Dialogue inside the log cabin between Kabir and the Stranger.', 'Studio Set A'),
      (2, 1, 'Actor sprinting down the street, shoes glowing with energy waves.', 'MG Road Outdoor')
    `);
    console.log('Seeded scenes.');

    // 6. Seed Shots
    await dbQuery.run(`
      INSERT INTO shots (scene_id, shot_number, description, status) VALUES
      (1, 1, 'Wide landscape pan. Mist clearing.', 'Filmed'),
      (1, 2, 'Close up on protagonist looking at watch.', 'Pending'),
      (2, 1, 'Tracking shot of feet hitting the ground (Chroma key)', 'In-VFX'),
      (2, 2, 'Wide angle run shot, CGI lighting trails overlay', 'Pending'),
      (2, 3, 'Product beauty shot spinning in empty space', 'Approved')
    `);
    console.log('Seeded shots.');

    // 7. Seed Artists
    await dbQuery.run(`
      INSERT INTO artists (name, role, phone, email) VALUES
      ('Vikram Roy', 'Director', '+91 99000 11000', 'vikram@sddigitals.com'),
      ('Sneha Patel', 'VFX Artist', '+91 99111 22000', 'sneha@sddigitals.com'),
      ('Amit Sen', 'Dubbing Artist', '+91 99222 33000', 'amit@voiceovers.com'),
      ('John Doe', 'Camera Operator', '+91 99333 44000', 'john@cameramen.org')
    `);
    console.log('Seeded artists.');

    // 8. Seed Artist Assignments
    await dbQuery.run(`
      INSERT INTO artist_assignments (project_id, artist_id, role_assigned) VALUES
      (1, 1, 'Overall Creative Director'),
      (1, 4, 'B-Camera Operator'),
      (2, 2, 'Lead Compositor & CGI Artist')
    `);
    console.log('Seeded assignments.');

    // Fetch equipment lookup map
    const allEq = await dbQuery.all('SELECT id, name FROM equipment');
    const getEqId = (namePrefix) => {
      const eq = allEq.find(e => e.name.startsWith(namePrefix));
      if (!eq) throw new Error("Missing equipment: " + namePrefix);
      return eq.id;
    };

    // 9. Seed Equipment Rentals
    const rent1 = await dbQuery.run(`
      INSERT INTO equipment_rentals (customer_id, project_id, rental_date, expected_return_date, actual_return_date, status, cost_estimate, delivery_status)
      VALUES (1, 3, '2026-05-28', '2026-05-30', '2026-05-30', 'Returned', 27000.00, 'Returned')
    `);
    const rent2 = await dbQuery.run(`
      INSERT INTO equipment_rentals (customer_id, project_id, rental_date, expected_return_date, actual_return_date, status, cost_estimate, delivery_status)
      VALUES (2, 1, '2026-06-03', '2026-06-12', NULL, 'Out for Rental', 477000.00, 'Delivered')
    `);
    const rent3 = await dbQuery.run(`
      INSERT INTO equipment_rentals (customer_id, project_id, rental_date, expected_return_date, actual_return_date, status, cost_estimate, delivery_status)
      VALUES (3, NULL, '2026-06-03', '2026-06-06', NULL, 'Overdue', 12000.00, 'Delivered')
    `);
    const rent4 = await dbQuery.run(`
      INSERT INTO equipment_rentals (customer_id, project_id, rental_date, expected_return_date, actual_return_date, status, cost_estimate, delivery_status)
      VALUES (4, 2, '2026-06-10', '2026-06-15', NULL, 'Quote Sent', 80000.00, 'Pending')
    `);
    const rent5 = await dbQuery.run(`
      INSERT INTO equipment_rentals (customer_id, project_id, rental_date, expected_return_date, actual_return_date, status, cost_estimate, delivery_status)
      VALUES (1, NULL, '2026-06-04', '2026-06-06', '2026-06-06', 'Returned', 15000.00, 'Returned')
    `);
    console.log('Seeded equipment rentals.');

    // 10. Seed Rental Items
    await dbQuery.run(`
      INSERT INTO rental_items (rental_id, equipment_id, quantity, rental_rate) VALUES
      (${rent1.id}, ${getEqId('Sony FX6')}, 1, 12000.00),
      (${rent1.id}, ${getEqId('Sennheiser MKH416 Kit')}, 1, 1500.00)
    `);

    await dbQuery.run(`
      INSERT INTO rental_items (rental_id, equipment_id, quantity, rental_rate) VALUES
      (${rent2.id}, ${getEqId('ARRI Alexa Mini LF')}, 1, 45000.00),
      (${rent2.id}, ${getEqId('ARRI Signature Prime 35mm')}, 1, 8000.00)
    `);

    await dbQuery.run(`
      INSERT INTO rental_items (rental_id, equipment_id, quantity, rental_rate) VALUES
      (${rent3.id}, ${getEqId('Aputure LS 600d Pro')}, 1, 4000.00)
    `);

    await dbQuery.run(`
      INSERT INTO rental_items (rental_id, equipment_id, quantity, rental_rate) VALUES
      (${rent4.id}, ${getEqId('Sony FX6')}, 1, 12000.00),
      (${rent4.id}, ${getEqId('Sony FE 24-70mm GM II')}, 1, 3000.00),
      (${rent4.id}, ${getEqId('DJI Ronin 2')}, 1, 5000.00)
    `);

    await dbQuery.run(`
      INSERT INTO rental_items (rental_id, equipment_id, quantity, rental_rate) VALUES
      (${rent5.id}, ${getEqId('Sony FX6')}, 1, 12000.00),
      (${rent5.id}, ${getEqId('Sony FE 24-70mm GM II')}, 1, 3000.00)
    `);
    console.log('Seeded rental items.');

    // 11. Seed Invoices
    await dbQuery.run(`
      INSERT INTO invoices (rental_id, amount, tax, discount, status, due_date) VALUES
      (${rent1.id}, 27000.00, 4860.00, 0.00, 'Paid', '2026-05-30'),
      (${rent2.id}, 477000.00, 85860.00, 10000.00, 'Sent', '2026-06-15'),
      (${rent3.id}, 12000.00, 2160.00, 0.00, 'Overdue', '2026-06-06'),
      (${rent4.id}, 80000.00, 14400.00, 20000.00, 'Draft', '2026-06-10'),
      (${rent5.id}, 15000.00, 2700.00, 0.00, 'Paid', '2026-06-06')
    `);
    console.log('Seeded invoices.');

    // 12. Seed Feedback
    await dbQuery.run(`
      INSERT INTO feedback (customer_id, rental_id, rating, comments) VALUES
      (1, ${rent1.id}, 5, 'Super clean camera body, quick pickup experience at SD Digitals studio. Highly recommended!'),
      (5, NULL, 3, 'Rental rate is slightly high. The DJI Ronin 2 gimbal was a bit dirty on the ring mount.')
    `);
    console.log('Seeded feedback.');

    // 13. Seed Communication Logs
    await dbQuery.run(`
      INSERT INTO communication_logs (customer_id, type, direction, message, status, scheduled_date, notes) VALUES
      (1, 'WhatsApp', 'Outbound', 'Hello Anirudh, your booking for the Sony FX6 has been confirmed for May 28.', 'Completed', NULL, 'Sent automatically via booking webhook.'),
      (2, 'Call', 'Outbound', 'Discussed rates for the ARRI Alexa Cinema Kit. Agreed on 10k discount due to long-term booking.', 'Completed', NULL, 'Negotiated by Sales executive Amit.'),
      (3, 'WhatsApp', 'Outbound', 'Alert: Your rental package of Aputure LS 600d was due on June 6. Please return it or contact us for extensions.', 'Completed', NULL, 'Overdue reminder alert dispatched.'),
      (4, 'Email', 'Outbound', 'Quote sheet sent for upcoming project Super Sonic Shoes Commercial.', 'Completed', NULL, 'Invoice draft sent.'),
      (1, 'WhatsApp', 'Outbound', 'Follow-up on recent return: Hey Anirudh! Hope the shoot went great. Let us know if you need the Sony FX6 or editing gear for your next video.', 'Scheduled', '2026-06-08 10:00:00', 'Scheduled post-rental relationship check.'),
      (5, 'Call', 'Outbound', 'Scheduled re-engagement call to address high rates and check upcoming vlogging schedules.', 'Scheduled', '2026-06-10 11:30:00', 'Relationship health check.')
    `);
    console.log('Seeded communication logs.');

    console.log('Database seeding successfully completed.');
  } catch (err) {
    console.error('Error during seeding database:', err);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
