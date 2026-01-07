/**
 * Client-only lazy loading para @amplitude/analytics-browser
 * 
 * Este arquivo NUNCA deve ser importado no server.
 * Use lazy import dentro de funções se necessário.
 */

import type { AmplitudeClient, EventProperties, UserProperties } from "./types";

let amplitudeInstance: any = null;

/**
 * Lazy import de @amplitude/analytics-browser
 * Só executa no cliente e evita carregar a lib no server
 */
async function getAmplitudeSDK() {
  // Safety: nunca carregar no server
  if (typeof window === "undefined") {
    throw new Error("[Amplitude] Cannot initialize on server");
  }

  if (!amplitudeInstance) {
    const amplitude = await import("@amplitude/analytics-browser");
    amplitudeInstance = amplitude;
  }

  return amplitudeInstance;
}

/**
 * Wrapper que simula AmplitudeClient enquanto SDK não está carregado
 * Implementa buffer de eventos até inicialização
 */
class AmplitudeClientBuffer implements AmplitudeClient {
  private eventQueue: Array<{ eventName: string; properties?: EventProperties }> = [];
  public isInitialized = false;
  private sdkInstance: any = null;

  async init(apiKey: string, config: any): Promise<void> {
    if (this.isInitialized) {
      console.debug("[Amplitude] Already initialized, skipping init");
      return;
    }

    try {
      const amplitude = await getAmplitudeSDK();
      this.sdkInstance = amplitude;

      // Inicializar SDK
      amplitude.init(apiKey, config);
      this.isInitialized = true;

      // Processar fila de eventos que chegaram antes da inicialização
      this.flushQueue();
    } catch (error) {
      console.error("[Amplitude] Failed to initialize:", error);
      throw error;
    }
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  track(eventName: string, eventProperties?: EventProperties): void {
    if (!eventName) {
      console.warn("[Amplitude] Empty event name provided");
      return;
    }

    if (!this.isInitialized) {
      // Buffer evento até inicializar
      this.eventQueue.push({ eventName, properties: eventProperties });
      return;
    }

    this.sendEvent(eventName, eventProperties);
  }

  private sendEvent(eventName: string, eventProperties?: EventProperties): void {
    try {
      if (this.sdkInstance) {
        this.sdkInstance.track(eventName, eventProperties);
      }
    } catch (error) {
      console.error("[Amplitude] Error tracking event:", error);
      // Não lançar erro: analytics não deve quebrar a aplicação
    }
  }

  private flushQueue(): void {
    if (this.eventQueue.length === 0) return;

    console.debug(`[Amplitude] Flushing ${this.eventQueue.length} buffered events`);
    const queue = this.eventQueue.splice(0);

    for (const { eventName, properties } of queue) {
      this.sendEvent(eventName, properties);
    }
  }

  setUserId(userId: string): void {
    if (!userId) {
      console.warn("[Amplitude] Empty userId provided");
      return;
    }

    try {
      if (this.sdkInstance) {
        this.sdkInstance.setUserId(userId);
      }
    } catch (error) {
      console.error("[Amplitude] Error setting userId:", error);
    }
  }

  setUserProperties(userProperties: UserProperties): void {
    if (!userProperties || typeof userProperties !== "object") {
      console.warn("[Amplitude] Invalid userProperties provided");
      return;
    }

    try {
      if (this.sdkInstance) {
        const identify = new this.sdkInstance.Identify();
        Object.entries(userProperties).forEach(([key, value]) => {
          if (value !== undefined) {
            identify.set(key, value);
          }
        });
        this.sdkInstance.identify(identify);
      }
    } catch (error) {
      console.error("[Amplitude] Error setting user properties:", error);
    }
  }

  reset(): void {
    try {
      if (this.sdkInstance) {
        this.sdkInstance.reset();
      }
      this.eventQueue = [];
      this.isInitialized = false;
    } catch (error) {
      console.error("[Amplitude] Error resetting:", error);
    }
  }
}

// Instância singleton
export const amplitudeClient = new AmplitudeClientBuffer();
