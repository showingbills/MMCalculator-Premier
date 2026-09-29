# Rep sign-in (Discord) & Premier sales leaderboard: setup

Reps sign in with Discord (only members of your server get in), and every Premier **Sold**
is saved with the add-on and commission. Managers open the leaderboard at `admin.html`
(a **Leaderboard** link shows at the bottom of the calculator for them).

Everything runs on free plans with no credit card: a Discord application for sign-in and a
Cloudflare Worker + D1 database that stores the sales. Until step 4 is done, the calculator
works exactly as before (no sign-in).

## 1. Discord application

1. Go to <https://discord.com/developers/applications> → **New Application** → name it
   (e.g. "Mosquito Mike Calculator").
2. Open **OAuth2**. Copy the **Client ID**, then **Reset Secret** and copy the **Client Secret**.
   Keep the secret private.
3. In the Discord app: **User Settings → Advanced → Developer Mode** on. Then:
   - Right-click your server icon → **Copy Server ID**.
   - **Server Settings → Roles** → right-click the manager role → **Copy Role ID**.
     Members with this role can see the leaderboard.

## 2. Cloudflare Worker + database

1. Create a free account at <https://dash.cloudflare.com>.
2. **Storage & Databases → D1 → Create** a database named `mm-sales`.
3. **Workers & Pages → Create → Create Worker**. Name it `mm-sales` and **Deploy**.
   Then **Edit code**, replace everything with the contents of `sales-worker/worker.js`, and **Deploy**.
4. In the Worker: **Settings → Bindings → Add → D1 database**. Variable name `DB`, database `mm-sales`.
   The tables are created automatically.
5. **Settings → Variables and Secrets**, add:

   | Name | Type | Value |
   |---|---|---|
   | `DISCORD_CLIENT_ID` | Text | Client ID from step 1 |
   | `DISCORD_CLIENT_SECRET` | Secret | Client Secret from step 1 |
   | `DISCORD_GUILD_ID` | Text | Server ID |
   | `ADMIN_ROLE_IDS` | Text | Manager role ID (several: separate with commas) |
   | `ALLOWED_ORIGINS` | Text | Where the calculator is hosted, e.g. `https://showingbills.github.io` (no path) |
   | `SESSION_SECRET` | Secret | Any long random string (40+ characters). Changing it signs everyone out. |
   | `REQUIRED_ROLE_IDS` | Text | *Optional.* Only members with one of these roles can sign in (e.g. your Sales role) |
   | `ADMIN_USER_IDS` | Text | *Optional.* Discord user IDs that can see the leaderboard without the role |

6. Copy the Worker's address (e.g. `https://mm-sales.yourname.workers.dev`). Opening it should
   say "Mosquito Mike sales worker is running."

## 3. Connect Discord to the Worker

Back in the Discord developer portal → **OAuth2 → Redirects → Add**:
`https://mm-sales.yourname.workers.dev/callback` (your Worker address + `/callback`) → **Save**.

## 4. Turn it on in the calculator

In `tracking-config.js`, set:

```js
const TRACKING_API_URL = "https://mm-sales.yourname.workers.dev";
```

Publish the site. The calculator now asks for Discord sign-in.

## How it works for reps

- First time: **Sign in with Discord** → Discord asks them to authorize → back in the calculator.
  Their **server nickname** is their name on the leaderboard.
- They stay signed in on that device across days. Every 30 days they tap the button again,
  which re-checks they're still in the server (so anyone who leaves loses access within 30 days).
- **Sold** logs the sale. Changing the add-on afterwards updates it; going Back and choosing
  **Pitched** removes it; Sold twice on the same calc still counts once.
- No signal? The sale waits on the phone and is sent automatically once they're back online.
- Reps can change or remove their own sale for 12 hours. Managers can delete any sale from the
  Sales Log (×), e.g. a test or a cancelled sale.

## Free-plan limits

Cloudflare's free plan allows 100,000 requests a day and 5 GB of data, far more than a sales
team uses. It never pauses and needs no card.
