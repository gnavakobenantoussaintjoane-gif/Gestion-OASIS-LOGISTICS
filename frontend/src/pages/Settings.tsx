import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  UserRound,
  ShieldCheck,
  Palette,
  ArrowUpRight,
  Save,
} from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../contexts/SessionContext";
import { usePreferences } from "../contexts/PreferencesContext";
import { roleNames, type Row } from "../types";
export default function Settings() {
  const { session, reload } = useSession();
  const { dark, toggleDark, animations, toggleAnimations } = usePreferences();
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const admin = session?.role === "admin";
  const members = useQuery({
    queryKey: ["members"],
    queryFn: () => api<Row[]>("/members"),
    enabled: admin,
  });
  async function send(
    path: string,
    body: Record<string, any>,
    method = "PATCH",
  ) {
    setBusy(true);
    try {
      await api(path, { method, body: JSON.stringify(body) });
      await reload();
      await client.invalidateQueries({ queryKey: ["members"] });
      toast.success("Modifications enregistrées.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">UN ESPACE À VOTRE IMAGE</div>
          <h1>
            Paramètres<span className="title-dot">.</span>
          </h1>
          <p>Votre entreprise, vos accès et vos préférences.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="card settings-card">
          <h2>
            <UserRound size={19} />
            Mon profil
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(
                "/profile",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
            }}
          >
            <label>
              Nom complet
              <input
                name="full_name"
                defaultValue={session?.profile?.full_name}
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            <label>
              Téléphone
              <input
                name="phone"
                defaultValue={session?.profile?.phone || ""}
                maxLength={30}
              />
            </label>
            <div className="settings-line">
              <span>Adresse e-mail</span>
              <strong>{session?.user.email}</strong>
            </div>
            <div className="settings-line">
              <span>Rôle</span>
              <span className="badge blue">{roleNames[session!.role!]}</span>
            </div>
            <button className="button primary" disabled={busy}>
              <Save size={15} />
              Enregistrer mon profil
            </button>
          </form>
        </section>
        <section className="card settings-card">
          <h2>
            <Building2 size={19} />
            Entreprise
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(
                "/company",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
            }}
          >
            <label>
              Raison sociale
              <input
                name="name"
                defaultValue={session?.company?.name}
                disabled={!admin}
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            <label>
              Coordonnées
              <input
                name="address"
                defaultValue={session?.company?.address || ""}
                disabled={!admin}
                maxLength={500}
              />
            </label>
            <label>
              Téléphone
              <input
                name="phone"
                defaultValue={session?.company?.phone || ""}
                disabled={!admin}
                maxLength={30}
              />
            </label>
            <div className="settings-line">
              <span>Devise / fuseau</span>
              <strong>FCFA (XOF) · Africa/Abidjan</strong>
            </div>
            {admin && (
              <button className="button primary" disabled={busy}>
                <Save size={15} />
                Enregistrer l’entreprise
              </button>
            )}
          </form>
        </section>
        <section className="card settings-card">
          <h2>
            <Palette size={19} />
            Affichage & animations
          </h2>
          <div className="preference-row">
            <div>
              <strong>Mode sombre</strong>
              <small>Une interface adaptée à votre environnement.</small>
            </div>
            <button
              role="switch"
              aria-checked={dark}
              aria-label="Mode sombre"
              className={`switch ${dark ? "on" : ""}`}
              onClick={toggleDark}
            >
              <i />
            </button>
          </div>
          <div className="preference-row">
            <div>
              <strong>Animations des camions</strong>
              <small>
                La réduction du mouvement du système reste prioritaire.
              </small>
            </div>
            <button
              role="switch"
              aria-checked={animations}
              aria-label="Animations"
              className={`switch ${animations ? "on" : ""}`}
              onClick={toggleAnimations}
            >
              <i />
            </button>
          </div>
          <div className="info-box">
            Seules vos préférences d’affichage sont stockées dans ce navigateur.
            Les opérations métier sont enregistrées dans Supabase.
          </div>
          {admin && (
            <div className="configuration-links">
              {[
                ["terminals", "Terminaux"],
                ["container_types", "Conteneurs"],
                ["expense_categories", "Catégories de dépenses"],
                ["tariff_rules", "Grille tarifaire"],
              ].map(([path, label]) => (
                <Link to={`/records/${path}`} key={path}>
                  {label}
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="card settings-card">
          <h2>
            <ShieldCheck size={19} />
            Sécurité
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const values = Object.fromEntries(new FormData(form));
              setBusy(true);
              try {
                await api("/auth/password", {
                  method: "POST",
                  body: JSON.stringify(values),
                });
                toast.success("Mot de passe modifié. Reconnectez-vous.");
                await reload();
              } catch (error) {
                toast.error((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Mot de passe actuel
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              Nouveau mot de passe
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
              <small>
                12 caractères minimum. Utilisez un mot de passe unique.
              </small>
            </label>
            <button className="button secondary" disabled={busy}>
              Modifier mon mot de passe
            </button>
          </form>
        </section>
      </div>
      {admin && (
        <section className="card settings-card member-card">
          <h2>Utilisateurs & permissions</h2>
          <p>
            Le membre doit créer et confirmer son compte, sans créer sa propre
            entreprise. Rattachez ensuite son adresse ici. Votre propre rôle ne
            peut pas être modifié pour éviter un verrouillage du compte.
          </p>
          <form
            className="member-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(
                "/members",
                Object.fromEntries(new FormData(e.currentTarget)),
                "POST",
              );
            }}
          >
            <label>
              Nom complet
              <input
                name="member_name"
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            <label>
              Adresse e-mail
              <input name="member_email" type="email" required />
            </label>
            <label>
              Rôle
              <select name="member_role">
                <option value="manager">Gestionnaire</option>
                <option value="operator">Opérateur</option>
                <option value="driver">Chauffeur</option>
                <option value="admin">Administrateur</option>
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              Rattacher / modifier le rôle
            </button>
          </form>
          {members.error && <p className="error">{members.error.message}</p>}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                </tr>
              </thead>
              <tbody>
                {members.data?.map((m) => (
                  <tr key={m.id}>
                    <td>{m.full_name}</td>
                    <td>{m.phone || "—"}</td>
                    <td>
                      <span className="badge blue">
                        {m.user_roles?.[0]?.role
                          ? roleNames[
                              m.user_roles[0].role as keyof typeof roleNames
                            ]
                          : m.user_roles?.role
                            ? roleNames[
                                m.user_roles.role as keyof typeof roleNames
                              ]
                            : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
