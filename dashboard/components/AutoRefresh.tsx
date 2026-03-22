"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 10_000; // 10 seconds

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <span className="ml-2 text-xs text-white/70">
      (auto-refresh every 10s)
    </span>
  );
}
