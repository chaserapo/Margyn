import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { configurePurchases, getIsEntitled } from './purchases';

type PurchasesState = {
  loading: boolean;
  isEntitled: boolean;
  refresh: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesState>({
  loading: true,
  isEntitled: false,
  refresh: async () => {},
});

export function PurchasesProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [entitled, setEntitled] = useState(false);

  const refresh = useCallback(async () => {
    setEntitled(await getIsEntitled());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      await configurePurchases(userId);
      const result = await getIsEntitled();
      if (!cancelled) {
        setEntitled(result);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <PurchasesContext.Provider value={{ loading, isEntitled: entitled, refresh }}>{children}</PurchasesContext.Provider>
  );
}

export function usePurchases() {
  return useContext(PurchasesContext);
}
