/// <reference types="@cloudflare/workers-types" />
import { json, serverError } from "../_utils/responses";
import { getCapacityLimits } from "../_utils/capacity";
import { countActive, countActiveSleep, expirePending } from "../_utils/registrations";

interface Env {
  DB: D1Database;
  MAX_REGISTRATIONS_WITHOUT_SLEEP?: string;
  MAX_REGISTRATIONS_WITH_SLEEP?: string;
  // Legacy names kept for backward compatibility.
  MAX_TOTAL?: string;
  MAX_SLEEP?: string;
}

async function handleAvailability(env: Env): Promise<Response> {
  try {
    const {
      maxRegistrationsOverall,
      maxRegistrationsWithoutSleep,
      maxRegistrationsWithSleep,
    } = getCapacityLimits(env);
    await expirePending(env.DB);
    const total = await countActive(env.DB);
    const sleepers = await countActiveSleep(env.DB);
    const nonSleepers = Math.max(0, total - sleepers);
    const monasteryFull = sleepers >= maxRegistrationsWithSleep;
    const nonSleepFull = nonSleepers >= maxRegistrationsWithoutSleep;
    return json(200, {
      totalFull: monasteryFull && nonSleepFull,
      monasteryFull,
      total,
      sleepers,
      totalLimit: maxRegistrationsOverall,
      monasteryLimit: maxRegistrationsWithSleep,
      nonSleepers,
      nonSleepLimit: maxRegistrationsWithoutSleep,
      nonSleepFull,
    });
  } catch (error) {
    console.error("Error in handleAvailability:", error);
    return serverError("availability_error");
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleAvailability(context.env);
};
