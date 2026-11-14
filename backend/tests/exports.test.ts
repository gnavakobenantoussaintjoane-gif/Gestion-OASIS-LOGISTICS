import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import ExcelJS from "exceljs";
import { exportReport } from "../src/services/exports.js";
const app = express();
const report = {
  trips: [
    {
      reference: "V-TEST0001",
      accounting_date: "2026-11-14",
      truck_id: "truck-test",
      driver_id: "driver-test",
      shift: "day",
      terminal_id: "terminal-test",
      container_type_id: "type-20",
      load: "Plein",
      price: "100000",
      trip_containers: [
        { number: "MSCU1234566", size: 20 },
        { number: "CSQU3054383", size: 20 },
      ],
    },
  ],
  expenses: [],
  trucks: [{ id: "truck-test", plate: "CI-0000-TEST" }],
  references: {
    drivers: [{ id: "driver-test", first_name: "Test", last_name: "Chauffeur" }],
    terminals: [{ id: "terminal-test", name: "Abidjan Terminal" }],
    container_types: [{ id: "type-20", name: "20 pieds sec" }],
  },
  totals: { revenue: "100000", expenses: "0", profit: "100000", trips: 1 },
};
app.get("/xlsx", async (_req, res) =>
  exportReport(res, "xlsx", report, "Test only", "2026-11-01 au 2026-11-30"),
);
app.get("/pdf", async (_req, res) =>
  exportReport(res, "pdf", report, "Test only", "2026-11-01 au 2026-11-30"),
);
describe("Vrais fichiers de rapport", () => {
  it("génère un classeur Excel lisible", async () => {
    const r = await request(app)
      .get("/xlsx")
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(r.status).toBe(200);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(r.body);
    expect(book.getWorksheet("Synthèse")?.getCell("A1").value).toBe(
      "Test only",
    );
    expect(book.worksheets.length).toBeGreaterThanOrEqual(4);
    expect(book.creator).toBe("OTL — OASIS TRANSPORT LOGISTICS");
    for (const sheet of book.worksheets)
      expect(sheet.getImages()).toHaveLength(1);
    expect(book.getWorksheet("Synthèse")?.getCell("A3").value).toBe(
      "Indicateur",
    );
  });
  it("liste les numéros de conteneurs dans la feuille Voyages", async () => {
    const r = await request(app)
      .get("/xlsx")
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(r.body);
    const sheet = book.getWorksheet("Voyages");
    expect(sheet?.getCell("H3").value).toBe("Conteneurs");
    expect(sheet?.getCell("I3").value).toBe("Nb conteneurs");
    expect(sheet?.getCell("H4").value).toBe("CSQU3054383 + MSCU1234566");
    expect(sheet?.getCell("I4").value).toBe(2);
  });
  it("génère un PDF binaire", async () => {
    const r = await request(app)
      .get("/pdf")
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(r.status).toBe(200);
    expect(r.body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(r.headers["content-disposition"]).toContain(".pdf");
    expect(r.body.includes(Buffer.from("/Subtype /Image"))).toBe(true);
  });
});
