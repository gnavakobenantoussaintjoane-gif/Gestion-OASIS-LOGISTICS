import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import FiltersBar from "../src/components/FiltersBar";
import { periodRange, selectedPeriod } from "../src/utils/periods";
import { api, downloadReport, queryString } from "../src/api/client";
import { clearPrivateQueries } from "../src/services/queryCache";
vi.mock("../src/hooks/useReferences", () => ({
  useReferences: () => ({ data: {} }),
  rowLabel: () => "",
}));
afterEach(() => vi.unstubAllGlobals());
describe("Filtres synchronisés", () => {
  it("calcule les périodes en UTC (Abidjan)", () => {
    const now = new Date("2026-11-11T23:59:00Z");
    expect(periodRange("week", now)).toEqual({
      start: "2026-11-09",
      end: "2026-11-11",
    });
    expect(periodRange("quarter", now).start).toBe("2026-10-01");
    expect(periodRange("yesterday", new Date("2026-01-01T00:00:00Z"))).toEqual({
      start: "2025-12-31",
      end: "2025-12-31",
    });
    expect(selectedPeriod("2020-01-01", "2020-02-02", now)).toBe("custom");
  });
  it("reflète les dates modifiées et la remise à zéro", () => {
    const onChange = vi.fn();
    const { rerender } = render(<FiltersBar value={{}} onChange={onChange} />);
    const select = screen.getByLabelText(
      "Période prédéfinie",
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "month" } });
    expect(onChange).toHaveBeenCalledWith({
      ...periodRange("month"),
      page: "1",
    });
    rerender(<FiltersBar value={periodRange("month")} onChange={onChange} />);
    expect(select.value).not.toBe("");
    rerender(
      <FiltersBar
        value={{ start: "2020-01-01", end: "2020-02-02" }}
        onChange={onChange}
      />,
    );
    expect(select.value).toBe("custom");
    rerender(<FiltersBar value={{}} onChange={onChange} />);
    expect(select.value).toBe("");
  });
  it("encode les caractères spéciaux des paramètres", () =>
    expect(
      new URLSearchParams(queryString({ q: "A&B + C", empty: "" })).get("q"),
    ).toBe("A&B + C"));
});
describe("Transport API", () => {
  it("rejette une page HTML servie avec le statut 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>SPA</html>")),
    );
    await expect(api("/trips")).rejects.toMatchObject({ status: 502 });
  });
  it("préserve le statut 401 même avec un corps invalide et notifie la session", async () => {
    const listener = vi.fn();
    window.addEventListener("gestion-session-expired", listener);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad", { status: 401 })),
    );
    await expect(api("/trips")).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("gestion-session-expired", listener);
  });
  it("normalise les erreurs réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(api("/trips")).rejects.toMatchObject({ status: 0 });
    await expect(downloadReport("pdf", {})).rejects.toMatchObject({
      status: 0,
    });
  });
  it("refuse un faux rapport HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html/>", { headers: { "Content-Type": "text/html" } }),
        ),
    );
    await expect(downloadReport("pdf", {})).rejects.toMatchObject({
      status: 502,
    });
  });
  it("conserve les headers personnalisés et impose les credentials same-origin", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetch);
    await api("/test", { headers: new Headers({ "X-Test": "ok" }) });
    const options = fetch.mock.calls[0][1];
    expect(options.headers.get("X-Test")).toBe("ok");
    expect(options.headers.get("X-Gestion-Client")).toBe("web");
    expect(options.credentials).toBe("same-origin");
  });
});
describe("Isolation du cache de session", () => {
  it("garde la session observée mais supprime les données privées", async () => {
    const client = new QueryClient();
    client.setQueryData(["session"], { user: { id: "one" } });
    client.setQueryData(["records", "trips"], ["private"]);
    await clearPrivateQueries(client);
    expect(client.getQueryData(["session"])).toBeTruthy();
    expect(client.getQueryData(["records", "trips"])).toBeUndefined();
    client.clear();
  });
  it("annule les requêtes en cours de l’ancien compte", async () => {
    const client = new QueryClient();
    const pending = client
      .fetchQuery({
        queryKey: ["records"],
        queryFn: () => new Promise(() => {}),
      })
      .catch(() => undefined);
    await clearPrivateQueries(client);
    await pending;
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
