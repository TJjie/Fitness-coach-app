import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import type { CoachingTipsContextPayload, CoachingTipsResult } from './buildCoachingTipsContext';

/** Prefer `message`, then a string `error` (e.g. `{ error: "Invalid context" }`). */
function messageFromErrorJsonBody(body: Record<string, unknown>): string | null {
  const msg = typeof body.message === 'string' && body.message.trim().length > 0 ? body.message.trim() : '';
  const err = body.error;
  const errStr = typeof err === 'string' && err.trim().length > 0 ? err.trim() : '';
  if (msg) return msg;
  if (errStr) return errStr;
  return null;
}

/** When invoke fails with a non-2xx, the thrown error carries the raw `Response` as `context`. */
async function messageFromFunctionsHttpError(error: FunctionsHttpError): Promise<string | null> {
  const res = error.context;
  if (!res || typeof (res as Response).json !== 'function') return null;
  const response = res as Response;
  try {
    const ct = (response.headers.get('Content-Type') ?? '').toLowerCase();
    if (!ct.includes('application/json')) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return null;
    return messageFromErrorJsonBody(body as Record<string, unknown>);
  } catch {
    return null;
  }
}

function parseCoachingTipsResult(data: unknown): CoachingTipsResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response from AI service.');
  }
  const o = data as Record<string, unknown>;
  const rawTips = o.coachingTips;
  const tips: string[] = Array.isArray(rawTips)
    ? rawTips.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
    : [];
  while (tips.length < 3) tips.push('—');
  const coachingTips = [tips[0]!, tips[1]!, tips[2]!] as [string, string, string];

  const clientRecap = typeof o.clientRecap === 'string' ? o.clientRecap.trim() : '';
  const nextSessionFocus = typeof o.nextSessionFocus === 'string' ? o.nextSessionFocus.trim() : '';

  return {
    coachingTips,
    clientRecap: clientRecap || '—',
    nextSessionFocus: nextSessionFocus || '—',
  };
}

/**
 * Invokes the Supabase Edge Function `generate-coaching-tips` with the coach JWT.
 * The OpenAI API key must be set as a secret on the function (never in the browser).
 */
export async function requestCoachingTips(
  supabase: SupabaseClient,
  context: CoachingTipsContextPayload,
): Promise<CoachingTipsResult> {
  const { data, error } = await supabase.functions.invoke('generate-coaching-tips', {
    body: { context },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const fromHttp = await messageFromFunctionsHttpError(error);
      if (fromHttp) throw new Error(fromHttp);
    }

    const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    const fromData = d ? messageFromErrorJsonBody(d) : null;
    throw new Error(fromData || error.message || 'Could not reach AI service.');
  }

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (d.error === true && typeof d.message === 'string') {
      throw new Error(d.message);
    }
    const fromBody = messageFromErrorJsonBody(d);
    if (fromBody) throw new Error(fromBody);
  }

  return parseCoachingTipsResult(data);
}
