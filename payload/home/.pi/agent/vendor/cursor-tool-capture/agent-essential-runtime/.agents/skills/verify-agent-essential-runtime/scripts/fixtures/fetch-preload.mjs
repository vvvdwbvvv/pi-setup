import { appendFileSync } from 'node:fs';

const nativeFetch = globalThis.fetch;
const origin = process.env.VERIFY_HTTP_ORIGIN;
const log = process.env.VERIFY_FETCH_RECEIPT;
globalThis.fetch = async (input, options) => {
  const original = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  let target = new URL(original);
  if (original.origin === 'https://api.search.brave.com' && original.pathname === '/res/v1/web/search') {
    target = new URL('/search', origin);
    target.search = original.search;
  } else if (original.origin !== origin) {
    appendFileSync(log, JSON.stringify({ original: original.href, blocked: true }) + '\n');
    throw new Error('Verification blocks non-fixture fetch');
  }
  appendFileSync(log, JSON.stringify({ original: original.href, target: target.href, token: new Headers(options?.headers).get('X-Subscription-Token') }) + '\n');
  return nativeFetch(target, options);
};
