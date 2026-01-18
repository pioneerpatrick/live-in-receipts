# cPanel Deployment Guide

This guide explains how to deploy this application to cPanel hosting with the domain `reciepts.live-inproperties.co.ke`.

## Prerequisites

- Node.js 18+ installed locally
- Git installed locally
- cPanel hosting access
- FTP client (FileZilla) or cPanel File Manager access

## Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

## Step 2: Configure Environment Variables

Create a `.env.production` file in the project root with your Supabase credentials:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://ftaxseqdkhioxpfjmxgx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXhzZXFka2hpb3hwZmpteGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzODIzODQsImV4cCI6MjA4MTk1ODM4NH0.XhNKlQqVZgnetYnT0MfuM7WZfpt7B_6beK4QjG4nuRI
VITE_SUPABASE_PROJECT_ID=ftaxseqdkhioxpfjmxgx
```

> **Note:** These are your publishable (anon) keys and are safe to include in client-side code. They are NOT secret keys.

## Step 3: Install Dependencies and Build

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with all the production-ready files.

## Step 4: Upload to cPanel

### Option A: Using File Manager

1. Log in to your cPanel
2. Go to **File Manager**
3. Navigate to `public_html` for your domain `reciepts.live-inproperties.co.ke`
4. Delete any existing files (backup first if needed)
5. Upload all contents from the `dist/` folder
6. Make sure `.htaccess` is uploaded (enable "Show Hidden Files" in File Manager)

### Option B: Using FTP (FileZilla)

1. Connect to your cPanel via FTP:
   - Host: `ftp.live-inproperties.co.ke` (or your server IP)
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21

2. Navigate to `public_html/reciepts` or the folder for your subdomain

3. Upload all contents from the `dist/` folder

## Step 5: Verify .htaccess

Ensure the `.htaccess` file exists in your public_html with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

This enables client-side routing to work correctly with React Router.

## Step 6: Configure SSL (Recommended)

1. In cPanel, go to **SSL/TLS** or **Let's Encrypt SSL**
2. Issue a free SSL certificate for `reciepts.live-inproperties.co.ke`
3. Force HTTPS redirect in your `.htaccess`:

```apache
# Force HTTPS (add before RewriteEngine On)
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## Step 7: Update Production URL in App

After deployment, update your Production URL in the app settings:

1. Log in to the deployed app as admin
2. Go to **Settings**
3. Update **Production URL** to: `https://reciepts.live-inproperties.co.ke`
4. Save settings

This ensures QR codes and payment links point to the correct domain.

## Troubleshooting

### Blank Page After Deployment

- Check browser console for errors
- Verify `.htaccess` is uploaded and has correct content
- Ensure `mod_rewrite` is enabled on your server

### 404 Errors on Page Refresh

- The `.htaccess` file is missing or incorrect
- Contact your hosting provider to enable `mod_rewrite`

### API/Database Not Working

- Verify environment variables are correct in `.env.production`
- Rebuild the app: `npm run build`
- Re-upload the `dist/` folder

### CORS Errors

Your Supabase backend is already configured to accept requests. If you encounter CORS issues, the Lovable Cloud backend should handle them automatically.

## File Structure After Build

```
dist/
├── index.html          # Main HTML file
├── assets/
│   ├── index-xxx.js    # Bundled JavaScript
│   ├── index-xxx.css   # Bundled CSS
│   └── ...             # Other assets
├── .htaccess           # Apache routing config
├── favicon.ico         # Site icon
├── robots.txt          # SEO configuration
└── ...                 # Other public files
```

## Quick Deploy Script

Create a `deploy.sh` script for faster deployments:

```bash
#!/bin/bash

echo "Installing dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Build complete! Upload the 'dist' folder to your cPanel."
echo "Files are ready in: ./dist/"
```

Run with: `chmod +x deploy.sh && ./deploy.sh`

---

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Verify all environment variables are set correctly
3. Ensure the `.htaccess` file is properly uploaded
4. Test the API endpoints are accessible

Your app is now ready for production! 🚀
