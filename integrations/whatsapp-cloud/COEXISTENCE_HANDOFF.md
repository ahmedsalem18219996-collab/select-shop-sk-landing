# SELECT SHOP — official WhatsApp Business App Coexistence handoff

**Decision (8 October 2026): use Coexistence for the current WhatsApp Business App number, never exclusive Cloud API registration.**

## Starting point and hard requirements
- Existing SELECT SHOP WhatsApp Business App **must keep working on the same number**. Do not uninstall, deregister, or migrate it to API-only.
- Do not activate subscriptions or messaging fees, enter a payment card, or send paid Meta message templates without specific owner approval.
- Never place WhatsApp auth tokens, Meta App Secrets, webhook secrets, customer names/phones/messages or OTPs in this public GitHub repository or ChatGPT messages.
- Current storefront remains untouched. Existing checkout is a website-to-WhatsApp deep link, independent of the proposed API link.
- This Git branch contains an isolated, **not deployed** read-only Cloudflare webhook receiver. No WhatsApp number is connected to it.

## Free provider route found from vendor documentation
**Cosend** claims to support official Meta Embedded Signup / WhatsApp Business App Coexistence and remote MCP connection.

- Signup: https://cosend.app/signup
- Pricing: https://cosend.app/pricing
- MCP: https://cosend.app/mcp
- MCP server: https://mcp.cosend.app/mcp
- Vendor-listed Free plan: $0, up to five connections, 1,000 routed messages per month, 100 automation runs/month, 25 AI conversations over lifetime; MCP server and Runtime API included. Direct-delivery mode available.
- **Caveat:** on vendor Free plan, the **hosted shared inbox is not included** (even though a free MCP/REST integration is offered); check product dashboard for exact permissions after creating the account.
- Meta's WhatsApp API messaging charges are **separate from the provider's subscription**. As of 1 Oct 2026 the provider guidance indicates 1,000 free service messages per month, then per-message rates; marketing template charges remain separate. Do not send any API messages until owner approves possible fees.
- Vendor currently advertises a custom OAuth 2.1 remote MCP endpoint, not a ready-installed ChatGPT plugin. This ChatGPT chat currently has **no Cosend / WhatsApp API plugin**; so this is not yet equivalent to connected Meta Ads.
- In October 2026 ChatGPT Plus may not have the full custom MCP write/connect entitlement of Business/Enterprise/Edu; verify actual account capability and do not promise direct send/read from this chat automatically.
- Treat vendor marketing claims as unverified until Meta's own embedded signup screen shows the **Business App coexistence** option with this number, and owner checks requested scopes and privacy policy.

## Exact assisted setup sequence
1. Open Cosend Free signup **in an authorized browser session** (ChatGPT Work cloud browser or user-assisted official Meta OAuth). Confirm $0 Free, no credit card, no purchased plan.
2. Owner authenticates with Meta and proves possession of their WhatsApp Business App number (OTP/QR/prompt performed by owner only).
3. In Meta Embedded Signup, choose **Use existing WhatsApp Business App / Coexistence**. If only "register existing number as Cloud API only" appears, STOP. **Do not deregister** the number from WhatsApp Business App.
4. Inspect provider access requests (message history/customer data, billing). Inform owner that the third-party provider can handle messages; do not consent on their behalf.
5. If connection succeeds, verify WhatsApp Business App sends/receives on the original phone, and test an inbound message from an explicitly authorized test contact. No unsolicited messages.
6. For ChatGPT integration, search the ChatGPT plugin directory for an *installed or available* Cosend connector. If unavailable, only attempt custom MCP connection through eligible account plan/official connector flow; endpoint is https://mcp.cosend.app/mcp and authorization requires user OAuth.
7. Before granting write permissions, start with read-only scopes / inspect whoami and list_conversations. Avoid auto-replies and mass messaging until explicit approval.
8. The read-only Cloudflare Worker in this branch can be used later for private data delivery if Free plan permits webhook override; it needs Cloudflare authorization and secure secrets. **It is not required to create the first Coexistence link.**

## User-visible status
- Prepared code and tested mock webhook, **not deployed**.
- Free supplier route researched, **no supplier account opened** (ChatGPT tools lack authenticated interactive browser for Meta and Cosend).
- **No number connected, no chats read, no customer data copied, no messages sent, no spending initiated.**

## Documentation checked
- https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup
- https://cosend.app/coexistence
- https://cosend.app/pricing
- https://cosend.app/mcp
- https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt
