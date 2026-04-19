/**
 * Coach-only Edge Function: generates structured coaching tips from client + session context.
 *
 * Deploy: `supabase functions deploy generate-coaching-tips`
 * Secrets: `supabase secrets set OPENAI_API_KEY=sk-...`
 *
 * Requires a valid Supabase user JWT (Authorization: Bearer <access_token>).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FIELD = 6000;

function clip(s: string, n: number): string {
  const t = (s ?? '').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

type Latest = {
  date: string;
  sessionType: string;
  exercises: string;
  clientCondition: string;
  trainerNotes: string;
  progressObservations: string;
  nextSessionNotes: string;
};

type Ctx = {
  clientName: string;
  goal: string;
  limitations: string;
  coachNotesOnClient: string;
  latestSession: Latest | null;
};

function normalizeContext(raw: unknown): Ctx | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const clientName = typeof o.clientName === 'string' ? clip(o.clientName, 200) : '';
  if (!clientName) return null;

  let latestSession: Latest | null = null;
  if (o.latestSession !== null && o.latestSession !== undefined && typeof o.latestSession === 'object') {
    const s = o.latestSession as Record<string, unknown>;
    latestSession = {
      date: typeof s.date === 'string' ? clip(s.date, 40) : '',
      sessionType: typeof s.sessionType === 'string' ? clip(s.sessionType, MAX_FIELD) : '',
      exercises: typeof s.exercises === 'string' ? clip(s.exercises, MAX_FIELD) : '',
      clientCondition: typeof s.clientCondition === 'string' ? clip(s.clientCondition, MAX_FIELD) : '',
      trainerNotes: typeof s.trainerNotes === 'string' ? clip(s.trainerNotes, MAX_FIELD) : '',
      progressObservations: typeof s.progressObservations === 'string' ? clip(s.progressObservations, MAX_FIELD) : '',
      nextSessionNotes: typeof s.nextSessionNotes === 'string' ? clip(s.nextSessionNotes, MAX_FIELD) : '',
    };
  }

  return {
    clientName,
    goal: typeof o.goal === 'string' ? clip(o.goal, MAX_FIELD) : '',
    limitations:
      typeof o.limitations === 'string'
        ? clip(o.limitations, MAX_FIELD)
        : typeof o.injuries === 'string'
          ? clip(o.injuries, MAX_FIELD)
          : '',
    coachNotesOnClient: typeof o.coachNotesOnClient === 'string' ? clip(o.coachNotesOnClient, MAX_FIELD) : '',
    latestSession,
  };
}

function buildPrompt(c: Ctx): string {
  const ls = c.latestSession;
  const sessionType = (ls?.sessionType ?? '').trim() || '—';
  const exercises = (ls?.exercises ?? '').trim() || '—';
  const trainerNotes = (ls?.trainerNotes ?? '').trim() || '—';
  const progressObservations = (ls?.progressObservations ?? '').trim() || '—';
  const nextSessionNotes = (ls?.nextSessionNotes ?? '').trim() || '—';
  const goal = c.goal.trim() || '—';
  const limitations = c.limitations.trim() || '—';

  const userBody = [
    'Latest Session (IMPORTANT – base your answer on this):',
    '',
    `- Type: ${sessionType}`,
    '- Movements performed:',
    exercises,
    '',
    'Client Goal:',
    goal,
    '',
    'Client Limitations:',
    limitations,
    '',
    'Trainer Notes:',
    trainerNotes,
    '',
    'Progress Observations:',
    progressObservations,
    '',
    'Next Session Notes:',
    nextSessionNotes,
  ].join('\n');

  const outputBlock = [
    '',
    '## Output',
    'Return a single JSON object (no markdown) with exactly these keys:',
    '"coachingTips": array of exactly 3 short strings — practical tips for the coach for upcoming sessions.',
    '"clientRecap": one short paragraph in client-friendly language the coach could adapt (no medical claims).',
    '"nextSessionFocus": one short sentence — concrete emphasis for the next session.',
  ].join('\n');

  return `${userBody}${outputBlock}`;
}

const systemPrompt = `
You are a certified personal trainer assistant, designed to support a coach (not replace them).

You are informed by NASM-style training principles:
- focus on safe, progressive training
- consider movement quality, not just intensity
- respect client limitations and injury history
- prioritize long-term consistency over short-term overload

You are NOT:
- a doctor
- a physical therapist
- a source of medical diagnosis

Never give medical advice.

Your job is to help the coach generate practical, specific, and usable coaching insights based on real client context.

TONE & STYLE:

- Write like a real personal trainer, not like an AI
- Be concise, practical, and grounded
- Avoid generic motivational phrases (e.g. "stay consistent", "keep pushing")
- Avoid overly technical jargon unless necessary
- Use natural, human language the coach can copy and send to a client

OUTPUT REQUIREMENTS:

You must return structured output with:

1. Coaching Tips (3 items)
- Each tip must be specific and actionable
- Include cues, adjustments, or focus areas
- Tie directly to the client’s goal, condition, or recent session

2. Client Recap (short paragraph)
- Written as if the coach is summarizing to the client
- Friendly, supportive, but not overly emotional
- Mention what went well and what to keep working on

3. Next Session Focus (1–2 sentences)
- Clear and practical
- Based on progress, limitations, and recent session

QUALITY RULES:

- Always reference the client’s goal if provided
- Always consider limitations if present
- If session data exists, anchor your suggestions to it
- Do not invent fake injuries or conditions
- Do not repeat the same idea in multiple tips
- Avoid vague advice (e.g. "improve strength", "work on form") — be specific

If context is missing:
- Make reasonable assumptions but keep guidance general and safe

Keep the output clean and structured.
No extra explanation, no meta commentary.

CRITICAL:

You MUST use the provided client context.

Every coaching tip must:
- reference at least one of:
  - a specific movement from the latest session
  - the client’s goal
  - the client’s limitations

If you do not have enough context, say so and keep the advice limited.

Do NOT generate generic fitness advice.

Bad example:
- "add compound movements"

Good example:
- "During your RDLs, focus on keeping tension in your hamstrings at the bottom range"

If your output could apply to any random person, it is incorrect.
`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    console.log('generate-coaching-tips: function invoked');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    console.log('generate-coaching-tips: auth user verified', { userId: userData.user.id });

    let body: unknown;
    try {
      body = await req.json();
    } catch (jsonErr) {
      console.error('generate-coaching-tips: invalid JSON body', jsonErr);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const ctx = normalizeContext((body as { context?: unknown }).context);
    if (!ctx) {
      return new Response(JSON.stringify({ error: 'Invalid context' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    console.log('generate-coaching-tips: context received', {
      clientName: ctx.clientName,
      hasLatestSession: Boolean(ctx.latestSession),
    });

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'AI is not configured on the server (missing OPENAI_API_KEY).' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const userPrompt = buildPrompt(ctx);
    console.log('generate-coaching-tips: prompt built', { promptLength: userPrompt.length });

    console.log('generate-coaching-tips: OpenAI request sent');
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt.trim(),
          },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 900,
      }),
    });
    console.log('generate-coaching-tips: OpenAI response received', {
      status: completion.status,
      ok: completion.ok,
    });

    if (!completion.ok) {
      const errText = await completion.text();
      console.error('OpenAI error', completion.status, errText);
      return new Response(JSON.stringify({ error: 'Upstream AI request failed.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const rawJson: unknown = await completion.json();
    const o = rawJson as { choices?: { message?: { content?: string } }[] };
    const content = o?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Bad AI response shape.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let parsed: { coachingTips?: unknown; clientRecap?: unknown; nextSessionFocus?: unknown };
    try {
      parsed = JSON.parse(content) as typeof parsed;
    } catch (parseContentErr) {
      console.error('generate-coaching-tips: AI content JSON.parse failed', parseContentErr);
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const tipsRaw = Array.isArray(parsed.coachingTips)
      ? parsed.coachingTips.filter((x) => typeof x === 'string').map((s) => String(s).trim())
      : [];
    const tips = [...tipsRaw];
    while (tips.length < 3) tips.push('—');
    const coachingTips = tips.slice(0, 3);

    const clientRecap = typeof parsed.clientRecap === 'string' ? parsed.clientRecap.trim() : '';
    const nextSessionFocus = typeof parsed.nextSessionFocus === 'string' ? parsed.nextSessionFocus.trim() : '';

    return new Response(
      JSON.stringify({
        coachingTips,
        clientRecap: clientRecap || '—',
        nextSessionFocus: nextSessionFocus || '—',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  } catch (error) {
    console.error('generate-coaching-tips failed', error);
    const message =
      error instanceof Error
        ? (error.message ?? 'Unknown error')
        : typeof error === 'string'
          ? error
          : 'Unknown error';
    return new Response(JSON.stringify({ error: true, message: message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
