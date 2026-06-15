import { useEffect, useRef, useState } from "react";

export function CountUp({ value, className, style }) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;

    const t0 = performance.now();
    const dur = 550;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setDisp(Math.floor(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className} style={style}>{disp}</span>;
}
