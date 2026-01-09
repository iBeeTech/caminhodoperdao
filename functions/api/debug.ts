/// <reference types="@cloudflare/workers-types" />
import { json, badRequest } from "../_utils/responses";
import { getPaymentProvider } from "../_utils/payment";

interface Env {
  DB: D1Database;
  WOOVI_APP_ID?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const provider = getPaymentProvider(context.env);
    
    const charge = await provider.createCharge({
      name: "Test User",
      email: "test@example.com",
    });

    return json(200, {
      success: true,
      charge,
    });
  } catch (error: any) {
    return json(500, {
      error: error.message,
      stack: error.stack,
    });
  }
};
