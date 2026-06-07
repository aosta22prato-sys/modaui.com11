# MODAUI Enterprise Operating Platform

MODAUI is an AI-powered enterprise operating platform for merchant storefronts, finance, inventory, sales, customer service, and administrative control.

## Repository status

- Local git repository initialized
- Remote origin configured as `git@github.com:aosta22prato-sys/modaui.com11.git`
- Current branch renamed to `main`
- Git sync helper available at `scripts/git-sync.sh`

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Build production assets:
   ```bash
   npm run build
   ```
4. Run server after build:
   ```bash
   npm run server
   ```

## Git sync helper

Use the helper script to commit local changes and sync with remote:

```bash
npm run git:sync -- -m "Sync local changes"
```

If the remote origin is not configured or if authentication is required, provide the remote URL via:

```bash
npm run git:sync -- -r https://github.com/your/repo.git -m "Sync local changes"
```

## Notes

- This project uses Node.js, Vite, React, TypeScript, Tailwind CSS, and Express.
- Keep secrets out of source control; `.env*` files are ignored by `.gitignore`.
- The repo is ready for GitHub Codespaces once pushed to the remote.

