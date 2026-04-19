import type { Client, SessionLog } from '../types/models';

/** Payload sent to the coach-only AI edge function (field names match server validation). */
export type CoachingTipsContextPayload = {
  clientName: string;
  goal: string;
  limitations: string;
  coachNotesOnClient: string;
  latestSession: {
    date: string;
    sessionType: string;
    exercises: string;
    clientCondition: string;
    trainerNotes: string;
    progressObservations: string;
    nextSessionNotes: string;
  } | null;
};

export type CoachingTipsResult = {
  coachingTips: [string, string, string];
  clientRecap: string;
  nextSessionFocus: string;
};

export function buildCoachingTipsContext(
  client: Client,
  latest: SessionLog | undefined | null,
): CoachingTipsContextPayload {
  return {
    clientName: client.name.trim(),
    goal: client.goal.trim(),
    limitations: client.limitations.trim(),
    coachNotesOnClient: client.notes.trim(),
    latestSession: latest
      ? {
          date: latest.date,
          sessionType: latest.sessionType.trim(),
          exercises: latest.exercises.trim(),
          clientCondition: latest.clientCondition.trim(),
          trainerNotes: latest.trainerNotes.trim(),
          progressObservations: latest.progressObservations.trim(),
          nextSessionNotes: latest.nextSessionNotes.trim(),
        }
      : null,
  };
}
