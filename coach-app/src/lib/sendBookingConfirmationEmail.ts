import type { SupabaseClient } from '@supabase/supabase-js';

export type BookingConfirmationEmailPayload = {
  to: string;
  clientName: string;
  whenLabel: string;
  occurrenceStartAt: string;
  coachName: string;
  coachBusiness: string;
};

export type BookingConfirmationEmailResult = {
  sent: boolean;
  reason?: string;
};

/**
 * Invokes the public Edge Function `send-booking-confirmation` (no auth).
 * Requires RESEND_API_KEY on the function for actual delivery; otherwise returns sent: false.
 */
export async function sendBookingConfirmationEmail(
  supabase: SupabaseClient,
  payload: BookingConfirmationEmailPayload,
): Promise<BookingConfirmationEmailResult> {
  const { data, error } = await supabase.functions.invoke('send-booking-confirmation', {
    body: payload,
  });

  if (error) {
    return { sent: false, reason: 'invoke_failed' };
  }

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (d.sent === true) return { sent: true };
    if (d.sent === false) {
      return { sent: false, reason: typeof d.reason === 'string' ? d.reason : 'not_sent' };
    }
  }

  return { sent: false, reason: 'bad_response' };
}
