import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./SecretSidebar.css";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../hooks/useTheme";

const SecretSidebar = ({ onSelectUser, selectedUserInfo, fetchChats, updateSelectedUserInfo }) => {
    const [show, setShow] = useState(false);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedChat, setSelectedChat] = useState(null);
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [selectedChatToMove, setSelectedChatToMove] = useState(null);
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("userInfo"))._id;

    const {
        themeMode,
        isDarkMode,
        timeBasedTheme,
        cycleTheme,
        getThemeClasses,
        getThemeIcon,
        getThemeLabel
    } = useTheme();

    const fetchAllUsers = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo")).token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const { data } = await axios.get(process.env.REACT_APP_API_URL+"/api/user", config);
            setUsers(data);
        } catch (error) {
        }
    };

    useEffect(() => {
        if (show) fetchAllUsers();
    }, [show]);

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUserClick = async (newUser) => {
        const chatExists = selectedUserInfo.some(
            (conv) => conv.withUserId === newUser._id
        );
        if (chatExists) {
            const existingChat = selectedUserInfo.find(
                (conv) => conv.withUserId === newUser._id
            );
            handleSidebarChatClick(existingChat);
            setShow(false);
            return;
        }

        try {
            setShow(false);
            const token = JSON.parse(localStorage.getItem("userInfo")).token;
            const config = {
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };
            const { data } = await axios.post(
                process.env.REACT_APP_API_URL+`/api/secretchats/initiatechat`,
                { currentUser, newUser },
                config
            );
            updateSelectedUserInfo((prev) => [data.conversation, ...prev]);
            handleSidebarChatClick(data.conversation);
        } catch (err) {}
    };

    const handleSidebarChatClick = (conversation) => {
        setSelectedChat(conversation);
        onSelectUser(conversation);
    };

    const handleLongPressStart = (conversation) => {
        const timer = setTimeout(() => {
            setSelectedChatToMove(conversation);
            setShowMoveModal(true);
        }, 800); // 800ms for long press
        setLongPressTimer(timer);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const moveToNormalChats = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("userInfo")).token;
            const config = {
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };

            await axios.post(
                process.env.REACT_APP_API_URL + "/api/secretchats/movetonormal",
                {
                    currentUser,
                    withUserId: selectedChatToMove.withUserId
                },
                config
            );

            // Remove from secret chats
            updateSelectedUserInfo((prev) =>
                prev.filter(conv => conv.withUserId !== selectedChatToMove.withUserId)
            );

            setShowMoveModal(false);
            setSelectedChatToMove(null);

            // Refresh normal chats if needed
            if (fetchChats) {
                fetchChats();
            }
        } catch (error) {

        }
    };

    return (
        <div className={`secret-sidebar-container ${getThemeClasses()}`}>
            <div className="secret-sidebar-profile-actions">
                <button onClick={() => navigate("/chats")} className="secret-sidebar-back-button">
                    💬 Go Back to Chats
                </button>
                <button onClick={() => navigate("/profile")} className="secret-sidebar-profile-button">
                    👤 Profile
                </button>
                <ThemeToggle
                    themeMode={themeMode}
                    onToggle={cycleTheme}
                    getThemeIcon={getThemeIcon}
                    getThemeLabel={getThemeLabel}
                />
            </div>

            <div className="secret-sidebar-chat-header">
                <div className="secret-sidebar-header-title">
                    <h3>Your Secret Chats</h3>
                </div>
                <button onClick={() => setShow(true)} className="secret-sidebar-new-chat-button">
                    + New Chat
                </button>
            </div>

            <div className="secret-sidebar-chat-list">
                {selectedUserInfo.map((conversation) => (
                    <div
                        key={conversation.withUserId}
                        onClick={() => handleSidebarChatClick(conversation)}
                        onMouseDown={() => handleLongPressStart(conversation)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(conversation)}
                        onTouchEnd={handleLongPressEnd}
                        className={`secret-sidebar-chat-item ${selectedChat?.withUserId === conversation.withUserId ? "selected" : ""}`}
                    >
                        <div className="secret-sidebar-name">
                            {conversation.withUserName || "Unknown"}
                        </div>
                        <div className="secret-sidebar-preview">
                            {conversation.messages?.length > 0
                                ? conversation.messages[conversation.messages.length - 1].text
                                : "No messages yet"}
                        </div>
                    </div>
                ))}
            </div>

            {show && (
                <div className="secret-sidebar-modal-overlay">
                    <div className="secret-sidebar-modal-container">
                        <div className="secret-sidebar-modal-content">
                            <button onClick={() => setShow(false)} className="secret-sidebar-modal-close">
                                &times;
                            </button>
                            <h3>Start New Secret Chat</h3>

                            <input
                                type="text"
                                placeholder="Search users..."
                                className="secret-sidebar-search-input"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            <div className="secret-sidebar-search-results">
                                {filteredUsers.map((user) => (
                                    <div key={user._id} onClick={() => handleUserClick(user)} className="secret-sidebar-user-item">
                                        <div>{user.name}</div>
                                        <div className="email">{user.email}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showMoveModal && (
                <div className="secret-sidebar-modal-overlay">
                    <div className="secret-sidebar-modal-container">
                        <div className="secret-sidebar-move-modal">
                            <h3>Move Chat</h3>
                            <p>Move this chat back to normal chats?</p>
                            <div className="secret-sidebar-move-modal-actions">
                                <button
                                    onClick={moveToNormalChats}
                                    className="secret-sidebar-move-confirm-btn"
                                >
                                    Move to Normal
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMoveModal(false);
                                        setSelectedChatToMove(null);
                                    }}
                                    className="secret-sidebar-move-cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecretSidebar;
