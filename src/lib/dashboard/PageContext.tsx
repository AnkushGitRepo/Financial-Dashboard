'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { PageContextValue } from './pageContextTypes';

interface PageContextContextValue {
  pageContext: PageContextValue | null;
  setPageContext: (value: PageContextValue | null) => void;
}

const PageContext = createContext<PageContextContextValue | null>(null);

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContext] = useState<PageContextValue | null>(null);
  return (
    <PageContext.Provider value={{ pageContext, setPageContext }}>{children}</PageContext.Provider>
  );
}

export function usePageContext(): PageContextContextValue {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePageContext must be used within a PageContextProvider');
  return ctx;
}
