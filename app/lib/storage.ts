// app/lib/storage.ts

/* =========================
   INTAKE (onboarding)
========================= */

export type Intake = {
  fullName: string;
  phone: string;
  address: string;
  notes?: string;
  completedAt: number;
};

const intakeKey = (userId: string) => `calendariq:intake:v1:${userId}`;

export function loadIntake(userId: string): Intake | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(intakeKey(userId));
    return raw ? (JSON.parse(raw) as Intake) : null;
  } catch {
    return null;
  }
}

export function saveIntake(userId: string, intake: Intake) {
  try {
    localStorage.setItem(intakeKey(userId), JSON.stringify(intake));
  } catch {}
}

export function clearIntake(userId: string) {
  try {
    localStorage.removeItem(intakeKey(userId));
  } catch {}
}

export function intakeComplete(userId: string): boolean {
  return !!loadIntake(userId);
}

/* =========================
   CALENDAR (schedule items)
========================= */

export type CalendarItem = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  type: string; // "Install", "Inspection", etc.
  title: string;
  createdAt: number;
};

const calKey = (userId: string) => `calendariq:calendar:v1:${userId}`;

export function loadCalendar(userId: string): CalendarItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(calKey(userId));
    return raw ? (JSON.parse(raw) as CalendarItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCalendar(userId: string, items: CalendarItem[]) {
  try {
    localStorage.setItem(calKey(userId), JSON.stringify(items));
  } catch {}
}

export function clearCalendar(userId: string) {
  try {
    localStorage.removeItem(calKey(userId));
  } catch {}
}
