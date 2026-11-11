import { Link } from "react-router-dom";
import { ArrowRight, Activity } from "lucide-react";
import { money } from "../utils/format";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
export function ActivityOverview({
  chart,
}: {
  chart: { date: string; recettes: number; depenses: number }[];
}) {
  return (
    <article className="card chart-card">
      <div className="card-heading">
        <div>
          <h2>Votre activité, en perspective</h2>
          <p>Recettes et dépenses · FCFA</p>
        </div>
        <span className="badge blue">Période sélectionnée</span>
      </div>
      {chart.length ? (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#3376ef" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3376ef" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 5"
                vertical={false}
                stroke="var(--line)"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => d.slice(5)}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#91a0b5" }}
              />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#91a0b5" }}
              />
              <Tooltip
                formatter={(v) => `${money(Number(v))} FCFA`}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e4eaf4",
                }}
              />
              <Area
                type="monotone"
                dataKey="recettes"
                name="Recettes"
                stroke="#3376ef"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
              />
              <Area
                type="monotone"
                dataKey="depenses"
                name="Dépenses"
                stroke="#eb9a63"
                strokeWidth={2}
                fill="transparent"
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty />
      )}
      <div className="chart-footer">
        <span>
          <i className="dot green" />
          Données réelles · Aucun montant simulé
        </span>
        <Link to="/reports">
          Rapports détaillés <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
export function FinancialCharts({
  months,
  expenseGroups,
}: {
  months: Map<string, { month: string; benefice: number }>;
  expenseGroups: { name: string; value: number }[];
}) {
  return (
    <section className="analytics-grid equal">
      <article className="card chart-card">
        <div className="card-heading">
          <div>
            <h2>Évolution mensuelle du bénéfice</h2>
            <p>Recettes − dépenses · FCFA</p>
          </div>
        </div>
        {months.size ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...months.values()]}>
                <CartesianGrid
                  strokeDasharray="3 5"
                  vertical={false}
                  stroke="var(--line)"
                />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="benefice" fill="#3376ef" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty />
        )}
      </article>
      <article className="card chart-card">
        <div className="card-heading">
          <div>
            <h2>Dépenses par catégorie</h2>
            <p>Les postes clés de votre exploitation</p>
          </div>
        </div>
        {expenseGroups.length ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseGroups}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                >
                  {expenseGroups.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        ["#3376ef", "#6c62e6", "#28a78e", "#e9a25f", "#7da5e7"][
                          i % 5
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty />
        )}
      </article>
    </section>
  );
}

function ChartEmpty() {
  return (
    <div className="chart-empty">
      <Activity size={30} />
      <span>Vos performances prendront forme ici.</span>
      <small>
        Enregistrez vos premières opérations pour afficher les graphiques.
      </small>
    </div>
  );
}
