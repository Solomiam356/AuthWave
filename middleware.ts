import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-up(.*)",
  "/subscribe(.*)",
  "/api/(.*)", // Дозволяємо ВСІМ API-маршрутам проходити без перевірок у Middleware
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // КРИТИЧНО: Якщо це API, відразу пропускаємо його далі
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const userAuth = await auth();
  if (!isPublicRoute(req) && !userAuth.userId) {
    return userAuth.redirectToSignIn();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};