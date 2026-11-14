import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";
// Source commune aux exports et au frontend : logo officiel intact, jamais une recréation.
const logo = readFileSync(
  new URL("../../../shared/branding/otl-logo.jpg", import.meta.url),
);
export async function exportReport(
  res: Response,
  format: "xlsx" | "pdf",
  report: any,
  company: string,
  period: string,
) {
  const refs = report.references || {};
  const name = (table: string, id: string) => {
    const row = (table === "trucks" ? report.trucks : refs[table] || []).find(
      (r: any) => r.id === id,
    );
    return (
      row?.plate ||
      row?.name ||
      [row?.first_name, row?.last_name].filter(Boolean).join(" ") ||
      id ||
      "—"
    );
  };
  const grouped = (key: string, table: string) =>
    [...new Set<string>(report.trips.map((t: any) => t[key]))].map((id) => {
      const rows = report.trips.filter((t: any) => t[key] === id);
      return [
        table ? name(table, id) : id === "day" ? "Jour" : "Soir",
        rows.length,
        rows.reduce((s: bigint, t: any) => s + BigInt(t.price), 0n).toString(),
      ];
    });
  const sheets: [string, string[], (string | number)[][]][] = [
    [
      "Synthèse",
      ["Indicateur", "Valeur"],
      [
        ["Recettes (FCFA)", report.totals.revenue],
        ["Dépenses (FCFA)", report.totals.expenses],
        ["Bénéfice (FCFA)", report.totals.profit],
        ["Voyages", report.totals.trips],
      ],
    ],
    [
      "Voyages",
      [
        "Référence",
        "Date comptable",
        "Camion",
        "Chauffeur",
        "Shift",
        "Terminal",
        "Type conteneur",
        "Conteneurs",
        "Nb conteneurs",
        "État",
        "Tarif FCFA",
      ],
      report.trips.map((t: any) => [
        t.reference,
        t.accounting_date,
        name("trucks", t.truck_id),
        name("drivers", t.driver_id),
        t.shift === "day" ? "Jour" : "Soir",
        name("terminals", t.terminal_id),
        name("container_types", t.container_type_id),
        (t.trip_containers || [])
          .map((c: any) => c.number)
          .sort()
          .join(" + ") || "—",
        (t.trip_containers || []).length,
        t.load,
        t.price,
      ]),
    ],
    [
      "Dépenses",
      ["Référence", "Date", "Description", "Catégorie", "Montant FCFA"],
      report.expenses.map((e: any) => [
        e.reference,
        e.date,
        e.description,
        name("expense_categories", e.category_id),
        e.amount,
      ]),
    ],
    [
      "Camions",
      ["Immatriculation", "Marque", "Modèle", "Statut"],
      report.trucks.map((t: any) => [t.plate, t.brand, t.model, t.status]),
    ],
    ["Shifts", ["Shift", "Voyages", "Recettes FCFA"], grouped("shift", "")],
    [
      "Terminaux",
      ["Terminal", "Voyages", "Recettes FCFA"],
      grouped("terminal_id", "terminals"),
    ],
    [
      "Chauffeurs",
      ["Chauffeur", "Voyages", "Recettes FCFA"],
      grouped("driver_id", "drivers"),
    ],
  ];
  const filename = `gestion-rapport-${new Date().toISOString().slice(0, 10)}.${format}`;
  res.attachment(filename);
  if (format === "xlsx") {
    const book = new ExcelJS.Workbook();
    book.creator = "OTL — OASIS TRANSPORT LOGISTICS";
    const imageId = book.addImage({
      buffer: logo as unknown as ExcelJS.Buffer,
      extension: "jpeg",
    });
    for (const [name, head, rows] of sheets) {
      const sheet = book.addWorksheet(name);
      sheet.addRow([company]);

      sheet.addRow([period]);
      sheet.addRow(head);
      sheet.addRows(rows);
      sheet.getRow(1).height = 30;
      sheet.getRow(2).height = 30;
      sheet.addImage(imageId, {
        tl: { col: 7, row: 0 },
        ext: { width: 120, height: 60 },
      });
      sheet.getRow(3).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(3).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF102F70" },
      };
      sheet.columns.forEach((c) => {
        c.width = 25;
      });
      sheet.views = [{ state: "frozen", ySplit: 3 }];
    }
    res.type(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(Buffer.from(await book.xlsx.writeBuffer()));
  } else {
    res.type("application/pdf");
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 35,
    });
    doc.pipe(res);
    for (let i = 0; i < sheets.length; i++) {
      if (i) doc.addPage();
      const [title, head, rows] = sheets[i];
      const heading = () => {
        doc.image(logo, 35, 25, { width: 120 });
        doc.y = 35;
        doc
          .fillColor("#102f70")
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("OTL / " + company, 175, 35, { width: 630 });
        doc
          .fillColor("#62728b")
          .fontSize(10)
          .text(
            `${title} | ${period} | Généré le ${new Date().toLocaleDateString("fr-FR")} | FCFA`,
          );
        doc.x = 35;
        doc.y = 105;
      };
      heading();
      const widths = head.map(() => 770 / head.length);
      const render = (row: (string | number)[], bold = false) => {
        if (doc.y > 520) {
          doc.addPage();
          heading();
        }
        const y = doc.y;
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(8)
          .fillColor(bold ? "#102f70" : "#334155");
        let x = 35;
        row.forEach((v, j) => {
          doc.text(String(v).replace(/\u202f/g, " "), x, y, {
            width: widths[j] - 8,
            height: 30,
            ellipsis: true,
          });
          x += widths[j];
        });
        doc.y = y + 35;
      };
      render(head, true);
      for (const row of rows) render(row);
      if (!rows.length) doc.text("Aucune opération sur cette sélection.");
    }
    doc.end();
  }
}
