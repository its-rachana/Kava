import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import socket from "../socket";
import "./SecretChatBox.css";

const SecretChatBox = ({ selectedChat,updateSelectedUserInfo }) => {
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState("");
    const messageEndRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem("userInfo"));
    const userInfo = currentUser;

    useEffect(() => {
        if (!selectedChat) return;

        const fetchMessages = async () => {
            try {
                const { data } = await axios.get(
                    process.env.REACT_APP_API_URL+"/api/secretchats/fetchcurrentchatmessages",
                    {
                        headers: { Authorization: `Bearer ${userInfo.token}` },
                        params: {
                            currentUser: userInfo._id,
                            withUserId: selectedChat.withUserId._id,
                        },
                    }
                );
                setMessages(data.messages);
            } catch (error) {
                setMessages([]);
            }
        };

        fetchMessages();

        socket.on("receive_message", (data) => {
            if (data.chat._id === selectedChat.withUserId._id) {
                setMessages((prev) => [...prev, data]);
            }
        });

        return () => socket.off("receive_message");
    }, [selectedChat]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!newMsg.trim()) return;

        try {
            const messageData = {
                senderId: currentUser._id,
                withUserId: selectedChat.withUserId._id,
                text: newMsg,
            };

            const { data } = await axios.post(
                process.env.REACT_APP_API_URL+"/api/secretchats/messages",
                messageData,
                {
                    headers: { Authorization: `Bearer ${userInfo.token}` },
                }
            );


            setMessages((prev) => [...prev, data.newMessage]);

            if (typeof updateSelectedUserInfo === "function") {
                updateSelectedUserInfo((prevConversations) =>
                    prevConversations.map((conv) =>
                        conv.withUserId === selectedChat.withUserId._id ||
                        conv.withUserId === selectedChat.withUserId
                            ? {
                                ...conv,
                                messages: [...(conv.messages || []), data.newMessage],
                                lastUpdated: new Date().toISOString(),
                            }
                            : conv
                    )
                );
            }
            setNewMsg("");
        } catch (err) {
        }
    };

    return (
        <div className="chatbox-wrapper">
            {currentUser && (
                <>
                    <h3 className="chatbox-heading">
                        Chat with{" "}
                        {selectedChat.isGroupChat
                            ? selectedChat.chatName
                            : selectedChat.withUserName}
                    </h3>

                    <div className="chatbox-messages">
                        {messages && messages.length > 0 ? (
                            messages.map((m) => {
                                const isCurrentUser = m.senderId === currentUser._id;

                                return (
                                    <div
                                        key={m._id || m.timestamp}
                                        className={`message-row ${isCurrentUser ? "sent" : "received"}`}
                                    >
                                        <div className={`message-bubble ${isCurrentUser ? "sent" : "received"}`}>
                                            <div className="message-sender">
                                                {isCurrentUser ? "You" : selectedChat.withUserName}
                                            </div>
                                            <div className="message-text">{m.text}</div>
                                            <div className="message-time">
                                                {new Date(m.timestamp).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-messages">No messages yet.</div>
                        )}

                        <div ref={messageEndRef} />
                    </div>

                    <div className="chatbox-input-container">
                        <input
                            type="text"
                            value={newMsg}
                            onChange={(e) => setNewMsg(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") sendMessage();
                            }}
                            placeholder="Type your message..."
                            className="chatbox-input"
                        />
                        <button onClick={sendMessage} className="chatbox-send-button">
                            Send
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default SecretChatBox;
