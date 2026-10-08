# SELECT SHOP WhatsApp Cloud API foundation

STATUS: SOURCE PREPARED IN AN ISOLATED GIT BRANCH. NOT DEPLOYED, NOT CONNECTED.

Safety: the existing WhatsApp Business App account must remain untouched. Do not register the existing number through the normal exclusive Cloud API phone registration process. WhatsApp Business App Coexistence requires a supported official Embedded Signup path and may require a Tech Provider/Solution Partner. Check actual number eligibility before any registration.

This is a separate Cloudflare Worker and private D1 inbox. It does not alter the public store and does not send messages or cause WhatsApp fees.

Implemented: GET /meta/webhook verifies Meta challenge; POST /meta/webhook checks the X-Hub-Signature-256 HMAC with App Secret; inbound messages (and possible coexistence echoes) are deduplicated and written to private D1. Authenticated GET /api/conversations and GET /api/messages?phone=201xxxxxxxxx return only the authorized owner's chats. GET /health is publicly readable but does not reveal any customer data.

DEPLOY ONLY AFTER ACCOUNT OWNERSHIP IS VERIFIED:
1. Log in to a free Cloudflare Workers account via official OAuth, install dependencies (npm install), run npm run deploy. D1 may be auto-provisioned by Wrangler.
2. Run npm run migrate to apply schema.sql to the D1 database.
3. Set encrypted Cloudflare Worker secrets using wrangler secret put: WEBHOOK_VERIFY_TOKEN, META_APP_SECRET, ADMIN_API_KEY and META_PHONE_NUMBER_ID (phone number ID is not a phone number).
4. Connect the HTTPS callback YOUR_WORKER_URL/meta/webhook and matching verification token through Meta WhatsApp app settings after eligible registration and select messages subscription.
5. Verify on a test number before handling actual customer chats. Existing chat history is NOT assumed to import. No public web UI, auto replies, outbound sending, or ChatGPT MCP connector is active.

NEVER share passwords, Facebook tokens, WhatsApp 2FA PINs, or Cloudflare secrets in this public GitHub repository or ChatGPT messages. Use secret storage.

COST: Workers Free and D1 Free have limits. WhatsApp API billing may apply; this code never sends an API message. Do not activate billing or purchase any plan without the owner's explicit consent.

Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/
https://developers.cloudflare.com/workers/platform/limits/
https://developers.cloudflare.com/workers/configuration/secrets/
https://developers.cloudflare.com/workers/wrangler/configuration/
