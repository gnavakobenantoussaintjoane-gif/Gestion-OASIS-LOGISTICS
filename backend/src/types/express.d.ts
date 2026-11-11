import type { SupabaseClient, User } from "@supabase/supabase-js";
declare global {
  namespace Express {
    interface Request {
      db: SupabaseClient;
      user: User;
      companyId: string;
      role: "admin" | "manager" | "operator" | "driver";
    }
  }
}
export {};
