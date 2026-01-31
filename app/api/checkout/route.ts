import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPriceIdFromType } from "@/lib/plans";

export async function POST(request: NextRequest) {
  try {
    // 1. Просте зчитування JSON
    const body = await request.json();
    const { planType, userId, email } = body;

    console.log("DEBUG: Data received:", { planType, userId, email });

    if (!planType || !userId || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 2. Перевірка ціни
    const priceId = getPriceIdFromType(planType);
    console.log("DEBUG: Price ID found:", priceId);

    if (!priceId) {
      return NextResponse.json({ error: `No price ID found for: ${planType}` }, { status: 400 });
    }

    // 3. Створення сесії
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      mode: "subscription",
      metadata: { clerkUserId: userId, planType },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/mealplan`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscribe`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("DEBUG: Stripe API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}