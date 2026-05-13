"use client";

import { useEffect } from "react";

/**
 * Generic modal overlay component.
 * Renders a fixed overlay with a centered card. Closes on backdrop click and Escape key.
 *
 * Props:
 * - open (boolean): whether the modal is visible
 * - onClose (function): called when the user dismisses the modal
 * - title (string, optional): header text displayed at the top of the modal
 * - children: modal body content
 * - width (string, optional): max width of the card (default: "min(760px, 96vw)")
 */
export default function Modal({ open, onClose, title, children, width }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: width || "min(760px, 96vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--color-surface-secondary, #222)",
          border: "1px solid var(--color-border-primary, #4a4a4a)",
          borderRadius: "var(--radius-lg, 12px)",
          padding: "14px",
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                color: "var(--color-text-primary, #ffffff)",
                fontWeight: 900,
                fontSize: "20px",
              }}
            >
              {title}
            </div>
            <button
              onClick={onClose}
              style={{
                borderRadius: "var(--radius-sm, 8px)",
                border: "1px solid #666",
                background: "var(--color-surface-elevated, #333)",
                color: "var(--color-text-primary, #ffffff)",
                cursor: "pointer",
                padding: "6px 10px",
                fontWeight: 800,
              }}
            >
              Close
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
