"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MAIN = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/dictionnaire", label: "Dictionnaire", icon: "📖" },
  { href: "/apprendre", label: "Apprendre", icon: "🎯" },
  { href: "/secteurs", label: "Secteurs", icon: "🏥" },
  { href: "/assistant", label: "Assistant IA", icon: "✨" },
];
const MORE = [
  { href: "/traduire", label: "Traduire" },
  { href: "/proverbes", label: "Proverbes" },
  { href: "/alphabet", label: "Alphabet" },
  { href: "/progres", label: "Progrès" },
  { href: "/contribuer", label: "Contribuer" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function TopBar() {
  const path = usePathname();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Vun Marbana — accueil">
        <span className="brand-mark">V</span>
        <span>Vun Marbana</span>
      </Link>
      {!online && <span className="offline-pill">Hors-ligne</span>}
      <nav className="topnav" aria-label="Navigation principale">
        {[...MAIN.slice(1), ...MORE].map((l) => (
          <Link key={l.href} href={l.href} className={isActive(path, l.href) ? "active" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottomnav" aria-label="Navigation">
      {MAIN.map((l) => (
        <Link key={l.href} href={l.href} className={isActive(path, l.href) ? "active" : ""}>
          <span aria-hidden>{l.icon}</span>
          <span>{l.label === "Assistant IA" ? "IA" : l.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
