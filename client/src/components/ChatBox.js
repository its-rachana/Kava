import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./ChatBox.css";

const ChatBox = ({ selectedChat, refreshChats, setSelectedChat }) => {
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const messageEndRef = useRef(null);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    useEffect(() => {

        setCurrentUser(userInfo);
        console.log("inside chat box")
        console.log(selectedChat)
        console.log(userInfo)
        if (!selectedChat) return;

        setMessages(selectedChat.messages);
        // Socket functionality can be added later
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
                process.env.REACT_APP_API_URL+"/api/chat/messages",
                messageData,
                {
                    headers: { Authorization: `Bearer ${userInfo.token}` },
                }
            );


            setMessages((prev) => [...prev, data.newMessage]);
            setNewMsg("");
        } catch (err) {
        }
    };
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (

        <div className="classic-chat-container">
            {selectedChat.isGroupChat && (
                <button className="classic-settings-btn">
                    ⚙️ Group Settings
                </button>
            )}

            <h3 className="classic-chat-heading">
                Chat with{" "}
                {selectedChat.isGroupChat
                    ? selectedChat.chatName
                    : selectedChat.withUserName}
            </h3>

            <div className="classic-messages-container">
                {messages.map((m) => {
                    const isSender = m?.senderId === currentUser?._id;
                    return (
                        <div
                            key={m.senderId}
                            className={`classic-message-wrapper ${
                                isSender ? "classic-sent" : "classic-received"
                            }`}
                        >
                            <div
                                className={`classic-message-bubble ${
                                    isSender
                                        ? "classic-sender-bubble"
                                        : "classic-receiver-bubble"
                                }`}
                            >
                                <div className="classic-message-author">
                                    {isSender ? "You" : selectedChat.withUserId.name}
                                </div>
                                <div className="classic-message-content">
                                    {m.text}
                                </div>
                                <div className="classic-message-time">
                                    {formatTime(m.timestamp)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messageEndRef} />
            </div>

            <div className="classic-input-container">
                <input
                    type="text"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Type your message..."
                    className="classic-input-box"
                />
                <button onClick={sendMessage} className="classic-send-button">
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatBox;
