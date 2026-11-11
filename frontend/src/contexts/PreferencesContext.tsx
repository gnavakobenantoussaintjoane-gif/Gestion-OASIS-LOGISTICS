import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
function readPreference(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences remain in memory when browser storage is blocked. */
  }
}
const Context = createContext({
  dark: false,
  animations: true,
  toggleDark: () => {},
  toggleAnimations: () => {},
});
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(
    () => readPreference("gestion-theme") === "dark",
  );
  const [animations, setAnimations] = useState(
    () => readPreference("gestion-animations") !== "off",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    writePreference("gestion-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    writePreference("gestion-animations", animations ? "on" : "off");
    document.documentElement.dataset.animations = animations ? "on" : "off";
  }, [animations]);
  return (
    <Context.Provider
      value={{
        dark,
        animations,
        toggleDark: () => setDark((v) => !v),
        toggleAnimations: () => setAnimations((v) => !v),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const usePreferences = () => useContext(Context);
