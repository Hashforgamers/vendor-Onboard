/** Server-only dashboard authentication. Never expose the upstream API key. */
export async function authorizedAdmin(header: string | null): Promise<boolean> {
  const username = process.env.SUPER_ADMIN_DASHBOARD_USERNAME;
  const password = process.env.SUPER_ADMIN_DASHBOARD_PASSWORD;
  if (!username || !password || password.length < 16 || !header?.startsWith('Basic ')) return false;
  let supplied: string;
  try { supplied = atob(header.slice(6)); } catch { return false; }
  const encoder = new TextEncoder();
  const [expected, actual] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(`${username}:${password}`)),
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
  ]);
  const left = new Uint8Array(expected), right = new Uint8Array(actual);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
