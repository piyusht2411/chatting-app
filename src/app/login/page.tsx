"use client";

import PassInput from "../../components/inputs/PassInput";
import TextInput from "../../components/inputs/TextInput";
import { useAuthContext } from "../../context/authContext";
import { supabase } from "../../lib/supabaseClient";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const router = useRouter();
  const { setUser } = useAuthContext();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email,
      });
      router.push("/");
    } else {
      alert(error?.message || "Login failed");
    }
  };

  return (
    <div className="w-full h-screen flex flex-1">
      <div className="flex-[0.5] w-full h-full bg-ws-green-200 flex items-center justify-center">
        <div>
          <Image src={"/logo.png"} width={200} height={200} alt="Logo" />
        </div>
      </div>

      <div className="flex-[0.5] w-full h-full flex items-center justify-center">
        <div className="w-[60%] text-center">
          <h1 className="text-3xl font-semibold">Login</h1>

          <div className="my-10 w-full space-y-4">
            <TextInput
              value={email}
              setValue={setEmail}
              placeholder="Email"
              type="email"
            />
            <PassInput password={password} setPassword={setPassword} />
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-ws-green-200 py-2 rounded-md text-white cursor-pointer"
          >
            Login
          </button>

          <p className="mt-4 text-sm">
            {`Don't have an account?`}
            <span
              className="text-ws-green-200 cursor-pointer underline"
              onClick={() => router.push("/signup")}
            >
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
