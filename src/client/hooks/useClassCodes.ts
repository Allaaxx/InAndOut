import { api } from '@client/services/api';
import { useEffect, useState } from 'react';

export function useClassCodes(token: string): string[] {
  const [classCodes, setClassCodes] = useState<string[]>([]);

  useEffect(() => {
    if (typeof api.listClasses !== 'function') {
      return;
    }

    let cancelled = false;
    api
      .listClasses(token)
      .then((res) => {
        if (cancelled) return;
        const uniqueCodes = Array.from(
          new Set((res.classes ?? []).map((item) => item.code)),
        ).sort((a, b) => a.localeCompare(b));
        setClassCodes(uniqueCodes);
      })
      .catch(() => {
        // Keep existing options if class catalog fails to load
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return classCodes;
}
