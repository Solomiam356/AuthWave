"use client";
import { Spinner } from "@/components/spinner";
import { useUser } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { availablePlans } from "@/lib/plans";

async function fetchSubscriptionStatus() {
  const response = await fetch("/api/profile/subscription-status");
  if (!response.ok) {
    throw new Error("Failed to fetch subscription status");
  }
  return response.json();
}

export default function Profile() {
  const { isLoaded, isSignedIn, user } = useUser();

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscriptionStatus,
    enabled: isLoaded && isSignedIn,
    staleTime: 0, // Встановлюємо 0, щоб дані завжди були свіжими після оплати
  });

  // Отримуємо назву плану (наприклад, "month") з даних профілю
  const tier = profile?.subscriptionTier;

  // 2. ДОДАЙ ЦЕЙ LOG ДЛЯ ПЕРЕВІРКИ:
console.log("DEBUG: Current tier from DB:", `'${tier}'`);
console.log("DEBUG: Available intervals:", availablePlans.map(p => `'${p.interval}'`));

// 3. Більш надійний пошук:
const currentPlan = tier
  ? availablePlans.find(
      (plan) => plan.interval.toLowerCase().trim() === tier.toLowerCase().trim()
    )
  : null;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner /> <span className="ml-2">Loading the information...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="p-10 text-center">
        <p>Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Toaster position="top-center" />

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-4 mb-6">
          {user.imageUrl && (
            <Image
              src={user.imageUrl}
              alt="User Avatar"
              width={80}
              height={80}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-500">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>

          {isLoading ? (
            <div className="flex items-center">
              <Spinner />{" "}
              <span className="ml-2">Loading subscription details...</span>
            </div>
          ) : isError ? (
            <p className="text-red-500">{(error as any)?.message}</p>
          ) : profile && profile.subscriptionActive ? (
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-green-800 mb-2">
                Current Plan
              </h3>
              {currentPlan ? (
                <div className="space-y-1">
                  <p>
                    <strong>Plan:</strong> {currentPlan.name}
                  </p>
                  <p>
                    <strong>Amount:</strong> {currentPlan.amount}{" "}
                    {currentPlan.currency}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className="text-green-600 font-bold">ACTIVE</span>
                  </p>
                </div>
              ) : (
                <p>
                  Plan detected ({tier}), but details not found in
                  configuration.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-md">
              <p className="text-yellow-700">
                You are not subscribed to any plan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
