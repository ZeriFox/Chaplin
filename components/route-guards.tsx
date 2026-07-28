"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from "@/components/auth-provider";

export function RequireUser({ children, redirectTo = "/login" }: { children: React.ReactNode; redirectTo?: string }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace(`${redirectTo}?next=${encodeURIComponent(pathname)}`);
  }, [user, isLoading, router, pathname, redirectTo]);

  if (isLoading) return <div className="p-6">Caricamento…</div>;
  if (!user) return null;
  return <>{children}</>;
}

export function RequireAdmin({ children, redirectTo = "/admin-login" }: { children: React.ReactNode; redirectTo?: string }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`${redirectTo}?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== "admin") router.replace("/login");
  }, [user, isLoading, router, pathname, redirectTo]);

  if (isLoading) return <div className="p-6">Caricamento…</div>;
  if (!user || user.role !== "admin") return null;
  return <>{children}</>;
}

export { RequireAdmin as AdminGuard }

