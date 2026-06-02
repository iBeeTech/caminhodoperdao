import { useEffect, useState } from "react";

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** true quando a data alvo já passou */
  finished: boolean;
}

const getRemaining = (target: number): CountdownState => {
  const diff = target - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, finished: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    finished: false,
  };
};

/**
 * Conta regressivamente até `targetDate` (ISO string ou timestamp), atualizando a cada segundo.
 */
export const useCountdown = (targetDate: string | number): CountdownState => {
  const target =
    typeof targetDate === "number" ? targetDate : new Date(targetDate).getTime();

  const [state, setState] = useState<CountdownState>(() => getRemaining(target));

  useEffect(() => {
    setState(getRemaining(target));

    if (Date.now() >= target) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const next = getRemaining(target);
      setState(next);
      if (next.finished) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [target]);

  return state;
};
