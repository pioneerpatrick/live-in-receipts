# Complete Database Backup - Live-IN Properties
**Generated:** 2026-01-26  
**Project:** Live-IN Properties Receipt System

## Database Summary
| Table | Records |
|-------|---------|
| clients | 98 |
| payments | 354 |
| projects | 10 |
| plots | 183 |
| expenses | 8 |
| cancelled_sales | 23 |
| company_settings | 1 |
| backup_settings | 1 |
| profiles | 5 |
| user_roles | 5 |
| **Total** | **688** |

---

## How to Transfer Data to Client's Account

### Option 1: Use the Built-in Backup Feature (Recommended)
1. Log into the app at https://receipts.live-inproperties.co.ke
2. Go to **Settings → Backup**
3. Click **"Download Backup"** to get a complete JSON file
4. In the client's new system, go to **Settings → Backup → Restore**
5. Upload the JSON file and select "Replace existing data"

### Option 2: Use Cloud Backup Storage
Daily backups are stored in Supabase storage bucket `database-backups`:
- Path: `scheduled/backup-YYYY-MM-DD-timestamp.json`
- Latest backup: 2026-01-26 02:00 UTC

### Option 3: Direct SQL Restore
The SQL file `database-backup-2026-01-26.sql` contains INSERT statements for core tables.

---

## Database Connection Info
**Project ID:** `ftaxseqdkhioxpfjmxgx`  
**Supabase URL:** `https://ftaxseqdkhioxpfjmxgx.supabase.co`

---

## Important Notes for Migration

### 1. Schema Must Be Created First
Before importing data, ensure the new project has the same database schema. The schema is defined in `supabase/migrations/` folder.

### 2. User Authentication
User accounts (auth.users) are separate from the data. The client will need to:
- Create new user accounts in their Supabase project
- Update `user_roles` and `profiles` tables with new user IDs

### 3. Storage Buckets
Create these storage buckets in the new project:
- `company-logos` (public)
- `database-backups` (private)

### 4. Edge Functions
Deploy all edge functions from `supabase/functions/`:
- `daily-payment-reminders`
- `delete-user`
- `reset-user-password`
- `scheduled-backup`
- `send-email`

### 5. Secrets Required
Add these secrets in the new Supabase project:
- `RESEND_API_KEY` - For email notifications

---

## Quick Data Export Commands

To export each table as JSON via the app's backup feature, use **Settings → Backup → Download Backup**.

For direct database access, the client can use Supabase Dashboard → SQL Editor → Run queries like:
```sql
SELECT * FROM clients ORDER BY created_at;
SELECT * FROM payments ORDER BY created_at;
SELECT * FROM projects ORDER BY created_at;
SELECT * FROM plots ORDER BY created_at;
```

---

## Contact
For technical support during migration, contact the development team.
