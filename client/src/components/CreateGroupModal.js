import React, { useState } from "react";
import axios from "axios";
import "./CreateGroupModal.css";

const CreateGroupModal = ({ onGroupCreated }) => {
    const [groupName, setGroupName] = useState("");
    const [search, setSearch] = useState("");
    const [results, setResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);

    const handleSearch = async () => {
        if (!search.trim()) return;
        try {
            setLoading(true);
            const { token } = JSON.parse(localStorage.getItem("userInfo"));
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(
                process.env.REACT_APP_API_URL+`/api/user?search=${search}`,
                config
            );
            setResults(data);
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = (user) => {
        if (!selectedUsers.find((u) => u._id === user._id)) {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleRemoveUser = (userId) => {
        setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
    };

    const handleCreate = async () => {
        if (!groupName || selectedUsers.length < 2) {
            alert("Group name and at least 2 members are required.");
            return;
        }

        try {
            const { token } = JSON.parse(localStorage.getItem("userInfo"));
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.post(
                process.env.REACT_APP_API_URL+"/api/chat/group",
                {
                    name: groupName,
                    users: JSON.stringify(selectedUsers.map((u) => u._id)),
                },
                config
            );
            onGroupCreated(data);
            resetForm();
        } catch (err) {
        }
    };

    const resetForm = () => {
        setGroupName("");
        setSearch("");
        setResults([]);
        setSelectedUsers([]);
        setShow(false);
    };

    return (
        <div>
            <button className="open-btn" onClick={() => setShow(true)}>
                New Group Chat
            </button>

            {show && (
                <div className="modal-container">
                    <h3>Create Group Chat</h3>

                    <input
                        type="text"
                        placeholder="Group Name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="input-field"
                    />

                    <div className="search-group">
                        <input
                            type="text"
                            placeholder="Search users"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field"
                        />
                        <button
                            onClick={handleSearch}
                            className="search-btn"
                            disabled={loading}
                        >
                            {loading ? "..." : "Search"}
                        </button>
                    </div>

                    <div className="results-container">
                        {results.map((user) => (
                            <div className="user-row" key={user._id}>
                                <span>{user.name} ({user.email})</span>
                                <button className="add-btn" onClick={() => handleAddUser(user)}>
                                    Add
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="selected-users">
                        <strong>Selected Users:</strong>
                        {selectedUsers.map((user) => (
                            <div className="selected-user" key={user._id}>
                                {user.name}
                                <button
                                    className="remove-btn"
                                    onClick={() => handleRemoveUser(user._id)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="action-buttons">
                        <button className="create-btn" onClick={handleCreate}>
                            Create
                        </button>
                        <button className="cancel-btn" onClick={resetForm}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateGroupModal;
