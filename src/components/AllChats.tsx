"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import BorderButton, { BUTTON_CONTENT } from "./buttons/BorderButton";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthContext } from "@/context/authContext";
import { useRefetch } from "@/context/refetchContext";
import { filter } from "fuzzy";
import { formatToDate } from "@/utils/formatTime";

type LABEL_TYPE = {
  id: string;
  label_name: string;
  color: string;
};

type CHAT_INFO = {
  person_id: string;
  name: string;
  phone: string;
  latest_message: string;
  latest_message_timestamp: string;
  labels: LABEL_TYPE[];
};

const SingleChatBox = ({
  chatInfo,
  setCurrentChatPersonId,
  currentChatPersonId,
}: {
  chatInfo: CHAT_INFO;
  setCurrentChatPersonId: React.Dispatch<React.SetStateAction<string>>;
  currentChatPersonId: string;
}) => {
  return (
    <div
      onClick={() => {
        setCurrentChatPersonId(chatInfo.person_id);
      }}
      className={`w-full flex px-2 py-2 space-x-3 cursor-pointer hover:bg-gray-50 ${
        chatInfo.person_id == currentChatPersonId && "bg-gray-100"
      } `}
    >
      {/* User profile */}
      <div>
        <div className="p-3 rounded-full bg-neutral-300">
          <Icon
            icon={"bi:person-fill"}
            width={"15"}
            height={"15"}
            className="text-white"
          />
        </div>
      </div>

      <div className="w-full flex flex-col">
        {/* Name and labels or tags */}
        <div className="w-full flex items-center justify-between">
          <p className="text-black font-bold text-sm">
            {chatInfo.name || "Unknown User"}
          </p>

          <div className="flex items-center space-x-2">
            {chatInfo.labels?.map((label, index) => (
              <div key={index} className="bg-green-50 rounded-md px-2 py-1">
                <p
                  key={index}
                  className="text-[10px]"
                  style={{
                    color: label.color,
                  }}
                >
                  {label.label_name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* message, notification count */}
        <div className="w-full flex items-center flex-1 justify-between">
          <div className="w-full flex-[0.8]">
            <p className="text-neutral-400 text-xs line-clamp-1">
              {chatInfo.latest_message}
            </p>
          </div>

          <div className="w-full flex-[0.2] flex items-center space-x-2 justify-end">
            <div className="py-[2px] px-[5px] rounded-full bg-ws-green-200">
              <p className="text-white text-[9px]">4</p>
            </div>

            <div className="p-1 rounded-full bg-neutral-200">
              <Icon
                icon={"bi:person-fill"}
                width={"8"}
                height={"8"}
                className="text-white"
              />
            </div>
          </div>
        </div>

        {/* Number's and timing */}
        <div className="w-full flex items-center justify-between mt-1">
          <div className="px-2 py-1 text-neutral-500 bg-neutral-100 rounded-md flex items-center space-x-1">
            <Icon icon={"ion:call-outline"} width={"8"} height={"8"} />
            <p className="text-[9px] font-medium">{chatInfo.phone || "N/A"}</p>
          </div>

          <p className="text-[9px] text-neutral-400 font-semibold">
            {formatToDate(chatInfo.latest_message_timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};

let temp_persons: CHAT_INFO[] = [];
// Component to list all the chats
const AllChats = ({
  setCurrentChatPersonId,
  currentChatPersonId,
}: {
  setCurrentChatPersonId: React.Dispatch<React.SetStateAction<string>>;
  currentChatPersonId: string;
}) => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthContext();
  const [persons, setPersons] = useState<CHAT_INFO[]>([]);

  const [newSearchPersons, setNewSearchPersons] = useState<CHAT_INFO[]>([]);

  const [tab1SearchQuery, setTab1SearchQuery] = useState<string>("");
  const [tab2SearchQuery, setTab2SearchQuery] = useState<string>("");

  const [isSearchbarOpen, setIsSearchbarOpen] = useState<boolean>(false);

  const [isFilterOn, setIsFilterOn] = useState<boolean>(false);

  const { refetch } = useRefetch();

  const getPersons = async () => {
    // Query to get the persons you've sent messages to, with the latest message and their details
    const { data: messagesData, error: messageError } = await supabase.rpc(
      "get_latest_messages",
      { user_id: user?.id }
    );

    if (messageError) {
      console.error("Error fetching messages:", messageError);
      return;
    }

    // Group messages by chat partner (person_id)
    const groupedMessages = messagesData.reduce((acc: any, message: any) => {
      const personId =
        message.sender_id === user?.id
          ? message.receiver_id
          : message.sender_id;

      if (!acc[personId]) {
        acc[personId] = {
          person_id: personId,
          messages: [],
        };
      }

      acc[personId].messages.push({
        content: message.content,
        created_at: message.created_at,
      });

      return acc;
    }, {});

    // Get all unique person IDs to fetch their profiles
    const personIds = Object.keys(groupedMessages);

    // Fetch profiles for all chat partners
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, phone")
      .in("id", personIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return;
    }

    // Create a mapping of person_id to profile data
    const profileMap = profilesData.reduce((acc: any, profile: any) => {
      acc[profile.id] = {
        name: profile.name,
        phone: profile.phone,
      };
      return acc;
    }, {});

    const { data: labelData, error: labelError } = await supabase
      .from("chat_labels")
      .select(
        `
         chat_partner_id,
         label_name
        `
      )
      .eq("user_id", user?.id);

    if (labelError) {
      console.error("Error fetching labels:", labelError);
      return;
    }

    // Convert grouped messages to CHAT_INFO format with the latest message
    const formattedPersonsData: CHAT_INFO[] = Object.values(
      groupedMessages
    ).map((group: any) => {
      // Sort messages by created_at to get the latest one
      const latestMessage = group.messages.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      const profile = profileMap[group.person_id] || {};

      return {
        person_id: group.person_id,
        name: profile.name || "Unknown User",
        phone: profile.phone || "N/A",
        latest_message: latestMessage.content,
        latest_message_timestamp: latestMessage.created_at,
        labels:
          labelData
            .find((data: any) => data.chat_partner_id === group.person_id)
            ?.label_name?.map(JSON.parse) || [],
      };
    });

    // Sort by latest message timestamp (optional, for better UX)
    formattedPersonsData.sort(
      (a, b) =>
        new Date(b.latest_message_timestamp).getTime() -
        new Date(a.latest_message_timestamp).getTime()
    );

    setPersons(formattedPersonsData);
    temp_persons = formattedPersonsData;
  };

  useEffect(() => {
    if (!user) return;

    getPersons();
  }, [user?.id, refetch]);

  // Debounced search function for tab2 search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tab2SearchQuery.trim()) {
        fetchNewSearchPersons(tab2SearchQuery);
      } else {
        setNewSearchPersons([]);
      }
    }, 500); // Debounce delay

    return () => {
      clearTimeout(timeoutId); // Clear timeout if input changes
    };
  }, [tab2SearchQuery]);

  // Debounced search function for tab1 search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tab1SearchQuery.trim()) {
        const onlyNames = temp_persons.map((person) => person.name);

        const filteredNames = filter(tab1SearchQuery, onlyNames).map(
          (r) => r.string
        );

        const results = temp_persons.filter((person) =>
          filteredNames.includes(person.name)
        );

        setPersons(results);
      } else {
        setPersons([...temp_persons]);
      }
    }, 500); // Debounce delay

    return () => {
      clearTimeout(timeoutId); // Clear timeout if input changes
    };
  }, [tab1SearchQuery]);

  const fetchNewSearchPersons = async (phoneNumber: string) => {
    if (!user?.id) return; // Prevent query if user id is not available

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("phone", `%${phoneNumber}%`) // partial search
      .neq("id", user?.id);

    if (error) {
      console.error("Supabase error:", error);
      setNewSearchPersons([]);
      return;
    }

    const personsData: CHAT_INFO[] = data.map((person: any) => ({
      person_id: person.id,
      name: person.name,
      phone: person.phone,
      latest_message: "",
      latest_message_timestamp: "",
      labels: [],
    }));

    setNewSearchPersons(personsData);
  };

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) return;

    containerElement.scrollTo({
      behavior: "smooth",
      left: containerElement.offsetWidth * currentTab,
    });
  }, [currentTab]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex scrollbar-hide overflow-x-hidden"
    >
      <div className="w-full h-full flex flex-col shrink-0 min-h-0">
        {/* header component */}
        <header className="w-full h-full flex-[0.07] bg-neutral-100 border-b border-ws-green-50 flex items-center justify-between px-2">
          {isSearchbarOpen ? (
            <>
              <div className="w-full h-full flex items-center">
                <Icon icon={"proicons:search"} width={"20"} height={"20"} />

                <input
                  type="text"
                  value={tab1SearchQuery}
                  onChange={(e) => {
                    setTab1SearchQuery(e.target.value);
                  }}
                  placeholder="Search"
                  className="w-full px-4 text-sm outline-none"
                />

                <Icon
                  onClick={() => {
                    setIsSearchbarOpen(false);
                    setTab1SearchQuery("");
                  }}
                  className="cursor-pointer"
                  icon={"material-symbols-light:close"}
                  width={"20"}
                  height={"20"}
                />
              </div>
            </>
          ) : (
            <>
              {/* Left section */}
              <div className="flex items-center space-x-2">
                <button className="flex items-center space-x-1 text-ws-green-400 cursor-pointer">
                  <Icon
                    icon={"mingcute:folder-download-fill"}
                    width={"15"}
                    height={"15"}
                  />
                  <p className="text-xs font-semibold">Custom filter</p>
                </button>

                <BorderButton text="Save" type={BUTTON_CONTENT.TEXT} />
              </div>

              {/* Right section */}
              <div className="flex items-center space-x-2">
                <BorderButton
                  onClickFunc={() => {
                    setIsSearchbarOpen(true);
                  }}
                  icon="proicons:search"
                  text="Search"
                  type={BUTTON_CONTENT.ICON_TEXT}
                />

                <div
                  className="w-fit h-fit relative cursor-pointer"
                  onClick={() => {
                    if (!isFilterOn) {
                      const filteredPersons = [...temp_persons].sort((p1, p2) =>
                        p2.name.localeCompare(p1.name)
                      );

                      setPersons([...filteredPersons]);
                    } else {
                      setPersons([...temp_persons]);
                    }

                    setIsFilterOn(!isFilterOn);
                  }}
                >
                  {isFilterOn && (
                    <div className="bg-ws-green-400 rounded-full absolute -right-1 -top-1">
                      <Icon
                        icon={"basil:cross-solid"}
                        width={"14"}
                        height={"14"}
                        className="text-white"
                      />
                    </div>
                  )}

                  <BorderButton
                    icon="bx:filter"
                    text={isFilterOn ? "Filtered" : "Filter"}
                    color={isFilterOn ? "#15803d" : "black"}
                  />
                </div>
              </div>
            </>
          )}
        </header>

        <div className="w-full h-full flex-[0.93] flex flex-col min-h-0 relative">
          {/* Overlay start new chat button */}
          <div
            onClick={() => {
              setCurrentTab(1);
            }}
            className="z-50 absolute bottom-5 right-4 bg-ws-green-400 rounded-full p-2 cursor-pointer"
          >
            <Icon
              icon={"system-uicons:chat-add"}
              width={"20"}
              height={"20"}
              className="text-white"
            />
          </div>

          {/* All chats would be here */}
          <div className="w-full flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-20">
            {persons.length === 0 && (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-gray-400">No chats available</p>
              </div>
            )}

            {persons.map((data, index) => (
              <SingleChatBox
                setCurrentChatPersonId={setCurrentChatPersonId}
                currentChatPersonId={currentChatPersonId}
                chatInfo={data}
                key={index}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Start new message section */}
      <div className="w-full h-full flex flex-col shrink-0 min-h-0">
        <header className="w-full h-full flex-[0.07] bg-neutral-100 border-b border-ws-green-50 items-center justify-between px-2">
          <div className="w-full h-full flex items-center">
            <Icon icon={"proicons:search"} width={"20"} height={"20"} />

            <input
              type="text"
              value={tab2SearchQuery}
              onChange={(e) => {
                setTab2SearchQuery(e.target.value);
              }}
              placeholder="Search"
              className="w-full px-4 text-sm outline-none"
            />

            <Icon
              onClick={() => {
                setTab2SearchQuery("");
                setCurrentTab(0);
              }}
              className="cursor-pointer"
              icon={"material-symbols-light:close"}
              width={"20"}
              height={"20"}
            />
          </div>
        </header>

        <div className="w-full h-full flex-[0.93] flex flex-col min-h-0 relative">
          <div className="w-full flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-20">
            {newSearchPersons.map((data, index) => (
              <SingleChatBox
                setCurrentChatPersonId={setCurrentChatPersonId}
                currentChatPersonId={currentChatPersonId}
                chatInfo={data}
                key={index}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllChats;
