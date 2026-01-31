"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { availablePlans } from "@/lib/plans";
import toast, { Toaster } from "react-hot-toast";

type SubscribeResponse = {
  url: string;
};

// Оновлена функція з логуванням та безпечною обробкою JSON
const subscribeToPlan = async ({
  planType,
  userId,
  email,
}: {
  planType: string;
  userId: string;
  email: string;
}): Promise<SubscribeResponse> => {
  
  console.log("LOG: Sending data to API:", { planType, userId, email });

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
    },
    // Явно створюємо об'єкт перед передачею в stringify
    body: JSON.stringify({
      planType: String(planType),
      userId: String(userId),
      email: String(email),
    }),
  });

  // Спочатку перевіряємо чи відповідь успішна
  if (!res.ok) {
    const errorText = await res.text();
    console.error("LOG: Server error text:", errorText);
    
    let errorMessage = "Failed to create checkout session";
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Якщо сервер повернув не JSON (наприклад HTML помилку)
    }
    throw new Error(errorMessage);
  }

  return res.json();
};

export default function SubscribePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const userId = user?.id;
  const email = user?.emailAddresses?.[0]?.emailAddress || "";

  const mutation = useMutation<SubscribeResponse, Error, { planType: string }>({
    mutationFn: async ({ planType }) => {
      if (!isLoaded) throw new Error("User data is loading...");
      if (!userId || !email) {
        throw new Error("Please sign in to subscribe.");
      }
      return subscribeToPlan({ planType, userId, email });
    },
    onMutate: () => {
      toast.loading("Preparing checkout...", { id: "subscribe" });
    },
    onSuccess: (data) => {
      toast.success("Redirecting to Stripe...", { id: "subscribe" });
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error("LOG: Mutation error:", error.message);
      toast.error(error.message, { id: "subscribe" });
    },
  });

  const handleSubscribe = (planType: string) => {
    if (!userId) {
      toast.error("Please sign in first");
      router.push("/sign-up");
      return;
    }
    mutation.mutate({ planType });
  };

  return (
    <div className="px-4 py-8 sm:py-12 lg:py-16 bg-stone-50 min-h-screen">
      <Toaster position="top-right" />
      <div>
        <h2 className="text-3xl font-bold text-center mt-12 sm:text-5xl tracking-tight text-stone-800">
          Pricing
        </h2>
        <p className="max-w-3xl mx-auto mt-4 text-xl text-center text-stone-500">
          Choose the best plan for your nutritional journey.
        </p>
      </div>

      <div className="mt-12 container mx-auto space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-x-8 text-black">
        {availablePlans.map((plan, key) => (
          <div
            key={key}
            className="relative p-8 border border-stone-200 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-all bg-white"
          >
            <div className="flex-1">
              {plan.isPopular && (
                <p className="absolute top-0 py-1.5 px-4 bg-stone-600 text-stone-50 rounded-full text-xs font-semibold uppercase transform -translate-y-1/2">
                  Most popular
                </p>
              )}
              <h3 className="text-xl font-semibold text-stone-800">{plan.name}</h3>
              <p className="mt-4 flex items-baseline">
                <span className="text-5xl font-extrabold text-stone-800">${plan.amount}</span>
                <span className="ml-1 text-xl font-semibold text-stone-500">/{plan.interval}</span>
              </p>
              <p className="mt-6 text-stone-600">{plan.description}</p>
              <ul className="mt-6 space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckIcon className="shrink-0 w-5 h-5 text-green-500" />
                    <span className="ml-3 text-stone-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`${
                plan.interval === "month"
                  ? "bg-stone-700 text-white hover:bg-stone-800"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              } mt-8 block w-full py-3 px-6 rounded-md text-center font-medium disabled:opacity-50 transition-colors`}
              onClick={() => handleSubscribe(plan.interval)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Processing..." : `Get ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Простий компонент іконки для чистоти коду
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
