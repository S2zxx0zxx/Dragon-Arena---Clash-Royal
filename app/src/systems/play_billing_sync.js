/**
 * Dragon Arena v3.0 — Play Store Digital Goods API (TWA) & Authoritative Cloud Sync Adapter
 * Ready to connect to a Cloudflare Workers / Supabase endpoint & Google Play Billing
 * while staying 100% safe and functional in offline/static GitHub Pages mode.
 */

export const BACKEND_CONFIG = Object.freeze({
  syncEndpoint: '', // Set your Cloudflare Worker / Supabase URL when going live
  playBillingSkuPrefix: 'dragon_arena_',
});

export async function checkPlayDigitalGoodsAvailable() {
  try {
    if (typeof window !== 'undefined' && typeof window.getDigitalGoodsService === 'function') {
      const svc = await window.getDigitalGoodsService('https://play.google.com/billing');
      return !!svc;
    }
  } catch { /* Not running inside Play Store TWA */ }
  return false;
}

/**
 * Authoritative score submission stub — signs score payload with local integrity digest
 * so your future server can reject forged client scores.
 */
export async function syncCloudProfile(signedEnvelope) {
  if (!BACKEND_CONFIG.syncEndpoint) {
    return { synced: false, mode: 'local_only' };
  }
  try {
    const res = await fetch(`${BACKEND_CONFIG.syncEndpoint}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedEnvelope),
    });
    if (!res.ok) return { synced: false, status: res.status };
    return { synced: true, serverData: await res.json() };
  } catch (err) {
    return { synced: false, error: err.message };
  }
}
