import React, {useState, useEffect, useRef} from "react";
import axios from "axios";
import ChatBox from "../components/ChatBox";
import SearchUsers from "../components/SearchUsers";
import ThemeToggle from "../components/ThemeToggle.js";
import {useTheme} from "../hooks/useTheme";
import {Trash2, Eye, EyeOff, Shield, X} from "lucide-react";
import {useNavigate} from "react-router-dom";
import "./ChatPage.css";
import {arrayBufferToBase64} from "../utilities/image";

const ChatPage = () => {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedChatsForDeletion, setSelectedChatsForDeletion] = useState([]);
    const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
    const [userSecretKey, setUserSecretKey] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [chatFilter, setChatFilter] = useState("");
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [base64Image, setBase64Image] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProfileImageModalOpen, setIsProfileImageModalOpen] = useState(false);

    // Long press functionality
    const [longPressedChat, setLongPressedChat] = useState(null);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [showContextMenu, setShowContextMenu] = useState(false);
    const longPressTimer = useRef(null);

    const {
        themeMode,
        isDarkMode,
        timeBasedTheme,
        cycleTheme,
        getThemeClasses,
        getThemeIcon,
        getThemeLabel
    } = useTheme();

    const navigate = useNavigate();
    const {token} = JSON.parse(localStorage.getItem("userInfo"));
    const config = {headers: {Authorization: `Bearer ${token}`}};
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    useEffect(() => {
        setCurrentUser(userInfo);
        // Fix profile image display
        if (userInfo?.profilePhoto?.data) {
            setBase64Image(arrayBufferToBase64(userInfo.profilePhoto.data));
        }
        fetchChats(userInfo._id);
    }, []);

    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        setSecretKey(userInfo?.secretKey || "");

        const handleUpdate = () => {
            const user = JSON.parse(localStorage.getItem("userInfo"));
            setSecretKey(user?.secretKey || "");
            // Update profile image when user info changes
            if (user?.profilePhoto?.data) {
                const base64 = arrayBufferToBase64(user.profilePhoto.data);
                setBase64Image(base64);
            }
        };

        window.addEventListener("userInfoUpdated", handleUpdate);
        return () => window.removeEventListener("userInfoUpdated", handleUpdate);
    }, []);

    // Close context menu when clicking elsewhere
    useEffect(() => {
        const handleClickOutside = () => {
            setShowContextMenu(false);
            setLongPressedChat(null);
        };

        if (showContextMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showContextMenu]);

    const fetchChats = async (userId) => {
        try {
            const {data} = await axios.get(
                process.env.REACT_APP_API_URL + `/api/chat?userId=${userId}`,
                config
            );
            // Access conversations from the nested data structure
            setChats(data?.conversations || []);
        } catch (err) {
            console.error("Error fetching chats:", err);
            setChats([]);
        }
    };

    const handleChatCreated = (newChat) => {
        setChats((prevChats) => {
            // Check if chat already exists
            const existingIndex = prevChats.findIndex((chat) => chat._id === newChat._id);
            if (existingIndex === -1) {
                // Chat doesn't exist, add it to the beginning
                return [newChat, ...prevChats];
            } else {
                // Chat exists, update it and move to beginning
                const updatedChats = [...prevChats];
                updatedChats.splice(existingIndex, 1); // Remove from current position
                return [newChat, ...updatedChats]; // Add to beginning
            }
        });
        setSelectedChat(newChat);
    };

    const removeChat = async (chatId) => {
        try {
            const {token} = JSON.parse(localStorage.getItem("userInfo"));
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            await axios.delete(
                process.env.REACT_APP_API_URL + `/api/chat/${chatId}`,
                config
            );

            setChats((prevChats) => prevChats.filter((chat) => chat._id !== chatId));

            if (selectedChat && selectedChat._id === chatId) {
                setSelectedChat(null);
            }
        } catch (error) {
            console.error("Error removing chat:", error);
        }
    };

    const handleChatFilterChange = (filterTerm) => {
        setChatFilter(filterTerm);
    };

    const getFilteredChats = () => {
        if (chatFilter.trim() === "") {
            return chats;
        }

        return chats.filter(chat => {
            const chatName = getChatName(chat).toLowerCase();
            return chatName.includes(chatFilter.toLowerCase());
        });
    };

    const getChatName = (chat) => {
        if (chat.isGroupChat) {
            return chat.chatName;
        }

        // For individual chats, use withUserName directly
        return chat.withUserName || "Unknown User";
    };

    const getLatestMessage = (chat) => {
        if (chat && chat.messages && chat.messages.length > 0) {
            // Get the latest message (last message in the array)
            const latestMessage = chat.messages[chat.messages.length - 1];
            const isCurrentUser = latestMessage.senderId === currentUser?._id;
            const senderName = isCurrentUser ? "You" : chat.withUserName || "Unknown";
            return `${senderName}: ${latestMessage.text}`;
        }
        return "No messages yet";
    };

    const handleProfileClick = () => {
        setIsProfileImageModalOpen(true);
        setIsModalOpen(true);
    };

    const handleProfileImageModalClose = () => {
        setIsProfileImageModalOpen(false);
        setIsModalOpen(false);
    };

    const handleChatDoubleClick = (chatId) => {
        setSelectedChatsForDeletion(prev => {
            if (prev.includes(chatId)) {
                return prev.filter(id => id !== chatId);
            } else {
                return [...prev, chatId];
            }
        });
    };

    const handleChatSingleClick = (chat) => {
        // If in selection mode, toggle selection instead of opening chat
        if (selectedChatsForDeletion.length > 0) {
            handleChatDoubleClick(chat._id);
        } else {
            // Normal chat selection for viewing
            setSelectedChat(chat);
        }
    };

    // Long press handlers
    const handleMouseDown = (e, chat) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenuPosition({
            x: e.clientX,
            y: e.clientY
        });

        longPressTimer.current = setTimeout(() => {
            setLongPressedChat(chat);
            setShowContextMenu(true);
        }, 500); // 500ms for long press
    };

    const handleMouseUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleMouseLeave = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // Touch handlers for mobile
    const handleTouchStart = (e, chat) => {
        const touch = e.touches[0];
        setContextMenuPosition({
            x: touch.clientX,
            y: touch.clientY
        });

        longPressTimer.current = setTimeout(() => {
            setLongPressedChat(chat);
            setShowContextMenu(true);
        }, 500);
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleMoveToSecretChats = async () => {
        if (!longPressedChat) return;

        try {
            const {token} = JSON.parse(localStorage.getItem("userInfo"));
            const config = {
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };

            // API call to move chat to secret chats
            await axios.patch(
                process.env.REACT_APP_API_URL + `/api/chat/${longPressedChat._id}/move-to-secret`,
                {},
                config
            );

            // Remove from current chats list
            setChats(prevChats => prevChats.filter(chat => chat._id !== longPressedChat._id));

            // Clear selection if this was the selected chat
            if (selectedChat && selectedChat._id === longPressedChat._id) {
                setSelectedChat(null);
            }

            // Close context menu
            setShowContextMenu(false);
            setLongPressedChat(null);

            // Show success message
            alert("Chat moved to secret chats successfully!");
        } catch (error) {
            console.error("Error moving chat to secret:", error);
            alert("Failed to move chat to secret chats. Please try again.");
        }
    };

    const clearSelection = () => {
        setSelectedChatsForDeletion([]);
    };

    const deleteSelectedChats = async () => {
        if (selectedChatsForDeletion.length === 0) return;

        if (window.confirm(`Are you sure you want to delete ${selectedChatsForDeletion.length} chat(s)?`)) {
            try {
                const {token} = JSON.parse(localStorage.getItem("userInfo"));
                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                };

                // Delete all selected chats
                await Promise.all(
                    selectedChatsForDeletion.map(chatId =>
                        axios.delete(
                            process.env.REACT_APP_API_URL + `/api/chat/${chatId}`,
                            config
                        )
                    )
                );

                // Update local state
                setChats(prevChats =>
                    prevChats.filter(chat => !selectedChatsForDeletion.includes(chat._id))
                );

                // Clear selection if current chat was deleted
                if (selectedChat && selectedChatsForDeletion.includes(selectedChat._id)) {
                    setSelectedChat(null);
                }

                // Reset selection
                setSelectedChatsForDeletion([]);
            } catch (error) {
                console.error("Error deleting chats:", error);
                alert("Failed to delete some chats. Please try again.");
            }
        }
    };

    const searchUsers = async (term) => {
        setSearchLoading(true);
        try {
            const {token} = JSON.parse(localStorage.getItem("userInfo"));
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            const {data} = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/user?search=${term}`,
                config
            );

            setSearchResults(data);
        } catch (error) {
            console.error("Error searching users:", error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const startChat = async (userDetails) => {
        try {
            const {token, _id} = JSON.parse(localStorage.getItem("userInfo"));
            const config = {
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };
            const {data} = await axios.post(
                process.env.REACT_APP_API_URL + `/api/chat/initiate-chat`,
                {
                    newUser: userDetails,
                    currentUser: _id
                },
                config
            );

            // Ensure the chat object has the correct structure
            const normalizedChat = {
                ...data,
                withUserName: data.withUserName || userDetails.name,
                withUserId: data.withUserId || userDetails._id,
                messages: data.messages || []
            };

            // Check if chat already exists in current chats
            const existingChatIndex = chats.findIndex(chat => chat._id === data._id);

            if (existingChatIndex !== -1) {
                // If chat exists, just select it
                setSelectedChat(chats[existingChatIndex]);
            } else {
                // Add the new chat to the chats list and force re-render
                setChats(prevChats => {
                    const newChats = [normalizedChat, ...prevChats];
                    return newChats;
                });

                // Set as selected chat after a small delay to ensure state update
                setTimeout(() => {
                    setSelectedChat(normalizedChat);
                }, 0);
            }

            handleNewChatModalClose();

        } catch (err) {
            console.error("Error starting chat:", err);
            alert("Failed to start chat. Please try again.");
        }
    };

    const createGroupChat = async () => {
        if (groupName.trim() === "" || selectedUsers.length === 0) {
            alert("Please enter a group name and select at least one user.");
            return;
        }

        try {
            const {token} = JSON.parse(localStorage.getItem("userInfo"));
            const config = {
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };
            const {data} = await axios.post(
                process.env.REACT_APP_API_URL + `/api/chat/group`,
                {
                    name: groupName,
                    users: selectedUsers
                },
                config
            );
            handleChatCreated(data);
            handleCreateGroupModalClose();
        } catch (err) {
            console.error("Error creating group chat:", err);
            alert("Failed to create group chat. Please try again.");
        }
    };

    const handleCreateGroup = () => {
        setIsCreateGroupModalOpen(true);
        setIsModalOpen(true);
        setSearchTerm("");
        setSearchResults([]);
        setGroupName("");
        setSelectedUsers([]);
    };

    const handleNewChat = () => {
        setIsNewChatModalOpen(true);
        setIsModalOpen(true);
        setSearchTerm("");
        setSearchResults([]);
    };

    const handleSecretChats = () => {
        setErrorMsg("");
        setIsSecretModalOpen(true);
        setIsModalOpen(true);
    };

    const handleSecretModalClose = () => {
        setIsSecretModalOpen(false);
        setUserSecretKey("");
        setErrorMsg("");
        setShowSecretKey(false);
        setIsModalOpen(false);
    };

    const handleSecretKeySubmit = () => {
        if (userSecretKey === secretKey) {
            setErrorMsg("");
            navigate("/secret-chat");
            handleSecretModalClose();
        } else {
            setErrorMsg("❌ Invalid secret key. Please try again.");
        }
    };

    const handleNewChatModalClose = () => {
        console.log("new chat")
        setIsNewChatModalOpen(false);
        setIsModalOpen(false);
        setSearchTerm("");
        setSearchResults([]);
    };

    const handleCreateGroupModalClose = () => {
        setIsCreateGroupModalOpen(false);
        setIsModalOpen(false);
        setSearchTerm("");
        setSearchResults([]);
        setGroupName("");
        setSelectedUsers([]);
    };

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    useEffect(() => {
        if (searchTerm.trim() === "") {
            setSearchResults([]);
        }
    }, [searchTerm]);

    const isSelectionMode = selectedChatsForDeletion.length > 0;

    return (
        <div className={`chat-container ${getThemeClasses()} ${isModalOpen ? 'modal-blur' : ''}`}>
            <div className="chat-sidebar">
                <div className="sidebar-header">
                    <div className="header-left">
                        <div className="profile-picture-container">
                            <img
                                src={
                                    base64Image
                                        ? `data:image/jpeg;base64,${base64Image}`
                                        : "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=2"
                                }
                                alt="Profile"
                                className="profile-picture"
                                onClick={handleProfileClick}
                            />
                        </div>
                        <h3>My Chats</h3>
                    </div>
                    <div className="header-controls">
                        <ThemeToggle
                            themeMode={themeMode}
                            onToggle={cycleTheme}
                            getThemeIcon={getThemeIcon}
                            getThemeLabel={getThemeLabel}
                        />
                        <button
                            className="profile-button"
                            onClick={handleProfileClick}
                        >
                            Profile
                        </button>
                    </div>
                </div>

                {isSelectionMode && (
                    <div className="selection-info-bar">
                        <div className="selection-count">
                            <span>{selectedChatsForDeletion.length} selected</span>
                        </div>
                        <div className="selection-actions">
                            <button
                                className="delete-button"
                                onClick={deleteSelectedChats}
                                title="Delete selected chats"
                            >
                                <Trash2 size={18}/>
                            </button>
                            <button
                                className="cancel-selection-button"
                                onClick={clearSelection}
                                title="Cancel selection"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                <div className="group-buttons-row">
                    <button className="group-btn" onClick={handleCreateGroup}>
                        Create Group
                    </button>
                    <button className="group-btn" onClick={handleNewChat}>
                        New Chat
                    </button>
                    <button className="open-btn" onClick={handleSecretChats} disabled={!secretKey}
                            title={!secretKey ? "Secret key not found. Please visit your Profile to set it up." : ""}>
                        Secret Chats
                    </button>
                </div>

                <SearchUsers
                    onChatCreated={handleChatCreated}
                    currentChats={chats}
                    changeCurrentChats={setChats}
                    onModalOpen={() => setIsModalOpen(true)}
                    onModalClose={() => setIsModalOpen(false)}
                    onSearchChange={handleChatFilterChange}
                />

                <div className="chats-list">
                    {getFilteredChats().map((chat) => {
                        console.log('Rendering chat:', chat.withUserName || chat.chatName); // Debug log
                        return (
                            <div
                                key={chat._id}
                                className={`chat-item ${
                                    selectedChat?._id === chat._id && !isSelectionMode ? "selected" : ""
                                } ${selectedChatsForDeletion.includes(chat._id) ? "selected-for-deletion" : ""}`}
                                onClick={() => handleChatSingleClick(chat)}
                                onDoubleClick={() => handleChatDoubleClick(chat._id)}
                                onMouseDown={(e) => handleMouseDown(e, chat)}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseLeave}
                                onTouchStart={(e) => handleTouchStart(e, chat)}
                                onTouchEnd={handleTouchEnd}
                            >
                                {selectedChatsForDeletion.includes(chat._id) && (
                                    <div className="selection-indicator">
                                        ✓
                                    </div>
                                )}
                                <div className="chat-avatar">
                                    <img
                                        src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                                        alt="Chat Avatar"
                                        className="chat-avatar-image"
                                    />
                                </div>
                                <div className="chat-content">
                                    <div className="chat-header">
                                        <strong>{getChatName(chat)}</strong>
                                    </div>
                                    <div className="latest-message">
                                        {getLatestMessage(chat)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="chat-box-area">
                {selectedChat ? (
                    <ChatBox
                        selectedChat={selectedChat}
                        refreshChats={fetchChats}
                        setSelectedChat={setSelectedChat}
                    />
                ) : (
                    <div className="empty-chat-message">
                        <h3>Welcome to Chat!</h3>
                        <p>Select a chat from the sidebar to start messaging</p>
                        <p className="selection-hint">💡 Double-click on any chat to select it for deletion</p>
                        <p className="selection-hint">🔒 Long-press on any chat to move it to secret chats</p>
                    </div>
                )}
            </div>

            {/* Context Menu for Long Press */}
            {showContextMenu && longPressedChat && (
                <div
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`,
                        zIndex: 10001
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="context-menu-item" onClick={handleMoveToSecretChats}>
                        <Shield size={16} />
                        <span>Move to Secret Chats</span>
                    </div>
                    <div
                        className="context-menu-item context-menu-close"
                        onClick={() => {
                            setShowContextMenu(false);
                            setLongPressedChat(null);
                        }}
                    >
                        <X size={16} />
                        <span>Cancel</span>
                    </div>
                </div>
            )}

            {isSecretModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <div className="secret-modal-content">
                            <button
                                className="secret-close-icon"
                                onClick={handleSecretModalClose}
                            >
                                &times;
                            </button>
                            <h2>🔐 Secret Chats</h2>
                            <p>Please enter your secret key to open the secret chats:</p>

                            <div className="secret-input-container">
                                <input
                                    type={showSecretKey ? "text" : "password"}
                                    placeholder="Enter secret key"
                                    value={userSecretKey}
                                    onChange={(e) => setUserSecretKey(e.target.value)}
                                    className="secret-input"
                                />
                                <button
                                    type="button"
                                    className="secret-toggle-btn"
                                    onClick={() => setShowSecretKey(!showSecretKey)}
                                    title={showSecretKey ? "Hide secret key" : "Show secret key"}
                                >
                                    {showSecretKey ? <EyeOff size={20}/> : <Eye size={20}/>}
                                </button>
                            </div>
                            {errorMsg && <div className="secret-error-msg">{errorMsg}</div>}

                            <div className="secret-button-group">
                                <button
                                    className="secret-submit-btn"
                                    onClick={handleSecretKeySubmit}
                                >
                                    Unlock
                                </button>
                                <button
                                    className="secret-close-btn"
                                    onClick={handleSecretModalClose}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isNewChatModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <div className="search-modal-content">
                            <button
                                className="modal-close-icon"
                                onClick={handleNewChatModalClose}
                            >
                                &times;
                            </button>
                            <h2>💬 Start New Chat</h2>
                            <p>Search for users to start a new conversation:</p>

                            <div className="search-input-group">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search users by name or email"
                                    className="search-input"
                                />
                                <button
                                    className="search-btn"
                                    onClick={() => searchUsers(searchTerm)}
                                    disabled={searchLoading}
                                >
                                    {searchLoading ? "Searching..." : "Search"}
                                </button>
                            </div>

                            <div className="search-results">
                                {searchResults.map((user) => (
                                    <div className="result-card" key={user._id}>
                                        <span>
                                            {user.name} ({user.email})
                                        </span>
                                        <button
                                            className="message-btn"
                                            onClick={() => startChat(user)}
                                        >
                                            Message
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isCreateGroupModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <div className="group-modal-content">
                            <button
                                className="modal-close-icon"
                                onClick={handleCreateGroupModalClose}
                            >
                                &times;
                            </button>
                            <h2>👥 Create Group Chat</h2>
                            <p>Enter group name and select users to add:</p>

                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Enter group name"
                                className="group-name-input"
                            />

                            <div className="search-input-group">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search users by name or email"
                                    className="search-input"
                                />
                                <button
                                    className="search-btn"
                                    onClick={() => searchUsers(searchTerm)}
                                    disabled={searchLoading}
                                >
                                    {searchLoading ? "Searching..." : "Search"}
                                </button>
                            </div>

                            {selectedUsers.length > 0 && (
                                <div className="selected-users">
                                    <h4>Selected Users ({selectedUsers.length}):</h4>
                                    <div className="selected-users-list">
                                        {selectedUsers.map(userId => {
                                            const user = searchResults.find(u => u._id === userId);
                                            return user ? (
                                                <span key={userId} className="selected-user-tag">
                                                    {user.name}
                                                    <button onClick={() => toggleUserSelection(userId)}>×</button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="search-results">
                                {searchResults.map((user) => (
                                    <div className={`result-card ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                                         key={user._id}>
                                        <span>
                                            {user.name} ({user.email})
                                        </span>
                                        <button
                                            className={`select-btn ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                                            onClick={() => toggleUserSelection(user._id)}
                                        >
                                            {selectedUsers.includes(user._id) ? "Remove" : "Add"}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="group-button-group">
                                <button
                                    className="create-group-btn"
                                    onClick={createGroupChat}
                                    disabled={groupName.trim() === "" || selectedUsers.length === 0}
                                >
                                    Create Group
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={handleCreateGroupModalClose}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Image Modal */}
            {isProfileImageModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <div className="profile-image-modal-content">
                            <button
                                className="modal-close-icon"
                                onClick={handleProfileImageModalClose}
                            >
                                &times;
                            </button>
                            <div className="profile-image-container">
                                <img
                                    src={
                                        base64Image
                                            ? `data:image/jpeg;base64,${base64Image}`
                                            : "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2"
                                    }
                                    alt="Profile"
                                    className="profile-image-large"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatPage;
