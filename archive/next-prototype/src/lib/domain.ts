export type Shift = "Jour" | "Nuit";
export type Container = "20 pieds DRY" | "40 pieds DRY" | "40 pieds REEFER";
export type Terminal = "ATL" | "CIT";
export type Truck = {
  id: string;
  plate: string;
  driver: string;
  status: "Disponible" | "En mission" | "Maintenance";
};
export type Trip = {
  id: string;
  date: string;
  truckId: string;
  shift: Shift;
  terminal: Terminal;
  container: Container;
  load: "Plein" | "Vide";
  quantity: number;
  price: number;
  paid: number;
};
export type Expense = {
  id: string;
  date: string;
  truckId: string;
  tripId: string;
  category: string;
  description: string;
  amount: number;
};
export type Data = { trucks: Truck[]; trips: Trip[]; expenses: Expense[] };
export type Filters = {
  start: string;
  end: string;
  truck: string;
  shift: string;
  terminal: string;
  container: string;
  load: string;
  query: string;
};
export const containers: Container[] = [
  "20 pieds DRY",
  "40 pieds DRY",
  "40 pieds REEFER",
];
export const categories = [
  "Carburant",
  "Entretien",
  "Péage",
  "Salaire / prime",
  "Manutention",
  "Autre",
];
export const money = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
export const localDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Abidjan" });
export const total = (t: Trip) => t.quantity * t.price;
export function matchesTrip(t: Trip, f: Filters, trucks: Truck[]) {
  const truck = trucks.find((x) => x.id === t.truckId);
  return (
    (!f.start || t.date >= f.start) &&
    (!f.end || t.date <= f.end) &&
    (!f.truck || t.truckId === f.truck) &&
    (!f.shift || t.shift === f.shift) &&
    (!f.terminal || t.terminal === f.terminal) &&
    (!f.container || t.container === f.container) &&
    (!f.load || t.load === f.load) &&
    (!f.query ||
      `${truck?.plate} ${truck?.driver} ${t.terminal} ${t.container}`
        .toLowerCase()
        .includes(f.query.toLowerCase()))
  );
}
export function filteredData(data: Data, f: Filters) {
  const trips = data.trips.filter((t) => matchesTrip(t, f, data.trucks));
  const ids = new Set(trips.map((t) => t.id));
  const tripSpecific = !!(f.shift || f.terminal || f.container || f.load);
  const expenses = data.expenses.filter(
    (e) =>
      (!f.start || e.date >= f.start) &&
      (!f.end || e.date <= f.end) &&
      (!f.truck || e.truckId === f.truck) &&
      (!tripSpecific || ids.has(e.tripId)) &&
      (!f.query ||
        `${e.description} ${e.category} ${data.trucks.find((t) => t.id === e.truckId)?.plate}`
          .toLowerCase()
          .includes(f.query.toLowerCase())),
  );
  return { trips, expenses };
}
export function summarize(trips: Trip[], expenses: Expense[]) {
  const revenue = trips.reduce((a, t) => a + total(t), 0);
  const paid = trips.reduce((a, t) => a + t.paid, 0);
  const spent = expenses.reduce((a, e) => a + e.amount, 0);
  return {
    revenue,
    paid,
    spent,
    profit: revenue - spent,
    cash: paid - spent,
    pending: revenue - paid,
    count: trips.reduce((a, t) => a + t.quantity, 0),
  };
}
export function validateTrip(t: Trip) {
  return (
    !!t.date &&
    !!t.truckId &&
    Number.isSafeInteger(t.quantity) &&
    t.quantity > 0 &&
    Number.isSafeInteger(t.price) &&
    t.price > 0 &&
    Number.isSafeInteger(total(t)) &&
    Number.isSafeInteger(t.paid) &&
    t.paid >= 0 &&
    t.paid <= total(t)
  );
}
export function demoData(): Data {
  const trucks: Truck[] = [
    {
      id: "t1",
      plate: "AA 4821 CI",
      driver: "Kouamé Jean",
      status: "En mission",
    },
    {
      id: "t2",
      plate: "AB 7390 CI",
      driver: "Traoré Moussa",
      status: "Disponible",
    },
    {
      id: "t3",
      plate: "AA 9156 CI",
      driver: "Yao Fabrice",
      status: "En mission",
    },
    {
      id: "t4",
      plate: "AC 2048 CI",
      driver: "Koné Ibrahim",
      status: "Maintenance",
    },
  ];
  const today = localDate();
  const trips: Trip[] = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - Math.floor(i / 3));
    const quantity = [3, 2, 4, 2, 3, 1][i % 6];
    const price = [45000, 35000, 65000][i % 3];
    return {
      id: `v${i}`,
      date: d.toISOString().slice(0, 10),
      truckId: `t${(i % 3) + 1}`,
      shift: i % 2 ? "Nuit" : "Jour",
      terminal: i % 3 ? "ATL" : "CIT",
      container: containers[i % 3],
      load: i % 4 ? "Plein" : "Vide",
      quantity,
      price,
      paid: i % 4 ? quantity * price : 0,
    };
  });
  return {
    trucks,
    trips,
    expenses: [
      {
        id: "e1",
        date: today,
        truckId: "t1",
        tripId: "v0",
        category: "Carburant",
        description: "Gasoil — station Vridi",
        amount: 85000,
      },
      {
        id: "e2",
        date: today,
        truckId: "t2",
        tripId: "v1",
        category: "Péage",
        description: "Péage et accès portuaire",
        amount: 12000,
      },
      {
        id: "e3",
        date: today,
        truckId: "t4",
        tripId: "",
        category: "Entretien",
        description: "Vidange et filtres",
        amount: 65000,
      },
      {
        id: "e4",
        date: trips[10].date,
        truckId: "t2",
        tripId: "v10",
        category: "Carburant",
        description: "Approvisionnement gasoil",
        amount: 110000,
      },
      {
        id: "e5",
        date: trips[16].date,
        truckId: "t1",
        tripId: "",
        category: "Salaire / prime",
        description: "Prime chauffeur",
        amount: 35000,
      },
    ],
  };
}
