import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {prisma} from '@/lib/prisma';

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature || "", webhookSecret);
    } catch (error: any) {
        return NextResponse.json({error: error.message}, {status: 400});
    }
    try{
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            await handleCheckoutSessionCompleted(session);
            break;
        }
         case "invoice.payment_failed": {
            const session = event.data.object as InvoiceWithSubscription;
            await handleInvoicePaymentFailed(session);
            break;
        }
         case "customer.subscription.deleted": {
            const session = event.data.object as Stripe.Subscription;
            await handleCustomerSubscriptionDeleted(session);
            break;
        }
        default: 
        console.log("Unhandled event type" + event.type);
    }
    } catch (error: any) {
        return NextResponse.json({error: error.message}, {status: 400});
    }

    return NextResponse.json({});
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.clerkUserId;

    if (!userId) {
        console.log("No user id");
        return;
    }

    const subscriptionId = session.subscription as string;

       if (!userId) {
        console.log("No sub id");
        return;
    }

    try {
        await prisma.profile.update({
            where: {userId},
            data: {
                stripeSubscriptionId: subscriptionId,
                subscriptionActive: true,
                subscriptionTier: session.metadata?.planType || null
            }
        })
    } catch(error: any) {
        console.log(error.message);
    }
}

interface InvoiceWithSubscription extends Stripe.Invoice {
    subscription?: string | null;
}

async function handleInvoicePaymentFailed(invoice: InvoiceWithSubscription) {
    const subId = invoice.subscription;

    if (!subId) {
        console.log("No subscription id on invoice");
        return;
    }

    let userId: string | undefined;

    try {
        const profile = await prisma.profile.findUnique({
            where: { stripeSubscriptionId: subId },
            select: { userId: true }
        });

        if (!profile?.userId) {
            console.log("No profile found");
            return;
        }

        userId = profile.userId;
    } catch (error: any) {
        console.log(error.message);
        return;
    }

    try {
        await prisma.profile.update({
            where: { userId },
            data: { subscriptionActive: false },
        });
    } catch (error: any) {
        console.log(error.message);
    }
}



async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription) {
    const subId = subscription.id;
    let userId: string | undefined;

    try {
        const profile = await prisma.profile.findUnique({
            where: { stripeSubscriptionId: subId },
            select: { userId: true }
        });

        if (!profile?.userId) {
            console.log("No profile found");
            return;
        }

        userId = profile.userId;
    } catch (error: any) {
        console.log(error.message);
        return;
    }

    try {
        await prisma.profile.update({
            where: { userId },
            data: { subscriptionActive: false, stripeSubscriptionId: null, subscriptionTier: null, },
        });
    } catch (error: any) {
        console.log(error.message);
    }
}