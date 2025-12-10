# Fixing White Screen on GitHub Pages

## Immediate Steps to Fix White Screen:

### 1. Set GitHub Secrets (CRITICAL)
Your app needs environment variables. Without them, it shows a white screen.

1. Go to: https://github.com/shivamkanodia19/Datify.AI/settings/secrets/actions
2. Click "New repository secret"
3. Add these two secrets:
   - **Name:** `VITE_SUPABASE_URL`
     **Value:** `https://yxyngiirdiksakmodhuu.supabase.co` (or your Supabase URL)
   
   - **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY`  
     **Value:** Your Supabase anon key (starts with `eyJ...`)

### 2. Enable GitHub Pages with Actions
1. Go to: https://github.com/shivamkanodia19/Datify.AI/settings/pages
2. Under "Source", select **"GitHub Actions"**
3. Save

### 3. Trigger Deployment
- Push any commit to `main` branch, OR
- Go to Actions tab → "Deploy to GitHub Pages" → "Run workflow"

### 4. Verify Deployment
- Wait for the workflow to complete (check Actions tab)
- Visit your GitHub Pages URL
- Open browser console (F12) to check for errors

## Why White Screen Happens:
- Missing environment variables → Supabase client fails to initialize
- JavaScript errors → App crashes before rendering
- Build issues → Assets not deployed correctly

## Quick Test Locally:
```bash
# Set environment variables
$env:VITE_SUPABASE_URL="https://yxyngiirdiksakmodhuu.supabase.co"
$env:VITE_SUPABASE_PUBLISHABLE_KEY="your-key-here"

# Build and test
npm run build
npm run preview
```

If local preview works but GitHub Pages doesn't → environment variables issue.

