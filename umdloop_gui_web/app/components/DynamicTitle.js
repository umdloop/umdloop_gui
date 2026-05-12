"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Sets the document title to include the monitor slot identifier
 * (e.g., "slot-3") so that external tools like xdotool can identify
 * which Chrome window corresponds to which monitor.
 *
 * This component renders nothing — it only produces a side effect.
 */
export default function DynamicTitle() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const monitor = searchParams.get("monitor");

  useEffect(() => {
    if (monitor) {
      document.title = `UMDLoop - ${monitor}`;
    }
  }, [monitor, pathname]);

  return null;
}
