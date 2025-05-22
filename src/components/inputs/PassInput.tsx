"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";

const PassInput = ({
  password,
  setPassword,
}: {
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const [isPassVisible, setIsPassVisible] = useState<boolean>(false);

  return (
    <div className="flex items-center space-x-3 border border-gray-400 rounded-md px-3">
      <input
        type={isPassVisible ? "text" : "password"}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        placeholder="Password"
        className="outline-none w-full py-2 text-sm"
      />
      <Icon
        onClick={() => {
          setIsPassVisible(!isPassVisible);
        }}
        icon={isPassVisible ? "mdi-light:eye" : "mdi-light:eye-off"}
        width={"20"}
        height={"20"}
      />
    </div>
  );
};

export default PassInput;
