"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

const TABS = [
  { slug: "rover-cameras", label: "Rover Cameras" },
  { slug: "site-1-documentation", label: "Site 1 Documentation" },
  { slug: "site-2-documentation", label: "Site 2 Documentation" },
];

export default function ScienceRoverOperatorTabPage() {
  const { tab } = useParams();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <nav
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid #444",
          background: "#222",
        }}
      >
        {TABS.map((t) => (
          <Link
            key={t.slug}
            href={`/missions/science/rover-operator/${t.slug}`}
            style={{
              padding: "0.75rem 1.5rem",
              color: tab === t.slug ? "#fff" : "#aaa",
              background: tab === t.slug ? "#333" : "transparent",
              borderBottom: tab === t.slug ? "2px solid #4a9eff" : "2px solid transparent",
              textDecoration: "none",
              fontWeight: tab === t.slug ? "bold" : "normal",
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div style={{ flex: 1, padding: "1rem" }}>
        <h1>Science — Rover Operator: {TABS.find((t) => t.slug === tab)?.label ?? tab}</h1>
        <p>
          {tab === "rover-cameras" && "Live rover camera feeds."}
          {tab === "site-1-documentation" && "Documentation and photos for Site 1."}
          {tab === "site-2-documentation" && "Documentation and photos for Site 2."}
        </p>
      </div>
    </div>
  );
}
