# CI / Deploy

## GitHub Pages

Single repo → two apps at:

| App      | URL                                          |
|----------|----------------------------------------------|
| Customer | `https://<user>.github.io/<repo>/`           |
| Admin    | `https://<user>.github.io/<repo>/admin/`     |

### First-time setup

1. **Enable Pages** — repo Settings → Pages → Source: `gh-pages` branch, root `/`

2. **Add secrets** — repo Settings → Secrets → Actions:

   | Secret                | Value                        |
   |-----------------------|------------------------------|
   | `VITE_SUPABASE_URL`   | your Supabase project URL    |
   | `VITE_SUPABASE_ANON_KEY` | your anon/public key      |
   | `VITE_VAPID_PUBLIC_KEY`  | VAPID public key          |

   > `VAPID_PRIVATE_KEY` is server-side only — not needed in the build.

3. **Push to `main`** — workflow triggers automatically.

### Workflow

`.github/workflows/deploy.yml` runs on every push to `main`:

1. Installs deps with `pnpm`
2. Builds `apps/customer` → `gh-pages/`
3. Builds `apps/admin` → `gh-pages/admin/`
4. Publishes `gh-pages/` to the `gh-pages` branch via `peaceiris/actions-gh-pages`

### Manual trigger

Repo → Actions → "Deploy to GitHub Pages" → Run workflow.

## Local build check

```bash
pnpm install
cd apps/customer && pnpm build
cd ../admin && pnpm build
```
