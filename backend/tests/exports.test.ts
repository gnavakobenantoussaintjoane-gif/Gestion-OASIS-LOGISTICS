import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import ExcelJS from "exceljs";
import { exportReport } from "../src/services/exports.js";
const app = express();
const report = {
  trips: [],
  expenses: [],
  trucks: [],
  totals: { revenue: "0", expenses: "0", profit: "0", trips: 0 },
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
