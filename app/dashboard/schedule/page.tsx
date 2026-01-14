"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  loadCalendar,
  saveCalendar,
  clearCalendar,
  type CalendarItem,
} from "../../lib/storage";

type ActionType =
  | "Inspection"
  | "Install"
  | "Repair"
  | "Phone Call"
  | "Follow-up"
  | "Invoice"
  | "Other";

const ACTIONS: { type: ActionType; hint: string }[] = [
  { type: "Inspection", hint: "On-site inspection" },
  { type: "Install", hint: "Install date" },
  { type: "Repair", hint: "Punch / repair" },
  { type: "Phone Call", hint: "Call the client" },
  { type: "Follow-up", hint: "Follow-up" },
  { type: "Invoice", hint: "Invoice / payment" },
  { type: "Other", hint: "Anything else" },
];

const pad2 = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const monthLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
const addMonths = (d: Date, delta: number) =>
  new Date(d.getFullYear(), d.getMonth() + delta, 1);

function isToday(d: Date) {
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

// Monday-start 6x7 grid
function buildGrid(viewDate: Date) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstDowMon0 = (first.getDay() + 6) % 7; // Sun->6, Mon->0
  const start = new Date(first);
  start.setDate(first.getDate() - firstDowMon0);

  const cells: { d: Date; inMonth: boolean; key: string }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ d, inMonth: d.getMonth() === viewDate.getMonth(), key: toKey(d) });
  }
  return cells;
}

