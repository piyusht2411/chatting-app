/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useAuthContext } from "@/context/authContext";
import { useRefetch } from "@/context/refetchContext";
import { supabase } from "@/lib/supabaseClient";
import { formatToOnlyTime } from "@/utils/formatTime";
import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { get, set, del } from "idb-keyval";
import { v4 as uuidv4 } from "uuid";

enum MESSAGE_TYPES {
  SENT = "SENT",
  RECEIVED = "RECEIVED",
}

type LABEL_TYPE = {
  id: string;
  label_name: string;
  color: string;
};

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
  isPending?: boolean;
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
          } px-3 py-2 rounded-b-lg min-w-60 flex flex-col max-w-96 space-y-2 shadow-md ${
            chatInfo.isPending ? "opacity-50" : ""
          }`}
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

              {chatInfo.type == MESSAGE_TYPES.SENT && !chatInfo.isPending && (
                <Icon
                  icon={"charm:tick-double"}
                  width={"14"}
                  height={"14"}
                  className="text-blue-500"
                />
              )}
              {chatInfo.isPending && (
                <Icon
                  icon={"mdi:clock-outline"}
                  width={"14"}
                  height={"14"}
                  className="text-gray-400"
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
  const [currentSelectedMessageId, setCurrentSelectedMessageId] =
    useState<string>("");
  const [isScrollToBBVisible, setIsScrollToBBVisible] =
    useState<boolean>(false);
  const { triggerRefetch } = useRefetch();

  // Label-related state
  const [labels, setLabels] = useState<LABEL_TYPE[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<LABEL_TYPE[]>([]);

  // Load pending messages from IndexedDB on mount
  useEffect(() => {
    const loadPendingMessages = async () => {
      const pendingMessages = await get(
        `pendingMessages_${currentChatPersonId}`
      );
      if (pendingMessages) {
        setChatHistory((prev) => [...prev, ...pendingMessages]);
      }
    };
    if (currentChatPersonId) {
      loadPendingMessages();
    }
  }, [currentChatPersonId]);

  const sendMessage = async () => {
    if (!message || !user || !currentChatPersonId) return;

    // Create a temporary message with a unique ID
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const tempMessage: CHAT_INFO_TYPE = {
      id: tempId,
      type: MESSAGE_TYPES.SENT,
      name: user.name || "",
      content: message,
      sender_id: user.id,
      receiver_id: currentChatPersonId,
      is_read: false,
      createdAt: new Date().toISOString(),
      number: user.phone || "",
      replied_id: currentSelectedMessageId || "",
      isPending: true,
    };

    // Store the message content before clearing
    const messageContent = message;
    const repliedId = currentSelectedMessageId;

    // Clear the input and selected message first
    setMessage("");
    setCurrentSelectedMessageId("");

    // Optimistic update: Add the message to the UI immediately
    setChatHistory((prev) => [...prev, tempMessage]);

    // Save the pending message to IndexedDB
    const pendingMessagesKey = `pendingMessages_${currentChatPersonId}`;
    const existingPendingMessages = (await get(pendingMessagesKey)) || [];
    await set(pendingMessagesKey, [...existingPendingMessages, tempMessage]);

    // Scroll to the bottom
    chatWindowRef.current?.scrollTo({
      behavior: "smooth",
      top: chatWindowRef.current.scrollHeight,
    });

    // Send the message to Supabase and return the inserted row
    try {
      const { data: newMessage, error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: user.id,
            receiver_id: currentChatPersonId,
            content: messageContent,
            replied_id: repliedId || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Format the server message
      const formattedMessage: CHAT_INFO_TYPE = {
        id: newMessage.id,
        type: MESSAGE_TYPES.SENT,
        name: user.name || "",
        content: newMessage.content,
        sender_id: newMessage.sender_id,
        receiver_id: newMessage.receiver_id,
        is_read: newMessage.is_read,
        createdAt: newMessage.created_at,
        number: user.phone || "",
        replied_id: newMessage.replied_id || "",
        isPending: false,
      };

      // Replace the temporary message with the server message
      setChatHistory((prev) =>
        prev.map((msg) => (msg.id === tempId ? formattedMessage : msg))
      );

      // Remove the pending message from IndexedDB
      const updatedPendingMessages = (
        (await get(pendingMessagesKey)) || []
      ).filter((msg: CHAT_INFO_TYPE) => msg.id !== tempId);
      if (updatedPendingMessages.length > 0) {
        await set(pendingMessagesKey, updatedPendingMessages);
      } else {
        await del(pendingMessagesKey);
      }

      // Trigger refetch for the sidebar
      triggerRefetch();
    } catch (error) {
      console.error("Error sending message:", error);

      // On failure, remove the message from the UI
      setChatHistory((prev) => prev.filter((msg) => msg.id !== tempId));

      // Remove from IndexedDB
      const updatedPendingMessages = (
        (await get(pendingMessagesKey)) || []
      ).filter((msg: CHAT_INFO_TYPE) => msg.id !== tempId);
      if (updatedPendingMessages.length > 0) {
        await set(pendingMessagesKey, updatedPendingMessages);
      } else {
        await del(pendingMessagesKey);
      }

      alert("Failed to send message. Please try again.");
    }
  };

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
        name: d.sender_id == user.id ? user.name || "" : profileInfo.name,
        number: d.sender_id == user.id ? user.phone || "" : profileInfo.phone,
        type:
          d.sender_id == user.id ? MESSAGE_TYPES.SENT : MESSAGE_TYPES.RECEIVED,
        replied_id: d.replied_id,
      }));

      // Merge with pending messages from IndexedDB
      const pendingMessages =
        (await get(`pendingMessages_${currentChatPersonId}`)) || [];
      setChatHistory([...formattedData, ...pendingMessages]);
    }
  };

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

  useEffect(() => {
    if (!user || !currentChatPersonId || !profileInfo) return;

    fetchChatHistory();

    // Load pending labels from IndexedDB
    const loadPendingLabels = async () => {
      const pendingLabels = await get(
        `pendingLabels_${user.id}_${currentChatPersonId}`
      );
      if (pendingLabels) {
        setSelectedLabels(pendingLabels);
      } else {
        fetchSelectedLabels();
      }
    };
    loadPendingLabels();

    // Real-time subscription for chat_labels
    const labelSubscription = supabase
      .channel("realtime-chat-labels")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_labels",
          filter: `user_id=eq.${user.id},chat_partner_id=eq.${currentChatPersonId}`,
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const newLabels = payload.new.label_name || [];
            const parsedLabels: LABEL_TYPE[] = newLabels
              .map((label: any) =>
                typeof label === "string" ? JSON.parse(label) : label
              )
              .filter(
                (label: any) =>
                  label && label.id && label.label_name && label.color
              );
            setSelectedLabels(parsedLabels);

            // Remove pending labels from IndexedDB
            del(`pendingLabels_${user.id}_${currentChatPersonId}`);

            // Trigger refetch to update AllChats
            //@ts-expect-error https
            triggerRefetch({
              type: "UPDATE_LABELS",
              chat_partner_id: currentChatPersonId,
              labels: parsedLabels,
            });
          }
        }
      )
      .subscribe();

    chatWindowRef.current?.scrollTo({
      behavior: "smooth",
      top: chatWindowRef.current.scrollHeight,
    });

    const messageSubscription = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMessage = payload.new;
          const formattedData: CHAT_INFO_TYPE = {
            id: newMessage.id,
            content: newMessage.content,
            is_read: newMessage.is_read,
            createdAt: newMessage.created_at,
            sender_id: newMessage.sender_id,
            receiver_id: newMessage.receiver_id,
            name:
              newMessage.sender_id == user.id
                ? user.name || ""
                : profileInfo.name,
            number:
              newMessage.sender_id == user.id
                ? user.phone || ""
                : profileInfo.phone,
            type:
              newMessage.sender_id == user.id
                ? MESSAGE_TYPES.SENT
                : MESSAGE_TYPES.RECEIVED,
            replied_id: newMessage.replied_id,
          };

          setChatHistory((prev) => {
            if (prev.some((msg) => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, formattedData];
          });

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
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(labelSubscription);
    };
  }, [user, profileInfo, currentChatPersonId]);

  const getProfileById = async (profileId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    setProfileInfo(data);
  };

  useEffect(() => {
    if (!currentChatPersonId) return;

    getProfileById(currentChatPersonId);
  }, [currentChatPersonId]);

  const fetchLabels = async () => {
    const { data, error } = await supabase
      .from("chat_label_separate")
      .select("id, label_name, color");

    if (error) {
      console.error("Error fetching chat labels:", error.message);
    } else {
      setLabels(data as LABEL_TYPE[]);
    }
  };

  const fetchSelectedLabels = async () => {
    if (!user?.id || !currentChatPersonId) return;

    const { data, error } = await supabase
      .from("chat_labels")
      .select(`chat_partner_id, label_name`)
      .eq("user_id", user.id)
      .eq("chat_partner_id", currentChatPersonId);

    if (error) {
      console.error("Error fetching selected labels:", error);
    } else {
      const parsedLabels: LABEL_TYPE[] = [];

      if (
        data &&
        data[0] &&
        data[0].label_name &&
        Array.isArray(data[0].label_name)
      ) {
        for (const labelItem of data[0].label_name) {
          try {
            let parsedLabel;
            if (typeof labelItem === "string") {
              parsedLabel = JSON.parse(labelItem);
            } else {
              parsedLabel = labelItem;
            }

            if (
              parsedLabel &&
              typeof parsedLabel === "object" &&
              parsedLabel.id &&
              parsedLabel.label_name &&
              parsedLabel.color
            ) {
              parsedLabels.push(parsedLabel as LABEL_TYPE);
            }
          } catch (parseError) {
            console.error("Error parsing label:", labelItem, parseError);
          }
        }
      }

      setSelectedLabels(parsedLabels);
    }
  };

  useEffect(() => {
    if (user?.id && currentChatPersonId) {
      fetchLabels();
      // Load pending labels instead of fetching immediately
      const loadPendingLabels = async () => {
        const pendingLabels = await get(
          `pendingLabels_${user.id}_${currentChatPersonId}`
        );
        if (pendingLabels) {
          setSelectedLabels(pendingLabels);
        } else {
          fetchSelectedLabels();
        }
      };
      loadPendingLabels();
    }
  }, [user?.id, currentChatPersonId]);

  const addLabels = async () => {
    if (!user?.id || !currentChatPersonId) return;

    // Generate a temporary ID for the label update
    const tempId = `temp_label_${uuidv4()}`;
    const pendingLabels = selectedLabels;

    // Optimistic update: Update selectedLabels immediately
    setSelectedLabels(pendingLabels);

    // Store pending labels in IndexedDB
    const pendingLabelsKey = `pendingLabels_${user.id}_${currentChatPersonId}`;
    await set(pendingLabelsKey, pendingLabels);

    // Notify AllChats to update labels optimistically
    //@ts-expect-error https
    triggerRefetch({
      type: "UPDATE_LABELS",
      chat_partner_id: currentChatPersonId,
      labels: pendingLabels,
      tempId,
    });

    // Close modal
    setIsLabelModalOpen(false);

    try {
      const { data, error } = await supabase.from("chat_labels").upsert(
        [
          {
            user_id: user?.id,
            chat_partner_id: currentChatPersonId,
            label_name: selectedLabels,
          },
        ],
        { onConflict: "user_id, chat_partner_id" }
      );

      if (error) throw error;

      console.log("Labels stored successfully:", data);

      // Clear pending labels from IndexedDB
      await del(pendingLabelsKey);

      // Real-time subscription will handle updating selectedLabels and AllChats
    } catch (error) {
      //@ts-expect-error https
      console.error("Error adding labels:", error.message || error);

      // Revert UI changes
      await fetchSelectedLabels();

      // Remove pending labels from IndexedDB
      await del(pendingLabelsKey);

      // Notify AllChats to revert labels
      //@ts-expect-error https
      triggerRefetch({
        type: "REVERT_LABELS",
        chat_partner_id: currentChatPersonId,
        tempId,
      });

      alert("Failed to add labels. Changes have been reverted.");
    }
  };

  const isLabelSelected = (label: LABEL_TYPE) => {
    return selectedLabels.some(
      (selectedLabel) => selectedLabel.id === label.id
    );
  };

  const toggleLabelSelection = (label: LABEL_TYPE) => {
    const isSelected = isLabelSelected(label);

    if (isSelected) {
      setSelectedLabels((prev) => prev.filter((l) => l.id !== label.id));
    } else {
      setSelectedLabels((prev) => [...prev, label]);
    }
  };

  return (
    <div className="w-full h-full flex flex-1">
      <Modal isOpen={isLabelModalOpen} setIsOpen={setIsLabelModalOpen}>
        <div
          className="w-[50%] h-[60%] bg-white rounded-lg p-4"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <h1 className="text-lg font-semibold">Chat Labels</h1>
          <div className="flex items-center gap-2 flex-wrap my-3">
            {labels?.map((l) => (
              <div
                key={`available-${l.id}`}
                onClick={() => toggleLabelSelection(l)}
                className={`w-fit h-fit px-2 py-1 rounded-md cursor-pointer ${
                  isLabelSelected(l) ? "bg-green-200" : "bg-green-50"
                }`}
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
            {selectedLabels?.map((l) => (
              <div
                onClick={() => toggleLabelSelection(l)}
                key={`selected-${l.id}`}
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

      <section className="w-full h-full flex flex-col flex-[0.95] border-r border-ws-green-50 min-h-0 min-w-0">
        <header
          className={`w-full h-full flex-[0.07] flex items-center justify-between px-4 ${
            currentChatPersonId == "" && "hidden"
          }`}
        >
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

        <div
          className={`relative w-full h-full border-y border-ws-green-50 flex flex-col min-h-0 min-w-0 justify-end ${
            currentChatPersonId == "" ? "flex-1" : "flex-[0.84]"
          }`}
        >
          <img
            src={"/chat-bg.png"}
            alt="background image"
            className="absolute z-0 top-0 left-0 w-full h-full object-cover opacity-50"
          />

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
                className="bg-white w-14 h-fit py-1 rounded-sm cursor-pointer shadow-md flex justify-center"
              >
                <Icon icon="mdi-light:arrow-down" width="20" height="20" />
              </div>
            </div>
          )}

          <div
            className="w-full z-40 flex flex-col space-y-5 min-h-0 overflow-y-auto py-3 custom-scrollbar"
            ref={chatWindowRef}
          >
            {chatHistory.map((chat) => (
              <MessageBox
                chatInfo={chat}
                key={chat.id}
                setCurrentSelectedId={setCurrentSelectedMessageId}
                repliedchatInfo={chatHistory.find(
                  (c) => c.id == chat.replied_id
                )}
              />
            ))}
          </div>
        </div>

        <footer
          className={`w-full h-full flex-[0.09] px-5 py-3 relative ${
            currentChatPersonId == "" && "hidden"
          }`}
        >
          {currentSelectedMessageId && (
            <div className="z-50 bg-white">
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
                    <div className="w-3 h-3 rounded-full bg-neutral-300"></div>
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
