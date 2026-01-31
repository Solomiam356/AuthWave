export const dynamic = 'force-dynamic';

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const clerkUser = await currentUser();
        
        if (!clerkUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { userId: clerkUser.id },
            select: { 
                subscriptionTier: true,
                subscriptionActive: true 
            },
        });

        if (!profile) {
            return NextResponse.json({ error: "No Profile Found" }, { status: 404 });
        }

        // Повертаємо об'єкт профілю напряму, без обгортки { subscription: profile }
        return NextResponse.json(profile);

    } catch (error: any) {
        console.error("Subscription Status Error:", error.message);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}