import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import { clearPrivateQueries } from "../services/queryCache";
import { toast } from "sonner";
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
  const previousIdentity = useRef<string | null | undefined>(undefined);
  const q = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      let next: Session | null;
      try {
        next = await api<Session>("/auth/session");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) next = null;
        else throw e;
      }
      const identity = next?.user.id ?? null;
      if (
        previousIdentity.current !== undefined &&
        previousIdentity.current !== identity
      )
        await clearPrivateQueries(client);
      previousIdentity.current = identity;
      return next;
    },
    retry: false,
    staleTime: 300000,
  });
  useEffect(() => {
    const expired = () => {
      previousIdentity.current = null;
      client.setQueryData(["session"], null);
      void clearPrivateQueries(client);
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
          const result = await api<{ revoked: boolean }>("/auth/logout", {
            method: "POST",
          });
          previousIdentity.current = null;
          client.setQueryData(["session"], null);
          await clearPrivateQueries(client);
          if (!result.revoked)
            toast.warning(
              "Session locale fermée. La révocation distante n’a pas pu être confirmée.",
            );
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
