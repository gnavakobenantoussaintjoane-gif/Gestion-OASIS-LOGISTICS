import { Data, Trip, Expense, summarize, total } from "./domain";
export async function exportReport(
  format: "xlsx" | "pdf",
  data: Data,
  trips: Trip[],
  expenses: Expense[],
  scope: string,
) {
  const plate = (id: string) =>
    data.trucks.find((t) => t.id === id)?.plate || "—";
  const th = [
    "Date",
    "Camion",
    "Shift",
    "Terminal",
    "Conteneur",
    "État",
    "Voyages",
    "Prix unitaire",
    "Recette",
    "Encaissé",
  ];
  const tr = trips.map((t) => [
    t.date,
    plate(t.truckId),
    t.shift,
    t.terminal,
    t.container,
    t.load,
    t.quantity,
    t.price,
    total(t),
    t.paid,
  ]);
  const eh = [
    "Date",
    "Camion",
    "Catégorie",
    "Description",
    "Voyage lié",
    "Montant",
  ];
  const er = expenses.map((e) => [
    e.date,
    plate(e.truckId),
    e.category,
    e.description,
    e.tripId || "Non affectée",
    e.amount,
  ]);
  const s = summarize(trips, expenses);
  const summary = [
    ["Recettes", s.revenue],
    ["Encaissé", s.paid],
    ["À encaisser", s.pending],
    ["Dépenses", s.spent],
    ["Résultat", s.profit],
    ["Trésorerie nette", s.cash],
    ["Nombre de voyages", s.count],
  ];
  if (format === "xlsx") {
    const ExcelJS = await import("exceljs");
    const book = new ExcelJS.Workbook();
    book.creator = "OASIS Logistics";
    for (const [name, headers, rows] of [
      ["Synthèse", ["Indicateur", "Valeur (FCFA sauf voyages)"], summary],
      ["Voyages", th, tr],
      ["Dépenses", eh, er],
      [
        "Camions",
        ["Immatriculation", "Chauffeur", "Statut"],
        data.trucks.map((t) => [t.plate, t.driver, t.status]),
      ],
    ] as [string, string[], (string | number)[][]][]) {
      const sheet = book.addWorksheet(name);
      sheet.addRow(headers);
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF107B66" },
      };
      sheet.columns.forEach((c) => {
        c.width = 24;
      });
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    }
    const bytes = await book.xlsx.writeBuffer();
    download(
      new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "xlsx",
    );
  } else {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(19);
    doc.text("OASIS / LOGISTICS", 14, 18);
    doc.setFontSize(10);
    doc.text(`Rapport en FCFA — ${scope}`, 14, 27);
    autoTable(doc, {
      startY: 34,
      head: [["Indicateur", "Valeur"]],
      body: summary,
      headStyles: { fillColor: [16, 123, 102] },
    });
    doc.addPage();
    doc.text("Voyages", 14, 18);
    autoTable(doc, {
      startY: 25,
      head: [th],
      body: tr,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 123, 102] },
    });
    doc.addPage();
    doc.text("Dépenses", 14, 18);
    autoTable(doc, {
      startY: 25,
      head: [eh],
      body: er,
      headStyles: { fillColor: [16, 123, 102] },
    });
    doc.addPage();
    doc.text("Parc de camions", 14, 18);
    autoTable(doc, {
      startY: 25,
      head: [["Immatriculation", "Chauffeur", "Statut"]],
      body: data.trucks.map((t) => [t.plate, t.driver, t.status]),
      headStyles: { fillColor: [16, 123, 102] },
    });
    doc.save(`oasis-rapport-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
function download(blob: Blob, extension: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `oasis-rapport-${new Date().toISOString().slice(0, 10)}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
