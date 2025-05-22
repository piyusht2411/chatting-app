"use client";
import { createContext, useContext, useState } from "react";

const RefetchContext = createContext<
  { refetch: boolean; triggerRefetch: () => void } | undefined
>(undefined);

export function RefetchProvider({ children }: { children: React.ReactNode }) {
  const [refetch, setRefetch] = useState(false);

  const triggerRefetch = () => {
    setRefetch((prev) => !prev); // Toggle state to trigger re-render
  };

  return (
    <RefetchContext.Provider value={{ refetch, triggerRefetch }}>
      {children}
    </RefetchContext.Provider>
  );
}

export function useRefetch() {
  const context = useContext(RefetchContext);
  if (!context)
    throw new Error("useRefetch must be used within RefetchProvider");
  return context;
}
