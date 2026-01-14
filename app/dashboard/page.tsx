import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Recon IQ</h1>
            <p className="text-gray-600">Dashboard</p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/intake"
            className="bg-white rounded-lg shadow p-5 hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Client Intake</div>
            <div className="text-sm text-gray-600 mt-1">
              Add/update your contact + property info.
            </div>
          </Link>

          <Link
            href="/dashboard/schedule"
            className="bg-white rounded-lg shadow p-5 hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">Schedule</div>
            <div className="text-sm text-gray-600 mt-1">
              Month calendar with job boxes.
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
