import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SecretChatBox from "../components/SecretChatBox";
import axios from "axios";
import SecretSidebar from "../components/SecretSidebar";
import "./secretChat.css";

const SecretChat = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const navigate = useNavigate();
    const token = JSON.parse(localStorage.getItem("userInfo")).token;
    const [selectedUserInfo, setSelectedUserInfo] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const config = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    const fetchChats = async (userId) => {
        try {
            setIsLoading(true);
            const { data } = await axios.get(
                process.env.REACT_APP_API_URL+`/api/secretchats?userId=${userId}`,
                config
            );
            setSelectedUserInfo(data);
        } catch (err) {
            setSelectedUserInfo({});
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        if (!userInfo || !userInfo.secretKey) {
            alert("Unauthorized: Secret key missing.");
            navigate("/login");
            return;
        }
        fetchChats(userInfo._id);
    }, [navigate, token]);

    return (
        <div className="secret-chat-container">
            <div className="secret-chat-sidebar-container">
                {isLoading ? (
                    <div>Loading conversations...</div>
                ) : (
                    <SecretSidebar
                        fetchChats={fetchChats}
                        selectedUserInfo={selectedUserInfo}
                        updateSelectedUserInfo={setSelectedUserInfo}
                        onSelectUser={setSelectedUser}
                    />
                )}
            </div>
            <div className="secret-chat-chatbox-container">
                {selectedUser ? (
                    <SecretChatBox
                        selectedChat={selectedUser}
                        updateSelectedUserInfo={setSelectedUserInfo}
                    />

                    ) : (
                    <div className="secret-chat-no-user-selected">
                        🕵️ Select a secret contact to start chatting
                    </div>
                )}
            </div>
        </div>
    );
};

export default SecretChat;
