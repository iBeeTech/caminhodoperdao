/// <reference types="@cloudflare/workers-types" />
import { json, serverError } from "../_utils/responses";
import { countActive, countActiveSleep, expirePending } from "../_utils/registrations";

interface Env {
  DB: D1Database;
}

const MAX_TOTAL = 400;
const MAX_SLEEP = 100;

async function handleAvailability(env: Env): Promise<Response> {
  try {
    await expirePending(env.DB);
    const total = await countActive(env.DB);
    const sleepers = await countActiveSleep(env.DB);
    return json(200, {
      totalFull: total >= MAX_TOTAL,
      monasteryFull: sleepers >= MAX_SLEEP,
      total,
      sleepers,
      totalLimit: MAX_TOTAL,
      monasteryLimit: MAX_SLEEP,
    });
  } catch (error) {
    console.error("Error in handleAvailability:", error);
    return serverError("availability_error");
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleAvailability(context.env);
};
