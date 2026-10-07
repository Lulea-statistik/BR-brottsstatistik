# Statistikchatt – Cloudflare Worker

Backend-proxy för chatten i GitHub Pages-rapporten. API-nyckeln exponeras aldrig i `docs/`.

## Rekommenderad driftsättning via GitHub Actions

Lägg in följande **Repository secrets** under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` – Cloudflare API-token med rätt att publicera Workers.
- `CLOUDFLARE_ACCOUNT_ID` – Cloudflare Account ID.
- `MISTRAL_API_KEY` – Mistral API-nyckeln.

Kör sedan workflowet **Deploy statistics chat Worker** via **Actions → Deploy statistics chat Worker → Run workflow**.

Workflowet gör därefter automatiskt följande:

1. publicerar Cloudflare Workern,
2. lägger in `MISTRAL_API_KEY` som Cloudflare-secret,
3. läser Worker-adressen från Wrangler,
4. skriver adressen till `docs/chat-config.js`,
5. committar konfigurationen till `main`.

Ingen API-nyckel skrivs till repot.

## Manuell reservväg

Om automatisk URL-detektering skulle misslyckas kan Workern publiceras manuellt:

```
npx wrangler login
npx wrangler secret put MISTRAL_API_KEY --config worker/wrangler.jsonc
npx wrangler deploy --config worker/wrangler.jsonc
```

Sätt därefter Worker-URL:en i `docs/chat-config.js`.

## V1-begränsning

Chatten får rapportens aktuella filter och, när både kommun och brottskategori är valda, hela årsserien för just det urvalet. Modellen ska inte hitta på statistik som saknas i underlaget.
