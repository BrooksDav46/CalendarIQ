"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { loadIntake, saveIntake, type Intake } from "../app/lib/storage";


export default function IntakeForm() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [form, setForm] = useState<Omit<Intake, "completedAt">>({
    fullName: "",
    phone: "",
    address: "",
    notes: "",
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const existing = loadIntake(user.id);
    if (existing) {
      setForm({
        fullName: existing.fullName,
        phone: existing.phone,
        address: existing.address,
        notes: existing.notes || "",
      });
      return;
    }

    setForm((p) => ({
      ...p,
      fullName: user.fullName || p.fullName,
    }));
  }, [isLoaded, user?.id]);

  const update = (k: keyof typeof form, v: string) => {
    setError(null);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) return setError("Auth not ready. Refresh and try again.");
    if (!form.fullName.trim()) return setError("Full name is required.");
    if (!form.phone.trim()) return setError("Phone is required.");
    if (!form.address.trim()) return setError("Address is required.");

    saveIntake(user.id, { ...form, completedAt: Date.now() });


    // send back to landing page
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-xl bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold">Client Intake</h1>
        <p className="text-gray-600 mt-1">
          Enter your details so we can schedule and prepare your appointment.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold">Full name</label>
            <input
              className="mt-2 w-full border rounded px-3 py-2"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Phone</label>
            <input
              className="mt-2 w-full border rounded px-3 py-2"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Address</label>
            <input
              className="mt-2 w-full border rounded px-3 py-2"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main St, City, ST"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Notes (optional)</label>
            <textarea
              className="mt-2 w-full border rounded px-3 py-2 min-h-[90px]"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Gate code, preferred time window, etc."
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button className="w-full bg-black text-white py-2 rounded">
            Save and continue
          </button>
        </form>
      </div>
    </main>
  );
}
