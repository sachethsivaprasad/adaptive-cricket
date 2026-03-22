"use client";

import { useCallback, useEffect, useState } from "react";
import {
  sendManualOverride,
  sendPersonaSelection,
  setControlMode,
  getControlState,
} from "@/lib/dataService";
import type { BallParameters } from "@/lib/types";

const SPEED_MIN = 80;
const SPEED_MAX = 100;

const DEFAULT_MANUAL: BallParameters = {
  speed_kph: 90,
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

const PARAM_LABELS: Record<keyof BallParameters, string> = {
  speed_kph: "Speed (kph)",
  target_length: "Length",
  target_line: "Line",
  spin_rpm: "Spin (rpm)",
  swing_angle: "Swing (°)",
};

function clampSpeed(v: number): number {
  const n = Number(v);
  if (Number.isNaN(n)) return SPEED_MIN;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, n));
}

function withClampedSpeed(ball: BallParameters): BallParameters {
  return { ...ball, speed_kph: clampSpeed(ball.speed_kph) };
}

const btnBase =
  "rounded-xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2";

const btnSelected =
  `${btnBase} bg-violet-600 text-white shadow-sm hover:bg-violet-700`;
const btnUnselectedSecondary =
  `${btnBase} bg-violet-100 text-violet-700 hover:bg-violet-200`;
const btnUnselectedNeutral =
  `${btnBase} bg-slate-100 text-slate-700 hover:bg-slate-200`;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500";

export function ControlPanel() {
  const [manual, setManual] = useState<BallParameters>(() => withClampedSpeed(DEFAULT_MANUAL));
  const [message, setMessage] = useState<string>("");
  const [mode, setMode] = useState<"rl" | "manual" | "persona">("rl");
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const state = await getControlState();
    const m = state?.fastapi_state?.mode;
    if (m === "rl" || m === "manual" || m === "persona") {
      setMode(m);
    }
    const pid = state?.fastapi_state?.persona_id;
    setActivePersonaId(typeof pid === "string" ? pid : null);
    const ball = state?.fastapi_state?.manual_ball;
    if (ball && typeof ball === "object") {
      setManual(withClampedSpeed(ball as BallParameters));
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const onSetRL = async () => {
    const ok = await setControlMode("rl");
    setMessage(ok ? "Switched to RL mode." : "Failed to switch mode.");
    if (ok) await refreshState();
  };

  const onSendManual = async () => {
    const ok = await sendManualOverride(true, withClampedSpeed(manual));
    setMessage(ok ? "Manual override queued." : "Failed to queue manual override.");
    if (ok) await refreshState();
  };

  const onDisableManual = async () => {
    const ok = await sendManualOverride(false);
    setMessage(ok ? "Manual override disabled." : "Failed to disable manual override.");
    if (ok) await refreshState();
  };

  const onSendPersona = async (id: string, ball: BallParameters) => {
    const ok = await sendPersonaSelection({ id, ball });
    setMessage(ok ? `Persona '${id}' queued.` : "Failed to queue persona.");
    if (ok) await refreshState();
  };

  const updateManualField = (key: keyof BallParameters, value: number) => {
    if (Number.isNaN(value)) return;
    setManual((prev) => ({ ...prev, [key]: value }));
  };

  const isManual = mode === "manual";
  const isPersona = mode === "persona";
  const rlActive = mode === "rl" && !isPersona;
  const disableManualEmphasis = mode === "rl" && !isPersona;

  return (
    <section className="dashboard-card p-6">
      <h2 className="text-lg font-semibold text-slate-900">Control Panel</h2>
      <p className="mt-1 text-sm text-slate-500">
        Override the next ball source: RL, Manual, or Persona.
      </p>
      {isPersona ? (
        <p className="mt-2 text-xs font-medium text-violet-700">Persona mode is active.</p>
      ) : null}

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mode</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={rlActive ? btnSelected : btnUnselectedSecondary}
            aria-pressed={rlActive}
            onClick={onSetRL}
          >
            RL Mode
          </button>
          <button
            type="button"
            className={isManual ? btnSelected : btnUnselectedSecondary}
            aria-pressed={isManual}
            onClick={onSendManual}
          >
            Enable Manual
          </button>
          <button
            type="button"
            className={
              disableManualEmphasis
                ? `${btnUnselectedSecondary} ring-2 ring-violet-500 ring-offset-2`
                : isManual
                  ? btnUnselectedSecondary
                  : btnUnselectedNeutral
            }
            aria-pressed={disableManualEmphasis}
            onClick={onDisableManual}
          >
            Disable Manual
          </button>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manual parameters</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(manual) as (keyof BallParameters)[]).map((key) => {
            const value = manual[key];
            const isSpeed = key === "speed_kph";
            return (
              <label key={key} className="block text-xs font-medium text-slate-600">
                {PARAM_LABELS[key]}
                <input
                  className={inputClass}
                  type="number"
                  min={isSpeed ? SPEED_MIN : undefined}
                  max={isSpeed ? SPEED_MAX : undefined}
                  step={
                    isSpeed
                      ? 1
                      : key === "target_length" || key === "target_line"
                        ? 0.01
                        : key === "swing_angle"
                          ? 0.1
                          : 1
                  }
                  value={Number(value)}
                  onChange={(e) => updateManualField(key, Number(e.target.value))}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Personas</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PERSONAS.map((p) => {
            const personaSelected = isPersona && activePersonaId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={personaSelected ? btnSelected : btnUnselectedSecondary}
                aria-pressed={personaSelected}
                onClick={() => onSendPersona(p.id, p.ball)}
              >
                Persona: {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
