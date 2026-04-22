"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "credit_manager", label: "Credit Manager" },
];

export function UserRoleControls({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const [role, setRole] = useState(currentRole);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dirty = role !== currentRole;

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId, role }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `Save failed (${res.status})`);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        disabled={isSelf || isPending}
        className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white disabled:bg-slate-100 disabled:text-slate-500"
        title={isSelf ? "You cannot change your own role" : undefined}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-md font-medium"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
      {isSelf && <span className="text-xs text-slate-400">(you)</span>}
    </div>
  );
}
