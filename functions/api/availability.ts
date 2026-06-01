/// <reference types="@cloudflare/workers-types" />
import { json, serverError } from "../_utils/responses";
import { getCapacityLimits, CapacityEnv } from "../_utils/capacity";
import {
  countActive,
  countActiveSleep,
  countActiveStaff,
  expirePending,
} from "../_utils/registrations";

interface Env extends CapacityEnv {
  DB: D1Database;
}

async function handleAvailability(env: Env): Promise<Response> {
  try {
    const {
      maxRegistrations,
      maxRegistrationsSleep,
      maxRegistrationsStaff,
      maxRegistrationsNonStaff,
    } = getCapacityLimits(env);
    await expirePending(env.DB);
    const total = await countActive(env.DB);
    const sleepers = await countActiveSleep(env.DB);
    const staff = await countActiveStaff(env.DB);
    const nonStaff = Math.max(0, total - staff);
    // Endpoint público (peregrino): vagas de não-staff esgotadas trancam a inscrição.
    const nonStaffFull = nonStaff >= maxRegistrationsNonStaff;
    const monasteryFull = sleepers >= maxRegistrationsSleep;
    return json(200, {
      // Peregrino não consegue se inscrever de jeito nenhum.
      totalFull: nonStaffFull,
      monasteryFull,
      total,
      sleepers,
      staff,
      nonStaff,
      totalLimit: maxRegistrations,
      monasteryLimit: maxRegistrationsSleep,
      staffLimit: maxRegistrationsStaff,
      nonStaffLimit: maxRegistrationsNonStaff,
    });
  } catch (error) {
    console.error("Error in handleAvailability:", error);
    return serverError("availability_error");
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleAvailability(context.env);
};
