import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  digits?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({ value, digits = 0, suffix = '', className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = displayValue;
    const diff = value - startValue;
    const startTime = performance.now();

    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / 650);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + diff * eased);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(animate);
      }
    };

    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value]);

  return <span className={className}>{displayValue.toFixed(digits)}{suffix}</span>;
}
