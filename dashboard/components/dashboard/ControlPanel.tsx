"use client";

import { useState } from "react";
import {
  sendManualOverride,
  sendPersonaSelection,
  setControlMode,
} from "@/lib/dataService";
import type { BallParameters } from "@/lib/types";

const DEFAULT_MANUAL: BallParameters = {
  speed_kph: 135,
  target_length: 4.5,
  target_line: 0.0,
  spin_rpm: 1500,
  swing_angle: 0,
};

const PERSONAS: Array<{ id: string; label: string; ball: BallParameters }> = [
  {
    id: "bumrah_like",
    label: "Bumrah-like",
    ball: { speed_kph: 146, target_length: 5.2, target_line: 0.15, spin_rpm: 900, swing_angle: 3.5 },
  },
  {
    id: "ashwin_like",
    label: "Ashwin-like",
    ball: { speed_kph: 98, target_length: 4.0, target_line: -0.2, spin_rpm: 2500, swing_angle: -1.0 },
  },
];

export function ControlPanel() {
  const [manual, setManual] = useState<BallParameters>(DEFAULT_MANUAL);
  const [message, setMessage] = useState<string>("");

  const onSetRL = async () => {
    const ok = await setControlMode("rl");
    setMessage(ok ? "Switched to RL mode." : "Failed to switch mode.");
  };

  const onSendManual = async () => {
    const ok = await sendManualOverride(true, manual);
    setMessage(ok ? "Manual override queued." : "Failed to queue manual override.");
  };

  const onDisableManual = async () => {
    const ok = await sendManualOverride(false);
    setMessage(ok ? "Manual override disabled." : "Failed to disable manual override.");
  };

  const onSendPersona = async (id: string, ball: BallParameters) => {
    const ok = await sendPersonaSelection({ id, ball });
    setMessage(ok ? `Persona '${id}' queued.` : "Failed to queue persona.");
  };

  return (
    <section className="rounded-xl border border-cricket-gold/30 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-cricket-green">Control Panel</h2>
      <p className="mt-1 text-sm text-gray-600">Override the next ball source: RL, Manual, or Persona.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded bg-cricket-green px-3 py-2 text-sm text-white" onClick={onSetRL}>
          RL Mode
        </button>
        <button className="rounded bg-blue-600 px-3 py-2 text-sm text-white" onClick={onSendManual}>
          Enable Manual
        </button>
        <button className="rounded bg-gray-700 px-3 py-2 text-sm text-white" onClick={onDisableManual}>
          Disable Manual
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(manual).map(([key, value]) => (
          <label key={key} className="text-xs text-gray-700">
            {key}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              type="number"
              value={Number(value)}
              onChange={(e) => setManual((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            className="rounded bg-purple-600 px-3 py-2 text-sm text-white"
            onClick={() => onSendPersona(p.id, p.ball)}
          >
            Persona: {p.label}
          </button>
        ))}
      </div>

      {message ? <p className="mt-3 text-sm text-gray-700">{message}</p> : null}
    </section>
  );
}

