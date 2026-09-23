-- ============================================================
-- Nanny — sample data
-- Passwords below are bcrypt hashes of 'password123'
-- ============================================================

INSERT INTO users (full_name, email, phone, password_hash, role, avatar_url, address) VALUES
('Admin Root',      'admin@nanny.kz',  '+7 777 000 0001',
 '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC', 'admin', NULL, 'Almaty'),
('Anara Armankyzy', 'anara@nanny.kz',  '+7 777 029 6982',
 '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC', 'owner',
 'https://i.pravatar.cc/150?img=47', 'Nusupbekov 188, Almaty'),
('Zarina K.',       'zarina@nanny.kz', '+7 777 111 2233',
 '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC', 'owner',
 'https://i.pravatar.cc/150?img=32', 'Abay 52, Almaty'),
('Anna K.',         'anna@nanny.kz',   '+7 777 222 3344',
 '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC', 'sitter',
 'https://i.pravatar.cc/150?img=25', 'Bostandyk, Almaty'),
('Timur S.',        'timur@nanny.kz',  '+7 777 333 4455',
 '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC', 'sitter',
 'https://i.pravatar.cc/150?img=12', 'Medeu, Almaty'),
('Diana M.',        'diana@nanny.kz',  '+7 777 444 5566',
 '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC', 'sitter',
 'https://i.pravatar.cc/150?img=49', 'Almaly, Almaty'),
('Arman T.',        'arman@nanny.kz',  '+7 777 555 6677',
 '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC', 'sitter',
 'https://i.pravatar.cc/150?img=15', 'Auezov, Almaty');

-- Pets
INSERT INTO pets (owner_id, name, pet_type, gender, age, size, care_type, behavior, health, description, photo_url) VALUES
(2, 'Chopik', 'dog', 'boy',  3, 'medium', 'easy',   'friendly, playful',  'vaccinated',  'Golden retriever, loves walks', 'https://placedog.net/400/300?id=1'),
(2, 'Bobik',  'dog', 'boy',  5, 'large',  'medium', 'calm, well-behaved', 'vaccinated',  'Labrador, needs daily walks',  'https://placedog.net/400/300?id=2'),
(3, 'Mura',   'cat', 'girl', 2, 'small',  'easy',   'calm, independent',  'sterilized',  'Domestic shorthair',           'https://placekitten.com/400/300');

-- Sitter profiles
INSERT INTO sitters (
  user_id, description, experience_yrs, city, district, latitude, longitude, price_per_day,
  rating, rating_count, fraud_score, is_flagged, is_verified, review_status, admin_notes, reviewed_by, reviewed_at
) VALUES
(4, 'Experienced dog walker. I love big breeds and long walks.',     5, 'Almaty', 'Bostandyk', 43.238949, 76.889709, 5000, 4.9, 24, 0.08, FALSE, TRUE,  'approved', 'All documents verified. Strong experience with large breeds.', 1, NOW()),
(5, 'Home boarding for small and medium dogs. Calm house.',          3, 'Almaty', 'Medeu',     43.256670, 76.928611, 6000, 4.6, 18, 0.14, FALSE, TRUE,  'approved', 'Approved after profile and pricing review.', 1, NOW()),
(6, 'Cat specialist. Feeding, play, medication on schedule.',        4, 'Almaty', 'Almaly',    43.245521, 76.945465, 4500, 4.4, 15, 0.22, FALSE, TRUE,  'approved', 'Verified cat-care experience and communication.', 1, NOW()),
(7, 'New sitter. Friendly, punctual, ready to help.',                1, 'Almaty', 'Auezov',    43.222015, 76.851248, 3500, 4.3,  6, 0.41, FALSE, FALSE, 'new', NULL, NULL, NULL);

-- Services per sitter
INSERT INTO sitter_services (sitter_id, service, price) VALUES
(1, 'walking',    2000), (1, 'home_visit', 3000),
(2, 'boarding',   6000), (2, 'walking',    2500),
(3, 'home_visit', 3000), (3, 'grooming',   4000),
(4, 'walking',    1800);

-- Bookings
INSERT INTO bookings (owner_id, sitter_id, pet_id, service, start_date, end_date, total_price, status, notes) VALUES
(2, 1, 1, 'walking',  '2026-04-20', '2026-04-22',  6000, 'confirmed', 'Two walks per day please'),
(2, 2, 2, 'boarding', '2026-05-10', '2026-05-15', 30000, 'pending',   'Bobik is on special diet'),
(3, 3, 3, 'home_visit','2026-04-25','2026-04-25',  3000, 'completed', 'Feed twice, play 20 min');

-- Messages (owner <-> sitter)
INSERT INTO messages (sender_id, receiver_id, body) VALUES
(2, 4, 'Hello, I will be your pet sitter'),
(4, 2, 'Hello there! Okay'),
(4, 2, 'Let''s have a call to discuss everything?'),
(2, 4, 'Sure, calling now');

-- Review for completed booking #3
INSERT INTO reviews (booking_id, author_id, sitter_id, rating, body) VALUES
(3, 3, 3, 5, 'Diana was amazing with Mura. Sent photos, followed the feeding schedule exactly. Highly recommend.');

-- Shop products
INSERT INTO products (title, category, description, price, image_url, stock) VALUES
('Premium Dog Food 3kg', 'food',   'Balanced dry food for adult dogs',         8500,  'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400', 40),
('Cat Food Salmon 2kg',  'food',   'Grain-free salmon recipe',                 7200,  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400', 35),
('Leather Collar M',     'collar', 'Soft leather collar, medium size',         3500,  'https://images.unsplash.com/photo-1585499193951-b18ab7cde86f?w=400', 25),
('Reflective Collar L',  'collar', 'Night-safe reflective collar',             2800,  'https://images.unsplash.com/photo-1601758124277-f0086d5ab050?w=400', 30),
('Rope Ball Toy',        'toy',    'Durable rope + ball for fetch',            1500,  'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=400', 60),
('Plush Mouse (cat)',    'toy',    'Catnip-filled plush toy',                  900,   'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400', 80);

-- Example order
INSERT INTO orders (user_id, total, status, address) VALUES
(2, 11500, 'paid', 'Nusupbekov 188, Almaty');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 8500),
(1, 5, 2, 1500);

-- Example real-time booking updates
INSERT INTO booking_updates (booking_id, sender_id, update_type, body, photo_url, status_label) VALUES
(1, 4, 'status', 'Started the first walk in Panfilov Park.', NULL, 'Walk started'),
(1, 4, 'photo', 'Chopik is happy and active.', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=900&auto=format&fit=crop', NULL),
(1, 4, 'update', 'Water break done. Everything is going well.', NULL, NULL);
