// ---- Rep sign-in (Discord) & Premier sales tracking ----
// Setup steps: see TRACKING_SETUP.md.
//
// The web address of your sales worker (sales-worker/ deployed to Cloudflare), e.g.
// "https://mm-sales.yourname.workers.dev". It handles Discord sign-in and stores the sales.
// Leave it as null and the calculator works exactly as before, with no sign-in or tracking.
const TRACKING_API_URL = null;
