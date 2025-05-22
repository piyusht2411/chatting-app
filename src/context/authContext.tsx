"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextType {
  user: {
    id: string;
    email: string | undefined;
    phone?: string | undefined;
    name?: string | undefined;
  } | null;
  setUser: (
    user: {
      id: string;
      email: string | undefined;
      phone?: string | undefined;
      name?: string | undefined;
    } | null
  ) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{
    id: string;
    email: string | undefined;
    phone?: string | undefined;
    name?: string | undefined;
  } | null>(null);
  const router = useRouter();

  const setUserFunc = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) router.push("/login");

    const { data: personalData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.session?.user.id)
      .maybeSingle();

    if (!personalData) return;

    setUser(
      data.session?.user
        ? {
            id: data.session.user.id,
            email: data.session.user.email,
            phone: personalData.phone,
            name: personalData.name,
          }
        : null
    );

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const uData = session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              phone: personalData.phone,
              name: personalData.name,
            }
          : null;

        setUser(uData);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [setUser, router]);

  // Check if the user is authenticated (when app loads)
  useEffect(() => {
    setUserFunc();
  }, [setUserFunc]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login"); // Redirect to login page after logout
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuthContext must be used within AuthProvider");
  return context;
};
