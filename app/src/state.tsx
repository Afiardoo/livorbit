import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Overrides } from "./engine/assess";
import type { VitalRecord } from "./data/mission";

export type View = "crew" | "astronaut" | "checkin" | "twin" | "emergency" | "data" | "about";
export const VIEWS: View[] = ["crew", "astronaut", "checkin", "twin", "emergency", "data", "about"];

interface AppState {
  view: View; setView: (v: View) => void;
  day: number; setDay: (d: number) => void;
  astronaut: string; setAstronaut: (id: string) => void;
  overrides: Overrides; saveCheckIn: (id: string, day: number, values: Partial<VitalRecord>) => void; clearCheckIns: () => void;
  open: (view: View, astronaut?: string) => void;
}

const Ctx = createContext<AppState | null>(null);
const KEY = "livorbit.checkins.v1";

function readHash(): View {
  const v = window.location.hash.replace("#/", "") as View;
  return VIEWS.includes(v) ? v : "crew";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<View>(readHash);
  const [day, setDay] = useState(130);
  const [astronaut, setAstronaut] = useState("AST-3");
  const [overrides, setOverrides] = useState<Overrides>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
  });

  useEffect(() => {
    const onHash = () => setViewState(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setView = useCallback((v: View) => {
    window.location.hash = `/${v}`;
    setViewState(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const saveCheckIn = useCallback((id: string, d: number, values: Partial<VitalRecord>) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? {}), [d]: { ...(prev[id]?.[d] ?? {}), ...values } } };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage may be unavailable */ }
      return next;
    });
  }, []);
  const clearCheckIns = useCallback(() => {
    setOverrides({});
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  const open = useCallback((v: View, id?: string) => { if (id) setAstronaut(id); setView(v); }, [setView]);

  const value = useMemo(() => ({ view, setView, day, setDay, astronaut, setAstronaut, overrides, saveCheckIn, clearCheckIns, open }),
    [view, setView, day, astronaut, overrides, saveCheckIn, clearCheckIns, open]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
