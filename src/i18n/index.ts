import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import common from "./locales/pt-BR/common.json";
import landing from "./locales/pt-BR/landing.json";
import gallery from "./locales/pt-BR/gallery.json";

i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": {
      common,
      landing,
      gallery,
    },
  },
  lng: "pt-BR",
  fallbackLng: "pt-BR",
  interpolation: {
    escapeValue: false,
  },
  defaultNS: "common",
  ns: ["common", "landing", "gallery"],
});

export default i18n;
