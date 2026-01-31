import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const clerkUser = await currentUser();
        
        if (!clerkUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Шукаємо профіль
        let profile = await prisma.profile.findUnique({
            where: { userId: clerkUser.id },
            select: { 
                subscriptionTier: true, 
                subscriptionActive: true 
            },
        });

        // 2. Якщо профілю немає — СТВОРЮЄМО його автоматично!
        if (!profile) {
            console.log("Creating new profile for user:", clerkUser.id);
            // Створюємо запис, щоб не було помилки 404
            const newProfile = await prisma.profile.create({
                data: {
                    userId: clerkUser.id,
                    email: clerkUser.emailAddresses[0].emailAddress,
                    subscriptionTier: null, // Спочатку підписки немає
                    subscriptionActive: false,
                },
            });
            // Повертаємо новий профіль
            return NextResponse.json({
                subscriptionTier: newProfile.subscriptionTier,
                subscriptionActive: newProfile.subscriptionActive
            });
        }

        return NextResponse.json(profile);

    } catch (error: any) {
        console.error("Subscription Status Error:", error.message);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}