"use client";

import PassInput from "../../components/inputs/PassInput";
import TextInput from "../../components/inputs/TextInput";
import { supabase } from "../../lib/supabaseClient";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [number, setNumber] = useState<string>("");
  const router = useRouter();

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone: number,
    });

    if (!error && data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{ id: data.user.id, email, phone: number, name }]);

      if (!profileError) {
        alert("Signup successful! Please log in.");
        router.push("/login");
      } else {
        alert(profileError.message || "Profile creation failed");
      }
    } else {
      alert(error?.message || "Signup failed");
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
          <h1 className="text-3xl font-semibold">Sign up</h1>

          <div className="my-10 w-full space-y-4">
            <TextInput value={name} setValue={setName} placeholder="Name" />
            <TextInput
              value={email}
              setValue={setEmail}
              placeholder="Email"
              type="email"
            />
            <TextInput
              value={number}
              setValue={setNumber}
              placeholder="Phone Number"
            />
            <PassInput password={password} setPassword={setPassword} />
          </div>

          <button
            onClick={handleSignup}
            className="w-full bg-ws-green-200 py-2 rounded-md text-white cursor-pointer"
          >
            Sign up
          </button>

          <p className="mt-4 text-sm">
            Already have an account?{" "}
            <span
              className="text-ws-green-200 cursor-pointer underline"
              onClick={() => router.push("/login")}
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
