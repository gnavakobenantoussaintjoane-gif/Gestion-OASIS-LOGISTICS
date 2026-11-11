import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Truck,
  UsersRound,
  Route,
  SunMoon,
  Wallet,
  ChartNoAxesCombined,
  SlidersHorizontal,
  Settings,
  Bell,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  X,
  Anchor,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import Brand from "../components/Brand";
import { api } from "../api/client";
import { useSession } from "../contexts/SessionContext";
import { usePreferences } from "../contexts/PreferencesContext";
import { roleNames, type Row } from "../types";
const nav = [
  {
    to: "/",
    label: "Vue d’ensemble",
    icon: LayoutDashboard,
    roles: ["admin", "manager"],
  },
  {
    to: "/records/trucks",
    label: "Camions",
    icon: Truck,
    roles: ["admin", "manager", "operator"],
  },
  {
    to: "/records/drivers",
    label: "Chauffeurs",
    icon: UsersRound,
    roles: ["admin", "manager", "operator"],
  },
  {
    to: "/records/trips",
    label: "Voyages",
    icon: Route,
    roles: ["admin", "manager", "operator", "driver"],
  },
  {
    to: "/shifts",
    label: "Shifts jour & soir",
    icon: SunMoon,
    roles: ["admin", "manager"],
  },
  {
    to: "/records/expenses",
    label: "Dépenses",
    icon: Wallet,
    roles: ["admin", "manager"],
  },
  {
    to: "/reports",
    label: "Finances & rapports",
    icon: ChartNoAxesCombined,
    roles: ["admin", "manager"],
  },
  {
    to: "/records/tariff_rules",
    label: "Grille tarifaire",
    icon: SlidersHorizontal,
    roles: ["admin", "manager", "operator"],
  },
];
export default function AppLayout() {
  const { session, logout } = useSession();
  const { dark, toggleDark, animations } = usePreferences();
  const reduce = useReducedMotion();
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<Row[]>("/notifications"),
    refetchInterval: 30000,
  });
  const unread = notifications.data?.filter((n) => !n.read_at).length || 0;
  const role = session!.role!;
  const current =
    nav.find((n) => n.to === location.pathname)?.label ||
    {
      "/settings": "Paramètres",
      "/notifications": "Notifications",
      "/audit": "Journal d’audit",
    }[location.pathname] ||
    "GESTION";
  const initials =
    session?.profile?.full_name
      ?.split(" ")
      .map((s: string) => s[0])
      .slice(0, 2)
      .join("") || "G";
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Fermer le menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-close icon-button"
            aria-label="Fermer le menu"
            onClick={() => setMobile(false)}
          >
            <X size={19} />
          </button>
        </div>
        <div className="company-switch">
          <span>{session?.company?.name?.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{session?.company?.name}</strong>
            <small>Espace entreprise</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="nav-caption">PILOTAGE DE L’ACTIVITÉ</p>
        <nav>
          {nav
            .filter((n) => n.roles.includes(role))
            .map((n) => (
              <NavLink
                end={n.to === "/"}
                key={n.to}
                to={n.to}
                onClick={() => setMobile(false)}
              >
                <n.icon size={18} />
                {n.label}
                {n.to === "/" && <i />}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="port-card">
            <Anchor size={22} />
            <h3>Le cap sur la performance.</h3>
            <p>Chaque opération compte.</p>
            <NavLink
              to={
                ["admin", "manager"].includes(role)
                  ? "/reports"
                  : "/records/trips"
              }
            >
              Voir mon activité <ArrowUpRight size={15} />
            </NavLink>
            <span>ABIDJAN · CI</span>
          </div>
          <nav>
            <NavLink to="/notifications" onClick={() => setMobile(false)}>
              <Bell size={18} />
              Notifications
              {unread > 0 && <b className="nav-counter">{unread}</b>}
            </NavLink>
            {["admin", "manager"].includes(role) && (
              <NavLink to="/audit" onClick={() => setMobile(false)}>
                <ClipboardList size={18} />
                Journal d’audit
              </NavLink>
            )}
            <NavLink to="/settings" onClick={() => setMobile(false)}>
              <Settings size={18} />
              Paramètres
            </NavLink>
          </nav>
          <div className="sidebar-profile">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{session?.profile?.full_name}</strong>
              <small>{roleNames[role]}</small>
            </div>
            <button
              className="icon-button"
              title="Se déconnecter"
              aria-label="Se déconnecter"
              onClick={() => void logout().catch((e) => toast.error(e.message))}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Ouvrir le menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Espace de travail</span>
            <b>/</b>
            <strong>{current}</strong>
          </div>
          <div className="top-actions">
            <span className="location-label">
              <i />
              Abidjan, Côte d’Ivoire
            </span>
            <button
              className="icon-button"
              aria-label="Changer le thème"
              onClick={toggleDark}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NavLink
              to="/notifications"
              className="notification-button"
              aria-label={`${unread} notifications non lues`}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </NavLink>
            <NavLink className="avatar" to="/settings">
              {initials}
            </NavLink>
          </div>
        </header>
        <motion.main
          key={location.pathname}
          initial={animations && !reduce ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: animations && !reduce ? 0.2 : 0 }}
        >
          <Outlet />
          <footer className="app-footer">
            <span>
              GESTION <b>TRANSPORT & LOGISTICS</b>
            </span>
            <span>
              Conçu pour aller plus loin. <i>✦</i>
            </span>
          </footer>
        </motion.main>
      </div>
    </div>
  );
}
