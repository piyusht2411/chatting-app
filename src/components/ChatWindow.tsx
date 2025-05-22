"use client";

import { useAuthContext } from "@/context/authContext";
import { useRefetch } from "@/context/refetchContext";
import { supabase } from "@/lib/supabaseClient";
import { formatToOnlyTime } from "@/utils/formatTime";
import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

enum MESSAGE_TYPES {
  SENT = "SENT",
  RECEIVED = "RECEIVED",
}

type CHAT_INFO_TYPE = {
  id: string;
  type: MESSAGE_TYPES;
  name: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
  createdAt: string;
  number: string;
  replied_id: string;
};

const MessageBox = ({
  chatInfo,
  setCurrentSelectedId,
  repliedchatInfo,
}: {
  chatInfo: CHAT_INFO_TYPE;
  repliedchatInfo?: CHAT_INFO_TYPE;
  setCurrentSelectedId: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
    <div
      onDoubleClick={() => {
        setCurrentSelectedId(chatInfo.id);
      }}
      className={`w-full h-fit flex ${
        chatInfo.type == MESSAGE_TYPES.SENT ? "justify-end" : "justify-start"
      }`}
    >
      <div className="flex mx-3 space-x-2">
        {chatInfo.type == MESSAGE_TYPES.RECEIVED && (
          <div className="w-8 h-8 rounded-full bg-gray-400"></div>
        )}
        <div
          className={`w-fit h-fit ${
            chatInfo.type == MESSAGE_TYPES.SENT
              ? "bg-ws-green-100 rounded-l-lg"
              : "bg-white rounded-r-lg"
          } px-3 py-2  rounded-b-lg min-w-60 flex flex-col max-w-96 space-y-2 shadow-md`}
        >
          {repliedchatInfo && (
            <div className="text-sm bg-gray-200 w-full">
              {repliedchatInfo.content}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-ws-green-400">
              {chatInfo.name}
            </p>
            <p className="text-[10px] text-gray-400">{chatInfo.number}</p>
          </div>

          <div>
            <p className="text-black text-sm">{chatInfo.content}</p>
          </div>

          <div className="flex justify-end">
            <div className="flex items-center space-x-2">
              <p className="text-[10px] text-gray-400">
                {formatToOnlyTime(chatInfo.createdAt)}
              </p>

              {chatInfo.type == MESSAGE_TYPES.SENT && (
                <Icon
                  icon={"charm:tick-double"}
                  width={"14"}
                  height={"14"}
                  className="text-blue-500"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatWindow = ({
  currentChatPersonId,
}: {
  currentChatPersonId: string;
}) => {
  const [chatHistory, setChatHistory] = useState<CHAT_INFO_TYPE[]>([]);
  const [profileInfo, setProfileInfo] = useState<
    | {
        name: string;
        phone: string;
        email: string;
        avatar_url: string;
        id: string;
      }
    | undefined
  >(undefined);

  const { user } = useAuthContext();

  const [message, setMessage] = useState<string>("");

  const chatWindowRef = useRef<HTMLDivElement>(null);

  const [isChatOverlayButtonsVisible, setIsChatOverlayButtonsVisible] =
    useState<boolean>(false);

  const [isLabelModalOpen, setIsLabelModalOpen] = useState<boolean>(false);

  const sendMessage = async () => {
    if (!message) return;

    await supabase.from("messages").insert([
      {
        sender_id: user?.id,
        receiver_id: currentChatPersonId,
        content: message,
        replied_id: currentSelectedMessageId ? currentSelectedMessageId : null,
      },
    ]);

    setMessage("");
  };

  const [currentSelectedMessageId, setCurrentSelectedMessageId] =
    useState<string>("");

  const [isScrollToBBVisible, setIsScrollToBBVisible] =
    useState<boolean>(false);

  useEffect(() => {
    const chatWindowElement = chatWindowRef.current;

    if (!chatWindowElement) return;

    const goToBottom = () => {
      if (chatWindowElement.scrollTop >= chatWindowElement.scrollHeight / 3) {
        setIsScrollToBBVisible(false);
      } else {
        setIsScrollToBBVisible(true);
      }
    };

    chatWindowElement.addEventListener("scroll", goToBottom);

    return () => {
      chatWindowElement.removeEventListener("scroll", goToBottom);
    };
  }, [currentChatPersonId]);

  const { triggerRefetch } = useRefetch();

  const fetchChatHistory = async () => {
    if (!user || !profileInfo) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user?.id},receiver_id.eq.${currentChatPersonId}),and(sender_id.eq.${currentChatPersonId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (data) {
      const formattedData: CHAT_INFO_TYPE[] = data.map((d) => ({
        id: d.id,
        content: d.content,
        is_read: d.is_read,
        createdAt: d.created_at,
        sender_id: d.sender_id,
        receiver_id: d.receiver_id,
        name:
          d.sender_id == user.id
            ? user.name
              ? user.name
              : ""
            : profileInfo.name,
        number:
          d.sender_id == user.id
            ? user.phone
              ? user.phone
              : ""
            : profileInfo.phone,
        type:
          d.sender_id == user.id ? MESSAGE_TYPES.SENT : MESSAGE_TYPES.RECEIVED,
        replied_id: d.replied_id,
      }));

      setChatHistory(formattedData);
    }
  };

  useEffect(() => {
    if (!user || !currentChatPersonId || !profileInfo) return;

    fetchChatHistory();
    fetchSelectedLabels();

    chatWindowRef.current?.scrollTo({
      behavior: "smooth",
      top: chatWindowRef.current.scrollHeight,
    });

    const subscription = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const formattedData: CHAT_INFO_TYPE = {
            id: payload.new.id,
            content: payload.new.content,
            is_read: payload.new.is_read,
            createdAt: payload.new.createdAt,
            sender_id: payload.new.sender_id,
            receiver_id: payload.new.receiver_id,
            name:
              payload.new.sender_id == user.id
                ? user.name
                  ? user.name
                  : ""
                : profileInfo.name,
            number:
              payload.new.sender_id == user.id
                ? user.phone
                  ? user.phone
                  : ""
                : profileInfo.phone,
            type:
              payload.new.sender_id == user.id
                ? MESSAGE_TYPES.SENT
                : MESSAGE_TYPES.RECEIVED,
            replied_id: payload.new.replied_id,
          };

          setChatHistory((prev) => [...prev, formattedData]);

          triggerRefetch();

          const chatWindowElement = chatWindowRef.current;

          chatWindowElement?.scrollTo({
            behavior: "smooth",
            top: chatWindowElement.scrollHeight + 400,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, profileInfo]);

  const getProfileById = async (profileId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      return;
    }

    setProfileInfo(data);
  };

  useEffect(() => {
    if (!currentChatPersonId) return;

    getProfileById(currentChatPersonId);
  }, [currentChatPersonId]);

  type LABEL_TYPE = {
    id: string;
    label_name: string;
    color: string;
  };

  const [labels, setLabels] = useState<LABEL_TYPE[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<LABEL_TYPE[]>([]);

  const fetchLabels = async () => {
    const { data, error } = await supabase
      .from("chat_label_separate")
      .select("id, label_name, color"); // Select all labels with their details

    if (error) {
      console.error("Error fetching chat labels:", error.message);
    } else {
      setLabels(data as LABEL_TYPE[]);
    }
  };

  const fetchSelectedLabels = async () => {
    const { data, error } = await supabase
      .from("chat_labels")
      .select(
        `
       chat_partner_id,
       label_name
      `
      )
      .eq("user_id", user?.id)
      .eq("chat_partner_id", currentChatPersonId);

    if (error) {
      return;
    } else {
      const labels = data[0]
        ? data[0].label_name.map((label: string) => JSON.parse(label))
        : [];

      setSelectedLabels(labels);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const addLabels = async () => {
    const { data, error } = await supabase.from("chat_labels").upsert(
      [
        {
          user_id: user?.id,
          chat_partner_id: currentChatPersonId,
          label_name: selectedLabels, // New or updated labels array
        },
      ],
      { onConflict: "user_id, chat_partner_id" }
    );

    if (error) {
      console.error("Error adding labels:", error);
    } else {
      setSelectedLabels([]);

      setIsLabelModalOpen(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-1">
      {/* Modal for displaying the add label diaglog */}
      <Modal isOpen={isLabelModalOpen} setIsOpen={setIsLabelModalOpen}>
        <div
          className="w-[50%] h-[60%] bg-white rounded-lg p-4"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <h1 className="text-lg font-semibold">Chat Labels</h1>
          <div className="flex items-center gap-2 flex-wrap my-3">
            {labels?.map((l, index) => (
              <div
                key={index}
                onClick={() => {
                  if (!selectedLabels.includes(l))
                    setSelectedLabels((labels) => [...labels, l]);
                }}
                className="w-fit h-fit px-2 py-1 rounded-md cursor-pointer bg-green-50"
              >
                <p
                  className="text-sm"
                  style={{
                    color: l.color,
                  }}
                >
                  {l.label_name}
                </p>
              </div>
            ))}
          </div>

          <p>Selected Labels:</p>

          <div className="flex items-center gap-2 flex-wrap my-3">
            {selectedLabels?.map((l, index) => (
              <div
                onClick={() => {
                  const newLabels = selectedLabels.filter(
                    (label) => label.id != l.id
                  );

                  setSelectedLabels([...newLabels]);
                }}
                key={index}
                className="w-fit h-fit px-2 py-1 rounded-md cursor-pointer bg-ws-green-50"
              >
                <p
                  className="text-sm"
                  style={{
                    color: l.color,
                  }}
                >
                  {l.label_name}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={addLabels}
            className="bg-ws-green-400 text-sm px-3 py-1 rounded-md text-white mt-5 cursor-pointer"
          >
            Add labels
          </button>
        </div>
      </Modal>

      {/* Left main chat portion */}
      <section className="w-full h-full flex flex-col flex-[0.95] border-r border-ws-green-50 min-h-0 min-w-0">
        {/* header portion */}
        <header
          className={`w-full h-full flex-[0.07] flex items-center justify-between px-4 ${
            currentChatPersonId == "" && "hidden"
          }`}
        >
          {/* Left section */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-neutral-300">
              <Icon
                icon={"bi:person-fill"}
                width={"14"}
                height={"14"}
                className="text-white"
              />
            </div>

            <div className="flex flex-col">
              <p className="text-black text-sm font-bold">
                {profileInfo?.name}
              </p>

              <div className="text-neutral-400 text-xs font-medium flex items-center space-x-1">
                <p>{profileInfo?.phone}</p>
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-3">
            <Icon
              icon={"mdi:stars"}
              width={"20"}
              height={"20"}
              className="text-black"
            />

            <Icon
              icon={"proicons:search"}
              width={"20"}
              height={"20"}
              className="text-black"
            />
          </div>
        </header>

        {/* Messages section */}
        <div
          className={`relative w-full h-full border-y border-ws-green-50 flex flex-col min-h-0 min-w-0 justify-end ${
            currentChatPersonId == "" ? "flex-1" : "flex-[0.84]"
          }`}
        >
          {/* chat window overlay */}
          <img
            src={"/chat-bg.png"}
            alt="background image"
            className="absolute z-0 top-0 left-0 w-full h-full object-cover opacity-50"
          />

          {/* scroll to bottom button */}
          {isScrollToBBVisible && (
            <div
              className={`w-full flex justify-center absolute bottom-4 z-50`}
            >
              <div
                onClick={() => {
                  chatWindowRef.current?.scrollTo({
                    behavior: "smooth",
                    top: chatWindowRef.current.scrollHeight,
                  });
                }}
                className="bg-white w-14  h-fit py-1 rounded-sm cursor-pointer shadow-md flex justify-center"
              >
                <Icon icon="mdi-light:arrow-down" width="20" height="20" />
              </div>
            </div>
          )}

          {/* This section will contain the messages */}
          <div
            className="w-full z-40 flex flex-col space-y-5 min-h-0 overflow-y-auto py-3 custom-scrollbar"
            ref={chatWindowRef}
          >
            {chatHistory.map((chat, index) => (
              <MessageBox
                chatInfo={chat}
                key={index}
                setCurrentSelectedId={setCurrentSelectedMessageId}
                repliedchatInfo={chatHistory.find(
                  (c) => c.id == chat.replied_id
                )}
              />
            ))}
          </div>
        </div>

        {/* message input section */}
        <footer
          className={`w-full h-full flex-[0.09] px-5 py-3 relative ${
            currentChatPersonId == "" && "hidden"
          }`}
        >
          {currentSelectedMessageId && (
            <div className=" z-50 bg-white">
              <MessageBox
                chatInfo={
                  chatHistory.find(
                    (c) => c.id === currentSelectedMessageId
                  ) as CHAT_INFO_TYPE
                }
                setCurrentSelectedId={() => {
                  setCurrentSelectedMessageId("");
                }}
              />
            </div>
          )}

          {false && (
            <div className="absolute -top-1 left-4 -translate-y-full z-50 flex items-center space-x-1">
              <button className="bg-white px-4 rounded-t-md py-1 flex items-center space-x-2">
                <p className="text-xs font-semibold text-ws-green-400">
                  Whatsapp
                </p>
                <Icon
                  icon="material-symbols:info"
                  width="15"
                  height="15"
                  className="text-gray-300"
                />
              </button>

              <button className="bg-yellow-50 px-4 rounded-t-md py-1 flex items-center space-x-2">
                <p className="text-xs font-semibold text-ws-green-200">
                  Private Note
                </p>
                <Icon
                  icon="material-symbols:info"
                  width="15"
                  height="15"
                  className="text-gray-300"
                />
              </button>
            </div>
          )}

          <div className="w-full h-full flex flex-col space-y-4">
            <div className="w-full flex items-center justify-between space-x-3">
              <input
                type="text"
                value={message}
                onFocus={() => {
                  setIsChatOverlayButtonsVisible(true);
                }}
                onBlur={() => {
                  setIsChatOverlayButtonsVisible(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                onChange={(e) => {
                  setMessage(e.target.value);
                }}
                className="w-full outline-none text-sm placeholder:text-neutral-400"
                placeholder="Message..."
              />

              <Icon
                onClick={sendMessage}
                icon={"ic:round-send"}
                width={"20"}
                height={"20"}
                className="text-ws-green-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-5 text-black [&>*]:cursor-pointer">
                <Icon
                  icon={"icomoon-free:attachment"}
                  width={"16"}
                  height={"16"}
                />
                <Icon icon={"proicons:emoji"} width={"16"} height={"16"} />
                <Icon icon={"mdi-light:clock"} width={"16"} height={"16"} />
                <Icon
                  icon={"ant-design:reload-time-outline"}
                  width={"16"}
                  height={"16"}
                />
                <Icon icon={"mage:stars-c"} width={"16"} height={"16"} />
                <Icon
                  icon={"mage:note-with-text-fill"}
                  width={"16"}
                  height={"16"}
                />
                <Icon icon={"stash:mic-solid"} width={"16"} height={"16"} />
              </div>

              <div>
                <button className="flex items-center justify-between border border-neutral-200 rounded-md px-2 py-1 w-32">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-neutral-300"> </div>

                    <p className="text-xs font-medium">{user?.name}</p>
                  </div>

                  <Icon
                    icon={"mi:select"}
                    width={"14"}
                    height={"14"}
                    className="text-neutral-400"
                  />
                </button>
              </div>
            </div>
          </div>
        </footer>
      </section>

      {/* Right sidebar */}
      <section className="w-full h-full flex-[0.05] flex flex-col">
        <div className="w-full h-full flex-[0.07]"></div>

        <div className="w-full h-full flex-[0.93] flex flex-col items-center space-y-8 text-neutral-400 [&>*]:cursor-pointer">
          <Icon
            icon={"tabler:layout-sidebar-right-expand-filled"}
            width={"18"}
            height={"18"}
          />
          <Icon
            icon={"lineicons:refresh-circle-1-clockwise"}
            width={"18"}
            height={"18"}
          />
          <Icon
            onClick={() => {
              setIsLabelModalOpen(true);
            }}
            icon={"system-uicons:write"}
            width={"18"}
            height={"18"}
            className="cursor-pointer"
          />
          <Icon icon={"gg:menu-left"} width={"18"} height={"18"} />
          <Icon icon={"arcticons:dots"} width={"18"} height={"18"} />

          <Icon icon={"mdi:hubspot"} width={"18"} height={"18"} />
          <Icon
            icon={"fluent:people-team-24-filled"}
            width={"18"}
            height={"18"}
          />
          <Icon icon={"humbleicons:at-symbol"} width={"18"} height={"18"} />
          <Icon icon={"ri:folder-image-fill"} width={"18"} height={"18"} />
          <Icon icon={"ri:list-settings-line"} width={"18"} height={"18"} />
        </div>
      </section>
    </div>
  );
};

export default ChatWindow;