function Sidebar({
  selected,
  onSelect,
}: {
  selected: ActionType;
  onSelect: (a: ActionType) => void;
}) {
  return (
    <aside className="w-full max-w-xs bg-white rounded-lg shadow p-4 h-[calc(100vh-2rem)] sticky top-4">
      <h1 className="text-xl font-bold">Recon IQ Calendar</h1>
      <p className="text-sm text-gray-600 mt-1">Pick an action, then click a day.</p>

      <div className="mt-5">
        <div className="text-sm font-semibold text-gray-800 mb-2">Action</div>
        <div className="space-y-2">
          {ACTIONS.map((a) => (
            <button
              key={a.type}
              type="button"
              onClick={() => onSelect(a.type)}
              className={[
                "w-full text-left rounded-md border px-3 py-2",
                selected === a.type
                  ? "border-black"
                  : "border-gray-200 hover:border-gray-300",
              ].join(" ")}
            >
              <div className="font-medium">{a.type}</div>
              <div className="text-xs text-gray-600">{a.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t pt-4">
        <div className="text-sm font-semibold text-gray-800 mb-2">Tips</div>
        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
          <li>Click a day to add a job/task.</li>
          <li>Later we’ll sync to Google Calendar.</li>
        </ul>
      </div>
    </aside>
  );
}

function Modal({
  dateKey,
  action,
  title,
  onTitle,
  onAdd,
  onClose,
  onClearAll,
}: {
  dateKey: string;
  action: ActionType;
  title: string;
  onTitle: (v: string) => void;
  onAdd: () => void;
  onClose: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold">Add to day</div>
            <div className="text-sm text-gray-600 mt-1">
              Date: <span className="font-semibold">{dateKey}</span> • Action:{" "}
              <span className="font-semibold">{action}</span>
            </div>
          </div>
          <button className="border rounded px-3 py-2 hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4">
          <label className="text-sm font-semibold text-gray-800">Title / notes</label>
          <input
            className="mt-2 w-full border rounded px-3 py-2"
            placeholder="Example: Smith - hail claim / measure"
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">Leave blank to auto-name it.</p>
        </div>

        <div className="mt-5 flex gap-2">
          <button className="flex-1 bg-black text-white rounded px-4 py-2" onClick={onAdd}>
            Add
          </button>
          <button className="flex-1 border rounded px-4 py-2 hover:bg-gray-50" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="mt-4 border-t pt-3">
          <button
            className="text-sm underline text-gray-700 hover:text-gray-900"
            onClick={() => {
              if (confirm("Clear ALL calendar items for this user?")) onClearAll();
            }}
          >
            Clear all calendar items
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { user, isLoaded } = useUser();

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedAction, setSelectedAction] = useState<ActionType>("Inspection");

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [modal, setModal] = useState<null | { dateKey: string; title: string }>(null);

  // Load items when auth is ready
  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    setItems(loadCalendar(user.id));
  }, [isLoaded, user?.id]);

  // Save items any time they change
  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    saveCalendar(user.id, items);
  }, [items, isLoaded, user?.id]);

  const cells = useMemo(() => buildGrid(viewDate), [viewDate]);

  const itemsByDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const arr = m.get(it.dateKey) ?? [];
      arr.push(it);
      m.set(it.dateKey, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => b.createdAt - a.createdAt);
      m.set(k, arr);
    }
    return m;
  }, [items]);

  const openAdd = (dateKey: string) => setModal({ dateKey, title: "" });

  const addItem = () => {
    if (!modal) return;
    if (!user?.id) return;

    const title =
      modal.title.trim() || (selectedAction === "Phone Call" ? "Client call" : selectedAction);

    const newItem: CalendarItem = {
      id: crypto.randomUUID(),
      dateKey: modal.dateKey,
      type: selectedAction,
      title,
      createdAt: Date.now(),
    };

    setItems((prev) => [newItem, ...prev]);
    setModal(null);
  };

  const deleteItem = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  const onClearAll = () => {
    if (!user?.id) return;
    clearCalendar(user.id);
    setItems([]);
    setModal(null);
  };

  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl p-4">
        <div className="flex gap-4">
          <Sidebar selected={selectedAction} onSelect={setSelectedAction} />

          <section className="flex-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-2xl font-bold">{monthLabel(viewDate)}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Selected: <span className="font-semibold">{selectedAction}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="border rounded px-3 py-2 hover:bg-gray-50"
                    onClick={() => setViewDate(addMonths(viewDate, -1))}
                  >
                    Prev
                  </button>
                  <button
                    className="border rounded px-3 py-2 hover:bg-gray-50"
                    onClick={() => setViewDate(new Date())}
                  >
                    Today
                  </button>
                  <button
                    className="border rounded px-3 py-2 hover:bg-gray-50"
                    onClick={() => setViewDate(addMonths(viewDate, 1))}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mt-4">
                {dow.map((d) => (
                  <div key={d} className="text-xs font-semibold text-gray-600 px-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* ✅ Day cells are DIVs (so we can have real buttons inside) */}
              <div className="grid grid-cols-7 gap-2 mt-2">
                {cells.map((c, idx) => {
                  const dayItems = itemsByDay.get(c.key) ?? [];

                  return (
                    <div
                      key={c.key + idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => openAdd(c.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openAdd(c.key);
                      }}
                      className={[
                        "text-left rounded-md border p-2 h-28 overflow-hidden hover:bg-gray-50 cursor-pointer select-none",
                        c.inMonth ? "bg-white" : "bg-gray-50",
                        isToday(c.d) ? "border-black" : "border-gray-200",
                        "outline-none focus:ring-2 focus:ring-black/20",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={[
                            "text-sm font-semibold",
                            c.inMonth ? "text-gray-900" : "text-gray-500",
                          ].join(" ")}
                        >
                          {c.d.getDate()}
                        </div>
                        {dayItems.length ? <div className="text-xs text-gray-500">{dayItems.length}</div> : null}
                      </div>

                      <div className="mt-2 space-y-1">
                        {dayItems.slice(0, 3).map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between gap-2 text-xs rounded border px-2 py-1 bg-gray-100 border-gray-200 text-gray-800"
                            onClick={(e) => {
                              // prevent day click when interacting with item row
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <div className="truncate">
                              <span className="font-semibold">{it.type}:</span> {it.title}
                            </div>

                            {/* ✅ This button is now legal because parent is not a button */}
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-900"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteItem(it.id);
                              }}
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {dayItems.length > 3 ? (
                          <div className="text-xs text-gray-500">+{dayItems.length - 3} more…</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!isLoaded ? (
              <div className="text-sm text-gray-600 mt-3">Loading user…</div>
            ) : !user?.id ? (
              <div className="text-sm text-red-600 mt-3">Not signed in.</div>
            ) : null}
          </section>
        </div>

        {modal ? (
          <Modal
            dateKey={modal.dateKey}
            action={selectedAction}
            title={modal.title}
            onTitle={(title) => setModal({ ...modal, title })}
            onAdd={addItem}
            onClose={() => setModal(null)}
            onClearAll={onClearAll}
          />
        ) : null}
      </div>
    </main>
  );
}
