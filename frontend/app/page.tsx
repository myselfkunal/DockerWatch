"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./layout";

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();
  useEffect(() => {
    router.push(token ? "/dashboard" : "/auth/login");
  }, [token]);
  return null;
}