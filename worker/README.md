# Statistikchatt – Cloudflare Worker

Detta är backend-proxyn för chatten i GitHub Pages-rapporten.

## Driftsättning

1. Installera Node.js och kör `npm install -D wrangler` i denna mapp.
2. Logga in med `npx wrangler login`.
3. Skapa en Mistral API-nyckel i Mistrals kontrollpanel.
4. Lägg nyckeln som Cloudflare-secret:

   ```
   npx wrangler secret put MISTRAL_API_KEY
   ```

5. Publicera:

   ```
   npx wrangler deploy
   ```

6. Kopiera Worker-URL:en och sätt den i `docs/chat-config.js`:

   ```js
   window.CRIME_CHAT_API_URL = "https://din-worker.workers.dev";
   ```

Lägg aldrig Mistral-nyckeln i `docs/` eller annan klientkod.

## V1-begränsning

Chatten får rapportens aktuella filter och, när både kommun och brottskategori är valda, hela årsserien för just det urvalet. Modellen ska inte hitta på statistik som saknas i underlaget.
