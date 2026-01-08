import { onRequestPost as __api_webhooks_pix_ts_onRequestPost } from "/home/cassiotakarada/workspaceBitbucket/personal/caminhodoperdao/caminhodoperdao/functions/api/webhooks/pix.ts"
import { onRequestGet as __api_register_ts_onRequestGet } from "/home/cassiotakarada/workspaceBitbucket/personal/caminhodoperdao/caminhodoperdao/functions/api/register.ts"
import { onRequestPost as __api_register_ts_onRequestPost } from "/home/cassiotakarada/workspaceBitbucket/personal/caminhodoperdao/caminhodoperdao/functions/api/register.ts"
import { onRequestPost as __api_reissue_ts_onRequestPost } from "/home/cassiotakarada/workspaceBitbucket/personal/caminhodoperdao/caminhodoperdao/functions/api/reissue.ts"
import { onRequestGet as __api_status_ts_onRequestGet } from "/home/cassiotakarada/workspaceBitbucket/personal/caminhodoperdao/caminhodoperdao/functions/api/status.ts"
import { onRequestGet as __api_testimonials_ts_onRequestGet } from "/home/cassiotakarada/workspaceBitbucket/personal/caminhodoperdao/caminhodoperdao/functions/api/testimonials.ts"
import { onRequestOptions as __api_testimonials_ts_onRequestOptions } from "/home/cassiotakarada/workspaceBitbucket/personal/caminhodoperdao/caminhodoperdao/functions/api/testimonials.ts"

export const routes = [
    {
      routePath: "/api/webhooks/pix",
      mountPath: "/api/webhooks",
      method: "POST",
      middlewares: [],
      modules: [__api_webhooks_pix_ts_onRequestPost],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_register_ts_onRequestGet],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_register_ts_onRequestPost],
    },
  {
      routePath: "/api/reissue",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_reissue_ts_onRequestPost],
    },
  {
      routePath: "/api/status",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_status_ts_onRequestGet],
    },
  {
      routePath: "/api/testimonials",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_testimonials_ts_onRequestGet],
    },
  {
      routePath: "/api/testimonials",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_testimonials_ts_onRequestOptions],
    },
  ]