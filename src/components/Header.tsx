import { Icon } from "@iconify/react/dist/iconify.js";
import BorderButton, { BUTTON_CONTENT } from "./buttons/BorderButton";

const Header = () => {
  return (
    <header className="w-full h-full border-b border-ws-green-50 flex items-center justify-between px-4 ">
      {/* Left section */}
      <div className="flex items-center space-x-1">
        <Icon
          icon={"line-md:chat-round-dots-filled"}
          width={"18"}
          height={"18"}
          className="text-ws-green-300"
        />
        <h1 className="text-sm font-semibold text-ws-green-300">Chats</h1>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-3">
        <BorderButton icon="uis:refresh" text="Refresh" />
        <BorderButton icon="material-symbols:help-outline" text="Help" />

        <button className="flex items-center space-x-1 border border-slate-200 px-2 py-1 rounded-md cursor-pointer bg-white">
          <div className="w-2 h-2 rounded-full bg-amber-200 mr-3 shadow-xl shadow-amber-400"></div>
          <p className="text-xs font-medium">5/6 Phones</p>
          <Icon
            icon={"mi:select"}
            width={"15"}
            height={"15"}
            className="text-gray-400"
          />
        </button>

        <BorderButton
          icon="icon-park-outline:download-computer"
          type={BUTTON_CONTENT.ICON}
        />
        <BorderButton
          icon="material-symbols:notifications-off-rounded"
          type={BUTTON_CONTENT.ICON}
          color="#99a1af"
        />

        <button className="flex items-center space-x-1 border border-slate-200 px-2 py-1 rounded-md cursor-pointer bg-white">
          <Icon
            icon={"bi:stars"}
            width={"15"}
            height={"15"}
            className="text-yellow-500"
          />
          <Icon
            icon={"f7:menu"}
            width={"15"}
            height={"15"}
            className="text-black"
          />
        </button>
      </div>
    </header>
  );
};

export default Header;
