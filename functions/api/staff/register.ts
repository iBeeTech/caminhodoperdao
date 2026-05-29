/// <reference types="@cloudflare/workers-types" />
import { badRequest, json } from "../../_utils/responses";
import {
  StaffRegistrationEnv,
  createStaffRegistration,
} from "../../_utils/staffRegistration";

// Inscrição gratuita de staff. Sem validação de convite: o acesso é controlado
// pela distribuição do link /staff (apenas a equipe recebe). A inscrição entra
// direto como PAID/cortesia, contando no grupo correto (mosteiro x geral).
export const onRequestPost: PagesFunction<StaffRegistrationEnv> = async context => {
  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid_json");
  }

  const result = await createStaffRegistration(context.env, {
    email: typeof body.email === "string" ? body.email : "",
    name: typeof body.name === "string" ? body.name : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    cpf: typeof body.cpf === "string" ? body.cpf : undefined,
    dateOfBirth: typeof body.dateOfBirth === "string" ? body.dateOfBirth : undefined,
    termsAccepted: body.termsAccepted === true,
    emergencyContactName:
      typeof body.emergencyContactName === "string" ? body.emergencyContactName : undefined,
    emergencyContactPhone:
      typeof body.emergencyContactPhone === "string" ? body.emergencyContactPhone : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    state: typeof body.state === "string" ? body.state : undefined,
    sleepAtMonastery: body.sleepAtMonastery === true,
    companionName: typeof body.companionName === "string" ? body.companionName : undefined,
    cep: typeof body.cep === "string" ? body.cep : undefined,
    address: typeof body.address === "string" ? body.address : undefined,
    number: typeof body.number === "string" ? body.number : undefined,
    complement: typeof body.complement === "string" ? body.complement : undefined,
    hasAllergyMedication:
      typeof body.hasAllergyMedication === "boolean" ? body.hasAllergyMedication : undefined,
    allergyMedicationDetails:
      typeof body.allergyMedicationDetails === "string" ? body.allergyMedicationDetails : undefined,
    hasDietaryRestriction:
      typeof body.hasDietaryRestriction === "boolean" ? body.hasDietaryRestriction : undefined,
    dietaryRestrictionDetails:
      typeof body.dietaryRestrictionDetails === "string"
        ? body.dietaryRestrictionDetails
        : undefined,
  });

  if (!result.ok) {
    return json(result.status, { error: result.error });
  }

  return json(200, {
    status: "PAID",
    registration_id: result.registrationId,
    registration_number: result.registrationNumber,
    is_staff: true,
  });
};
