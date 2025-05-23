"use client";

import { useAuthContext } from "../context/authContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If user is not logged in and not on login or signup page, redirect to login
    if (!user && pathname !== "/login" && pathname !== "/signup") {
      router.push("/login");
    }
    // If user is logged in and on login or signup page, redirect to home
    else if (user && (pathname === "/login" || pathname === "/signup")) {
      router.push("/");
    }
  }, [user, pathname, router]);

  return <>{children}</>;
}
