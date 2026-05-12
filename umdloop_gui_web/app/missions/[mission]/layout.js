"use client";

import { useParams } from "next/navigation";
import MissionContext from "../MissionContext";
import RadioLossBanner from "../../components/RadioLossBanner";

export default function MissionLayout({ children }) {
  const params = useParams();
  const mission = params.mission;

  return (
    <MissionContext.Provider value={{ mission }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          background: "#1a1a1a",
          color: "#fff",
        }}
      >
        {children}
        <RadioLossBanner />
      </div>
    </MissionContext.Provider>
  );
}
