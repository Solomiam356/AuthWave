import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.clerkUserId;

        if (userId) {
            await prisma.profile.upsert({
                where: { userId },
                create: {
                    userId,
                    email: session.customer_details?.email || "",
                    subscriptionActive: true,
                    subscriptionTier: session.metadata?.planType || "pro",
                    stripeSubscriptionId: session.subscription as string,
                },
                update: {
                    subscriptionActive: true,
                    subscriptionTier: session.metadata?.planType || "pro",
                    stripeSubscriptionId: session.subscription as string,
                }
            });
            console.log(`✅ Юзер ${userId} отримав підписку!`);
        }
    }

    return NextResponse.json({ received: true });
}