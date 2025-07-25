import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./SecretSidebar.css";

const SecretSidebar = ({ onSelectUser, selectedUserInfo, fetchChats, updateSelectedUserInfo }) => {
    const [show, setShow] = useState(false);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedChat, setSelectedChat] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('secretChatTheme') || 'time';
    });
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [selectedChatToMove, setSelectedChatToMove] = useState(null);
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("userInfo"))._id;

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        document.body.className = `theme-${theme}`;
        localStorage.setItem('secretChatTheme', theme);
    }, [theme]);

    const getTimeBasedIcon = () => {
        const hour = currentTime.getHours();
        if (hour >= 6 && hour < 12) return "🌅"; // Morning
        if (hour >= 12 && hour < 17) return "☀️"; // Afternoon
        if (hour >= 17 && hour < 20) return "🌆"; // Evening
        return "🌙"; // Night
    };

    const getThemeIcon = () => {
        switch (theme) {
            case 'light':
                return "☀️";
            case 'dark':
                return "🌙";
            case 'time':
            default:
                return getTimeBasedIcon();
        }
    };

    const getThemeLabel = () => {
        switch (theme) {
            case 'light':
                return "Light Theme";
            case 'dark':
                return "Dark Theme";
            case 'time':
            default:
                return `Time Theme: ${getTimeBasedIcon()}`;
        }
    };

    const cycleTheme = () => {
        const themes = ['time', 'light', 'dark'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
    };

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
            console.error("Error moving chat to normal:", error);
        }
    };

    return (
        <div>
            <div className="secret-sidebar-profile-actions">
                <button onClick={() => navigate("/chats")} className="secret-sidebar-back-button">
                    💬 Go Back to Chats
                </button>
                <button onClick={() => navigate("/profile")} className="secret-sidebar-profile-button">
                    👤 Profile
                </button>
                <button onClick={cycleTheme} className="secret-sidebar-theme-button" title={getThemeLabel()}>
                    {getThemeIcon()}
                </button>
            </div>

            <div className="secret-sidebar-chat-header">
                <div className="secret-sidebar-header-title">
                    <h3>Your Secret Chats</h3>
                </div>
                <button onClick={() => setShow(true)} className="secret-sidebar-new-chat-button">
                    + New Chat
                </button>
            </div>

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

            {show && (
                <div className="secret-sidebar-modal-overlay">
                    <h3>Start New Secret Chat</h3>
                    <button onClick={() => setShow(false)} className="secret-sidebar-modal-close">
                        &times;
                    </button>

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
            )}

            {showMoveModal && (
                <div className="secret-sidebar-modal-overlay">
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
            )}
        </div>
    );
};

export default SecretSidebar;
