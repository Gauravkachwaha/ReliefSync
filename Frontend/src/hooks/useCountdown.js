import { useEffect, useState } from "react";

/** Live-ticking minutes remaining until targetDate. Updates every second. */
export function useCountdown(targetDate) {
  const [msLeft, setMsLeft] = useState(() => new Date(targetDate) - new Date());

  useEffect(() => {
    const tick = () => setMsLeft(new Date(targetDate) - new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const expired = msLeft <= 0;
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return { expired, minutes, seconds, totalSeconds };
}

export default useCountdown;
