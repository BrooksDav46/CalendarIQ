"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";

// ✅ Import your existing login UI component if you have one
// import ClientFlowLogin from "@/components/ClientFlowLogin";

export default function Page() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-sm text-gray-600">Loading…</div>
      </main>
    );
  }

  // ✅ If already signed in, show "continue" + "sign out" (so they can switch accounts)
  if (isSignedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-2">You’re already signed in</h1>
          <p className="text-gray-600 mb-6">
            Signed in as <span className="font-medium">{user?.primaryEmailAddress?.emailAddress}</span>
          </p>

          <div className="space-y-3">
            <button
              className="w-full bg-black text-white py-2 rounded"
              onClick={() => router.push("/dashboard")}
            >
              Continue to Dashboard
            </button>

            <button
              className="w-full border py-2 rounded"
              onClick={async () => {
                await signOut({ redirectUrl: "/" });
              }}
            >
              Sign out and use a different email
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ✅ Not signed in → render your actual login flow
  return (
    <>
      {/* OPTION A: if your login flow is a component */}
      {/* <ClientFlowLogin /> */}

      {/* OPTION B: paste your existing login UI here (email/code flow) */}
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-2">Login</h1>
          <p className="text-gray-600">Paste your email/code login UI here.</p>
        </div>
      </div>
    </>
  );
}
