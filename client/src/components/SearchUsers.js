import React, {useState, useEffect} from "react";
import "./SearchUsers.css";

const SearchUsers = ({onChatCreated, currentChats, changeCurrentChats, onModalOpen, onModalClose, onSearchChange}) => {
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Notify parent component about search term changes
        onSearchChange(searchTerm);
    }, [searchTerm]);

    return (
        <div className="search-users-container">
            <div className="search-input-group">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter chats by name..."
                    className="search-input"
                />
            </div>
        </div>
    );
};

export default SearchUsers;
