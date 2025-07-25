import React, { useState } from "react";
import axios from "axios";

const GroupSettingsModal = ({ chat, user, onClose, updateChat, refreshChats }) => {
  const [groupName, setGroupName] = useState(chat.chatName);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const token = JSON.parse(localStorage.getItem("userInfo")).token;
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const isAdmin = chat.groupAdmin.some((admin) => admin._id === user._id);

  const handleRename = async () => {
    try {
      const { data } = await axios.put(
        "http://localhost:5000/api/chat/rename",
        { chatId: chat._id, newName: groupName },
        config
      );
      updateChat(data);
      refreshChats();
    } catch (err) {
      alert("Rename failed");
    }
  };

  const handleSearch = async () => {
    if (!search) return;
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/user?search=${search}`,
        config
      );
      setSearchResults(data);
    } catch (err) {
    }
  };

  const handleAdd = async (userId) => {
    try {
      const { data } = await axios.put(
        "http://localhost:5000/api/chat/add",
        { chatId: chat._id, userId },
        config
      );
      updateChat(data);
      refreshChats();
    } catch (err) {
      alert("Add failed");
    }
  };

  const handleRemove = async (userId) => {
    try {
      const { data } = await axios.put(
          process.env.REACT_APP_API_URL+"/api/chat/group/remove",
        { chatId: chat._id, userId },
        config
      );
      updateChat(data);
      refreshChats();
    } catch (err) {
      alert("Remove failed");
    }
  };

  const handleToggleAdmin = async (userId) => {
    const isCurrentlyAdmin = chat.groupAdmin.some((admin) => admin._id === userId);
    const route = isCurrentlyAdmin
      ? process.env.REACT_APP_API_URL+"/api/chat/group/demote"
      : process.env.REACT_APP_API_URL+"/api/chat/group/promote";

    try {
      const { data } = await axios.put(
        route,
        { chatId: chat._id, userId },
        config
      );
      updateChat(data);
      refreshChats();
    } catch (err) {
      alert("Admin toggle failed");
    }
  };

  const handleDeleteGroup = async () => {
    const confirm = window.confirm("Are you sure you want to delete the group?");
    if (!confirm) return;
    try {
      await axios.delete(process.env.REACT_APP_API_URL+`/api/chat/${chat._id}`, config);
      onClose();
      refreshChats();
    } catch (err) {
      alert("Delete failed");
    }
  };

  return (
    <div style={{ padding: "20px", background: "#fff", borderRadius: "8px" }}>
      <h2>Group Settings</h2>

      <input
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Group name"
      />
      <button onClick={handleRename}>Rename</button>

      <h4>Members:</h4>
      {chat.users.map((u) => (
        <div key={u._id} style={{ marginBottom: "5px" }}>
          {u.name}
          {isAdmin && user._id !== u._id && (
            <>
              <button onClick={() => handleRemove(u._id)}>❌</button>
              <button onClick={() => handleToggleAdmin(u._id)}>
                {chat.groupAdmin.includes(u._id) ? "Demote" : "Promote"}
              </button>
            </>
          )}
        </div>
      ))}

      <h4>Add Users:</h4>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users"
      />
      <button onClick={handleSearch}>Search</button>
      <div>
        {searchResults.map((u) => (
          <div key={u._id}>
            {u.name} <button onClick={() => handleAdd(u._id)}>Add</button>
          </div>
        ))}
      </div>

      {isAdmin && (
        <button
          style={{ marginTop: "20px", color: "red" }}
          onClick={handleDeleteGroup}
        >
          Delete Group
        </button>
      )}

      <br />
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default GroupSettingsModal;
