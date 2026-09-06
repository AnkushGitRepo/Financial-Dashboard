'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface MaskContextValue {
  masked: boolean;
  toggleMask: () => void;
}

const MaskContext = createContext<MaskContextValue | null>(null);

export function MaskProvider({ children }: { children: ReactNode }) {
  const [masked, setMasked] = useState(false);
  return (
    <MaskContext.Provider value={{ masked, toggleMask: () => setMasked((m) => !m) }}>
      {children}
    </MaskContext.Provider>
  );
}

export function useMask(): MaskContextValue {
  const ctx = useContext(MaskContext);
  if (!ctx) throw new Error('useMask must be used within a MaskProvider');
  return ctx;
}
