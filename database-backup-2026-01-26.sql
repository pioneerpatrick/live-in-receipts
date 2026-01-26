-- =====================================================
-- LIVE-IN PROPERTIES DATABASE BACKUP
-- Generated: 2026-01-26
-- Project: Live-IN Properties Receipt System
-- =====================================================

-- =====================================================
-- TABLE: projects (10 records)
-- =====================================================
INSERT INTO projects (id, name, location, description, capacity, total_plots, buying_price, created_at, updated_at) VALUES
('0d327e05-fabf-4919-93e1-45c624bde428', 'RUMURUTI GARDENS', 'RUMURUTI', 'ZERO METERS FROM TARMAC', 32, 36, 1500000, '2026-01-19 10:28:46.239988+00', '2026-01-20 05:42:06.104521+00'),
('f410d034-53d8-41c4-9be8-f1e697258766', 'KONZA PHASE 6', 'KONZA CITY', 'Opposite Konza City and 500M from Msa Road', 16, 16, 5000000, '2026-01-19 10:30:06.407537+00', '2026-01-19 10:30:06.81896+00'),
('fd5a6a3e-e8dd-44a3-90e5-43db24bc8c37', 'KONZA PHASE 2', 'KONZA CITY', '200M From Msa Road', 16, 16, 4500000, '2026-01-19 10:32:27.514733+00', '2026-01-19 13:03:26.263453+00'),
('13b0febb-ed52-4a54-8e81-f6e258ed2107', 'LESHAOO PHASE I', 'KITENGELA KAG', 'Kitengela KAG', 24, 24, 3000000, '2026-01-19 10:34:37.757943+00', '2026-01-19 10:36:31.510602+00'),
('16c9f369-0f52-4f50-956e-d99d2f6f6832', 'LESHAOO PHASE II', 'KITENGELA KAG', '6km From KAG University', 24, 24, 4500000, '2026-01-19 10:36:12.086816+00', '2026-01-19 10:36:12.526094+00'),
('f45b6e73-0ae0-4f59-abc7-854720c5dfb2', 'KONZA PHASE 1', 'KONZA CITY', 'Malili Town', 8, 16, 2500000, '2026-01-19 10:37:31.179086+00', '2026-01-19 12:19:41.610952+00'),
('0fa9380b-0f4a-4687-9a4f-04d7a20db4ec', 'KCA GARDENS', 'KCA UNIVERSITY', '2KM FROM KCA UNIVERSITY', 12, 12, 1500000, '2026-01-19 10:39:26.991957+00', '2026-01-19 10:39:27.336638+00'),
('6148cd05-c770-4d51-916d-591d8b26c43f', 'TULIP GARDENS', 'KONZA TOWN', '600M FROM KONZA TOWN', 16, 15, 1500000, '2026-01-19 10:41:50.943835+00', '2026-01-20 09:21:51.231775+00'),
('8fd2d9e0-9447-4ec3-ab3a-499c7a91a047', 'KONZA PHASE 3', 'KONZA TOWN', 'KONZA TOWN', 8, 8, 2000000, '2026-01-19 10:43:47.110169+00', '2026-01-19 10:43:47.484474+00'),
('c045ff07-aace-4c1c-968c-ec24b66e8ce6', 'KONZA PHASE 5', 'KONZA CITY', NULL, 18, 16, 450000, '2026-01-19 17:17:06.487105+00', '2026-01-20 10:57:46.456704+00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  capacity = EXCLUDED.capacity,
  total_plots = EXCLUDED.total_plots,
  buying_price = EXCLUDED.buying_price,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- TABLE: company_settings (1 record)
-- =====================================================
INSERT INTO company_settings (id, company_name, company_tagline, phone, email, email_secondary, social_handle, website, address, po_box, receipt_footer_message, receipt_watermark, production_url, logo_url, signature_url, created_at, updated_at) VALUES
('4df239a5-8158-4826-94d8-268a2ba523e0', 'LIVE-IN PROPERTIES', 'Your Dream Home Awaits', '+254 700 000 000', 'info@live-inproperties.co.ke', 'reciepts@live-inproperties.co.ke', 'Live-IN Properties', 'https://live-inproperties.co.ke', 'Nairobi, Kenya', 'P.O. Box 530-00241, KITENGELA', 'Thank you for your payment! For inquiries, contact us.', 'LIVE-IN PROPERTIES', 'https://receipts.live-inproperties.co.ke', NULL, NULL, '2026-01-18 20:28:16.323379+00', '2026-01-20 07:22:13.025385+00')
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  company_tagline = EXCLUDED.company_tagline,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  email_secondary = EXCLUDED.email_secondary,
  social_handle = EXCLUDED.social_handle,
  website = EXCLUDED.website,
  address = EXCLUDED.address,
  po_box = EXCLUDED.po_box,
  receipt_footer_message = EXCLUDED.receipt_footer_message,
  receipt_watermark = EXCLUDED.receipt_watermark,
  production_url = EXCLUDED.production_url,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- TABLE: backup_settings (1 record)
-- =====================================================
INSERT INTO backup_settings (id, auto_backup_enabled, backup_frequency, last_backup_at, next_backup_at, retention_days, notification_email, email_notifications_enabled, created_at, updated_at) VALUES
('65c106cc-1eec-4cd0-a221-d1f213a7c2b3', true, 'daily', '2026-01-26 02:00:12.862+00', '2026-01-27 02:00:13.414+00', 90, 'reciepts@live-inproperties.co.ke', true, '2026-01-20 06:10:25.512312+00', '2026-01-20 06:10:25.512312+00')
ON CONFLICT (id) DO UPDATE SET
  auto_backup_enabled = EXCLUDED.auto_backup_enabled,
  backup_frequency = EXCLUDED.backup_frequency,
  last_backup_at = EXCLUDED.last_backup_at,
  next_backup_at = EXCLUDED.next_backup_at,
  retention_days = EXCLUDED.retention_days,
  notification_email = EXCLUDED.notification_email,
  email_notifications_enabled = EXCLUDED.email_notifications_enabled,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- TABLE: profiles (5 records)
-- =====================================================
INSERT INTO profiles (id, user_id, full_name, created_at, updated_at) VALUES
('35232e40-85eb-4a8a-a2d7-e77e44ef0982', '7c696d54-4bc0-4903-b2d6-32fb0739947a', 'PATRICK', '2026-01-19 07:39:31.256983+00', '2026-01-19 07:39:31.256983+00'),
('ce064021-6049-41a4-bdcd-5a57863778a6', 'a5f86bc4-48e0-4c84-b837-1996d3cb6fde', 'Madaraka Jared', '2026-01-19 07:55:45.371647+00', '2026-01-19 07:55:45.371647+00'),
('4ebc0e78-9b67-4cae-9f50-3e0346e58b46', 'b3a5e44a-fa69-45c1-b1ce-1b541d81b6f5', 'Wycliffe Osuto', '2026-01-19 07:55:45.371647+00', '2026-01-19 07:55:45.371647+00'),
('0dee21ff-c26b-4610-a88f-d56934ad4fbd', 'f6d27202-3e83-4c9a-af91-34a09a2635e2', 'Technopanaly Admin', '2026-01-19 07:55:45.371647+00', '2026-01-19 07:55:45.371647+00'),
('6167ee06-9925-491a-b7ac-c793684e51ed', '60725cd8-7162-4341-b832-315b373ca6b7', 'Samuel Kituku', '2026-01-19 18:08:42.094914+00', '2026-01-19 18:08:42.094914+00')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- TABLE: user_roles (5 records)
-- =====================================================
INSERT INTO user_roles (id, user_id, role) VALUES
('7a1560cb-a756-4aaf-b9dd-21bf14719a57', 'f6d27202-3e83-4c9a-af91-34a09a2635e2', 'admin'),
('f43205fc-8a0b-4021-9b73-deb5932a8486', 'a5f86bc4-48e0-4c84-b837-1996d3cb6fde', 'admin'),
('5021aeab-6d66-4a76-9c4b-031804e7bd3b', 'b3a5e44a-fa69-45c1-b1ce-1b541d81b6f5', 'admin'),
('a3b26e79-52ac-425c-9ab0-92785485bb5b', '7c696d54-4bc0-4903-b2d6-32fb0739947a', 'admin'),
('7ff158a3-e613-47c4-ada2-3ad0c826bfc1', '60725cd8-7162-4341-b832-315b373ca6b7', 'admin')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role;

-- =====================================================
-- TABLE: expenses (8 records)
-- =====================================================
INSERT INTO expenses (id, expense_date, category, description, amount, payment_method, recipient, reference_number, agent_id, client_id, is_commission_payout, notes, created_by, created_at, updated_at) VALUES
('982959ad-3dea-447d-bf8e-79112a07c3df', '2025-12-19 00:00:00+00', 'Commission Payout', 'Sales commission - Sarah Wanjiru', 25000, 'M-Pesa', 'Sarah Wanjiru', NULL, NULL, NULL, true, NULL, NULL, '2026-01-18 19:50:30.561086+00', '2026-01-18 20:28:13.361977+00'),
('4c55221f-a044-4cdb-ad6a-e16bd6512ca6', '2025-12-24 00:00:00+00', 'Marketing', 'Social media advertising campaign', 15000, 'Bank Transfer', 'Digital Marketing Agency', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-18 19:50:30.561086+00', '2026-01-18 20:28:13.361977+00'),
('f2263de0-39e2-44e2-877a-8e18af525d99', '2025-12-29 00:00:00+00', 'Office Supplies', 'Printer paper, ink cartridges, stationery', 5500, 'Cash', 'Office Mart Ltd', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-18 19:50:30.561086+00', '2026-01-18 20:28:13.361977+00'),
('794d151b-e7f2-4b76-a529-70bfc0b22a4d', '2026-01-03 00:00:00+00', 'Transport', 'Site visit fuel and transport costs', 8000, 'M-Pesa', 'James Ochieng', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-18 19:50:30.561086+00', '2026-01-18 20:28:13.361977+00'),
('f4d6d024-9032-4ca8-b200-104fedada1bd', '2026-01-08 00:00:00+00', 'Legal Fees', 'Title deed processing fees', 25000, 'Bank Transfer', 'Wanjiku & Associates Advocates', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-18 19:50:30.561086+00', '2026-01-18 20:28:13.361977+00'),
('ade40bc7-7974-48f2-8547-7c96d1c12269', '2026-01-14 00:00:00+00', 'Refund', 'Refund for cancelled sale - Francis Mungwe (7)', 60000, 'Cash', 'Francis Mungwe', 'EXP-20260120-3458', NULL, 'df2a56b8-7691-4aa4-a980-154416069a8a', false, 'Cancelled sale refund. Original sale: Ksh 400,000, Paid: Ksh 150,000, Refund: Ksh 150,000, Fee: Ksh 90,000. Reason: Financial issues', '60725cd8-7162-4341-b832-315b373ca6b7', '2026-01-20 06:49:57.042532+00', '2026-01-20 06:49:57.042532+00'),
('6d57455d-d890-4c64-8faa-5115e72f0227', '2026-01-20 00:00:00+00', 'Refund', 'Overpayment refund from transfer - Stellarmarris Kanini', 130000, 'Cash', 'Stellarmarris Kanini', 'EXP-20260120-2622', NULL, '7ca79758-a448-4ea4-8fc1-a2546f257e3e', false, 'Transfer overpayment. Old plots: 13 (Ksh 750,000). New plot: 3 (Ksh 400,000). Paid: Ksh 530,000. Refund: Ksh 130,000', '60725cd8-7162-4341-b832-315b373ca6b7', '2026-01-20 07:19:50.607534+00', '2026-01-20 07:19:50.607534+00'),
('ae3b9dce-c364-4b4e-a649-766cd0fa9225', '2025-11-19 00:00:00+00', 'Refund', 'Refund for cancelled sale - Michael ojwang (19)', 20000, 'Cash', 'Michael ojwang', 'EXP-20260120-4406', NULL, 'b51d1e7e-0e58-42f6-a849-14c5d46cce67', false, 'Cancelled sale refund. Original sale: Ksh 650,000, Paid: Ksh 20,000, Refund: Ksh 20,000, Fee: Ksh 0. Reason: Client request', '60725cd8-7162-4341-b832-315b373ca6b7', '2026-01-20 09:26:07.373401+00', '2026-01-20 09:26:07.373401+00')
ON CONFLICT (id) DO UPDATE SET
  expense_date = EXCLUDED.expense_date,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  payment_method = EXCLUDED.payment_method,
  recipient = EXCLUDED.recipient,
  reference_number = EXCLUDED.reference_number,
  notes = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- NOTE: Full clients, payments, plots, and cancelled_sales
-- data is included in the JSON backup file below.
-- The SQL dump above covers core configuration tables.
-- For the complete dataset, use the app's built-in
-- backup/restore feature or the JSON file.
-- =====================================================

-- =====================================================
-- SUMMARY:
-- Projects: 10 records
-- Company Settings: 1 record
-- Backup Settings: 1 record
-- Profiles: 5 records
-- User Roles: 5 records
-- Expenses: 8 records
-- Clients: 98 records (see JSON backup)
-- Payments: 354 records (see JSON backup)
-- Plots: 183 records (see JSON backup)
-- Cancelled Sales: 23 records (see JSON backup)
-- =====================================================
