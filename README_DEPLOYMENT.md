# GitHub Pages Deployment Guide

## Setup Instructions

### 1. Enable GitHub Pages
1. Go to your repository Settings → Pages
2. Under "Source", select **"GitHub Actions"** (not "Deploy from a branch")
3. Save

### 2. Set Environment Variables
1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key

### 3. Deploy
- Push to `main` branch
- GitHub Actions will automatically build and deploy
- Check the "Actions" tab for deployment status

## Troubleshooting White Screen

If you see a white screen after deployment:

1. **Check Browser Console (F12)**
   - Look for JavaScript errors
   - Check if assets are loading (Network tab)

2. **Verify Environment Variables**
   - Ensure secrets are set correctly in GitHub
   - Check the build logs in Actions to see if env vars are available

3. **Check Build Output**
   - Go to Actions → Latest workflow run
   - Verify build completed successfully

4. **Verify Base Path**
   - If your repo is at root (e.g., `username.github.io`), base should be `./`
   - If your repo is a subdirectory (e.g., `username.github.io/repo-name`), update `vite.config.ts` base to `'/repo-name/'`

5. **Hard Refresh**
   - Clear cache: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Build locally
npm run build

# The dist folder contains your built files
# Copy everything in dist/ to your gh-pages branch
```

## Notes

- The app uses HashRouter (`#` routing) which works well with GitHub Pages
- The 404.html file handles client-side routing for direct URL access
- Build artifacts are automatically cleaned up after deployment

