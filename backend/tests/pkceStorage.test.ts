import { describe, it, expect, vi, afterEach } from "vitest";
import type { Request } from "express";
import { supabase } from "../src/config/supabase.js";
import {
  memoryStorage,
  readFlow,
  type FlowStore,
} from "../src/services/authFlow.js";
afterEach(() => vi.unstubAllGlobals());
describe("Compatibilité avec le véritable SDK Supabase installé, sans réseau", () => {
  it("conserve tous les emplacements PKCE générés par Google", async () => {
    const values: FlowStore = {};
    const result = await supabase(
      undefined,
      memoryStorage(values),
    ).auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://app.example/auth/callback",
        skipBrowserRedirect: true,
      },
    });
    expect(result.error).toBeNull();
    expect(
      new URL(result.data.url!).searchParams.get("code_challenge_method"),
    ).toBe("s256");
    const req = {
      cookies: {
        gestion_auth_flow: JSON.stringify({ flow: "google", values }),
      },
    } as Request;
    expect(readFlow(req, "google")).toEqual(values);
    expect(Object.keys(values).length).toBeGreaterThanOrEqual(1);
  });
  it("conserve aussi les emplacements de récupération avec transport simulé", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const values: FlowStore = {};
    const result = await supabase(
      undefined,
      memoryStorage(values),
    ).auth.resetPasswordForEmail("member@example.com", {
      redirectTo: "https://app.example/auth/reset-password",
    });
    expect(result.error).toBeNull();
    expect(
      readFlow(
        {
          cookies: {
            gestion_auth_flow: JSON.stringify({ flow: "recovery", values }),
          },
        } as Request,
        "recovery",
      ),
    ).toEqual(values);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
