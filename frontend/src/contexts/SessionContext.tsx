import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import type { Session } from "../types";
const Context = createContext<{
  session: Session | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<unknown>;
  logout: () => Promise<void>;
}>({
  session: null,
  loading: true,
  error: null,
  reload: async () => {},
  logout: async () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await api<Session>("/auth/session");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 300000,
  });
  useEffect(() => {
    const expired = () => {
      client.setQueryData(["session"], null);
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== "session" });
    };
    window.addEventListener("gestion-session-expired", expired);
    return () => window.removeEventListener("gestion-session-expired", expired);
  }, [client]);
  return (
    <Context.Provider
      value={{
        session: q.data || null,
        loading: q.isPending,
        error: q.error,
        reload: () => q.refetch(),
        logout: async () => {
          await api("/auth/logout", { method: "POST" });
          client.clear();
          client.setQueryData(["session"], null);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
