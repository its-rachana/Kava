import React, {useEffect, useState} from "react";
import axios from "axios";
import "./CreateGroupModal.css";

const NewChat = ({ onNewChatCreated }) => {
    const [show, setShow] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    useEffect(() => {
        if (show) fetchAllUsers();
    }, [show]);
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
    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUserClick = async (userId) => {
        setShow(false)
        try {
            const { token } = JSON.parse(localStorage.getItem("userInfo"));
            const config = {
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };
            const { data } = await axios.post(
                process.env.REACT_APP_API_URL+`/api/chat`,
                { userId },
                config
            );
            onNewChatCreated(data);
        } catch (err) {
        }
    };

    return (
        <div>
            <button className="open-btn" onClick={() => setShow(true)}>
                New Chat
            </button>
            {show && (
                <div
                    style={{
                        position: "fixed",
                        top: "10%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#fff",
                        padding: "20px",
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        zIndex: 999,
                        width: "400px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                    }}
                >
                    <h3>Start New Chat</h3>
                    <button
                        onClick={() => setShow(false)}
                        style={{
                            position: "absolute",
                            top: "10px",
                            right: "12px",
                            background: "transparent",
                            border: "none",
                            fontSize: "20px",
                            cursor: "pointer",
                            color: "#333",
                        }}
                    >
                        &times;
                    </button>
                    <input
                        type="text"
                        placeholder="Search users..."
                        style={{
                            width: "100%",
                            padding: "10px",
                            margin: "10px 0",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            boxSizing: "border-box",
                        }}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div
                        style={{
                            maxHeight: "200px",
                            overflowY: "auto",
                            borderTop: "1px solid #eee",
                            paddingTop: "10px",
                        }}
                    >
                        {filteredUsers.map((user) => (
                            <div
                                key={user._id}
                                onClick={() => handleUserClick(user._id)}
                                style={{
                                    padding: "10px 0",
                                    borderBottom: "1px solid #f0f0f0",
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{fontWeight: "500"}}>{user.name}</div>
                                <div style={{fontSize: "0.85em", color: "#666"}}>{user.email}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
};

export default NewChat;
