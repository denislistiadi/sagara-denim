import { useEffect, useState } from "react";

/**
 * Kembalikan nilai yang terlambat beberapa saat.
 *
 * Dipakai untuk kotak pencarian: setiap ketikan tidak langsung memanggil
 * API, melainkan menunggu `delayMs` sejak ketikan terakhir.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
