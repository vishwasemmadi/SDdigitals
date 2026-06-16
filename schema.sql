-- PostgreSQL / MySQL Schema definition for Camera & Equipment Rental CRM

-- 1. Customers Table (Content creators, filmmakers, YouTubers, etc.)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    type VARCHAR(100) NOT NULL, -- e.g., 'Filmmaker', 'Photographer', 'Videographer', 'YouTuber', 'Production House'
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Inactive', 'Churn-Risk'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Equipment Inventory Table
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Camera', 'Lens', 'Audio', 'Lighting', 'Rigging'
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    rental_rate DECIMAL(10, 2) NOT NULL, -- Per-day cost
    status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Rented', 'Maintenance'
    image_url TEXT
);

-- 3. Projects Table (Production, Dubbing, VFX projects managed by SD Digitals)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(100) DEFAULT 'Pre-Production', -- 'Pre-Production', 'Production', 'VFX', 'Dubbing', 'Post-Production', 'Completed'
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 4. Scripts Table (For tracking scripts associated with production/dubbing projects)
CREATE TABLE IF NOT EXISTS scripts (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT 'v1.0',
    content_link TEXT, -- Link to script doc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 5. Scenes Table (Dividing scripts into scenes)
CREATE TABLE IF NOT EXISTS scenes (
    id SERIAL PRIMARY KEY,
    script_id INT NOT NULL,
    scene_number INT NOT NULL,
    description TEXT,
    location VARCHAR(255),
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
);

-- 6. Shots Table (Individual shots under scenes, tracked for VFX/post-production)
CREATE TABLE IF NOT EXISTS shots (
    id SERIAL PRIMARY KEY,
    scene_id INT NOT NULL,
    shot_number INT NOT NULL,
    description TEXT,
    status VARCHAR(100) DEFAULT 'Pending', -- 'Pending', 'Filmed', 'In-VFX', 'Approved'
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

-- 7. Artists Table (Directory of crew members, actors, dubbing artists, VFX editors)
CREATE TABLE IF NOT EXISTS artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL, -- 'Director', 'VFX Artist', 'Editor', 'Dubbing Artist', 'Camera Operator'
    phone VARCHAR(50),
    email VARCHAR(255)
);

-- 8. Artist Assignments (Linking artists to projects)
CREATE TABLE IF NOT EXISTS artist_assignments (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    artist_id INT NOT NULL,
    role_assigned VARCHAR(255),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

-- 9. Equipment Rentals Table (Master rental records)
CREATE TABLE IF NOT EXISTS equipment_rentals (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    project_id INT, -- Optional link to an active production project
    rental_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    status VARCHAR(50) DEFAULT 'Inquiry', -- 'Inquiry', 'Quote Sent', 'Booked', 'Out for Rental', 'Returned', 'Overdue', 'Cancelled'
    cost_estimate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    delivery_status VARCHAR(100) DEFAULT 'Pending', -- 'Pending', 'Dispatched', 'Delivered', 'Picked Up', 'Returned'
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- 10. Rental Items Table (Details of which equipment is in which rental)
CREATE TABLE IF NOT EXISTS rental_items (
    id SERIAL PRIMARY KEY,
    rental_id INT NOT NULL,
    equipment_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    rental_rate DECIMAL(10, 2) NOT NULL, -- Captured rate at booking time
    FOREIGN KEY (rental_id) REFERENCES equipment_rentals(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- 11. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    rental_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Sent', 'Paid', 'Overdue'
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_id) REFERENCES equipment_rentals(id) ON DELETE CASCADE
);

-- 12. Customer Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    rental_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (rental_id) REFERENCES equipment_rentals(id) ON DELETE SET NULL
);

-- 13. Communication Logs Table (Tracking followups, automated messages, reminders)
CREATE TABLE IF NOT EXISTS communication_logs (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Call', 'Email', 'WhatsApp'
    direction VARCHAR(50) NOT NULL, -- 'Inbound', 'Outbound'
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Completed', -- 'Completed', 'Scheduled', 'Failed'
    scheduled_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
