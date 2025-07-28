import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import EmojiPicker from 'emoji-picker-react';
import { encodeText, decodeText } from '../utilities/textEncoder';
import "./ChatBox.css";

const ChatBox = ({ selectedChat, refreshChats, setSelectedChat }) => {
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showScheduler, setShowScheduler] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, messageId: null });
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [longPressStartPos, setLongPressStartPos] = useState({ x: 0, y: 0 });
    const [showInputActions, setShowInputActions] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const messageEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    useEffect(() => {
        setCurrentUser(userInfo);
        if (!selectedChat) return;

        // Handle both new chats and existing chats - decode messages
        const decodedMessages = (selectedChat.messages || []).map(message => ({
            ...message,
            text: message.text ? decodeText(message.text) : message.text
        }));
        setMessages(decodedMessages);
        // Socket functionality can be added later
    }, [selectedChat]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle clicks outside context menu and modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenu.show && !event.target.closest('.message-context-menu')) {
                setContextMenu({ show: false, x: 0, y: 0, messageId: null });
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                setShowProfileModal(false);
                setContextMenu({ show: false, x: 0, y: 0, messageId: null });
                // Also close any active input modes
                setShowScheduler(false);
                if (isRecording) {
                    stopRecording();
                }
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [contextMenu.show, isRecording]);

    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
            if (longPressTimer) {
                clearTimeout(longPressTimer);
            }
        };
    }, [longPressTimer]);

    const sendMessage = async () => {
        if (!newMsg.trim()) return;

        try {
            // Encode the message text before sending
            const encodedText = encodeText(newMsg);

            const messageData = {
                senderId: currentUser._id,
                withUserId: selectedChat.withUserId?._id || selectedChat.withUserId,
                text: encodedText, // Send encoded text
                attachments: attachments,
                scheduledFor: showScheduler && scheduledDate && scheduledTime
                    ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
                    : null
            };

            // If it's a scheduled message, handle differently
            if (messageData.scheduledFor) {
                // You would typically send this to a different endpoint for scheduling
                console.log('Scheduling message for:', messageData.scheduledFor);
            }

            const { data } = await axios.post(
                process.env.REACT_APP_API_URL+"/api/chat/messages",
                messageData,
                {
                    headers: { Authorization: `Bearer ${userInfo.token}` },
                }
            );

            // Decode the message before adding to local state
            const decodedMessage = {
                ...data.newMessage,
                text: decodeText(data.newMessage.text)
            };

            setMessages((prev) => [...prev, decodedMessage]);
            setNewMsg("");
            setAttachments([]);
            setShowScheduler(false);
            setScheduledDate('');
            setScheduledTime('');
            setShowEmojiPicker(false);
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const onEmojiClick = (emojiObject) => {
        setNewMsg(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false); // Close picker after selection
    };

    const resetAllActions = () => {
        setShowEmojiPicker(false);
        setShowScheduler(false);
        setShowInputActions(false);
        // Stop recording if it's active
        if (isRecording) {
            stopRecording();
        }
    };

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        const newAttachments = files.map(file => ({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        }));
        setAttachments(prev => [...prev, ...newAttachments]);
    };

    const removeAttachment = (index) => {
        setAttachments(prev => {
            const newAttachments = [...prev];
            if (newAttachments[index].preview) {
                URL.revokeObjectURL(newAttachments[index].preview);
            }
            newAttachments.splice(index, 1);
            return newAttachments;
        });
    };

    const startRecording = async () => {
        // Reset other actions and hide input actions bar
        setShowEmojiPicker(false);
        setShowScheduler(false);
        setShowInputActions(false);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const audioChunks = [];

            recorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioFile = new File([audioBlob], `voice-${Date.now()}.wav`, { type: 'audio/wav' });
                setAttachments(prev => [...prev, {
                    file: audioFile,
                    name: audioFile.name,
                    size: audioFile.size,
                    type: audioFile.type,
                    isVoiceNote: true
                }]);
                stream.getTracks().forEach(track => track.stop());
            };

            setMediaRecorder(recorder);
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
            setRecordingTime(0);
            setShowInputActions(true); // Show input actions after recording stops
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
            setRecordingTime(0);
            setShowInputActions(true); // Show input actions after canceling
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }
    };

    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const scheduleMessage = () => {
        if (!scheduledDate || !scheduledTime) {
            alert('Please select both date and time for scheduling');
            return;
        }

        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();

        if (scheduledDateTime <= now) {
            alert('Please select a future date and time');
            return;
        }

        sendMessage();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (showScheduler) {
                scheduleMessage();
            } else {
                sendMessage();
            }
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleLongPressStart = (event, messageId) => {
        const startX = event.touches ? event.touches[0].clientX : event.clientX;
        const startY = event.touches ? event.touches[0].clientY : event.clientY;
        console.log("long press on bubble detected")
        setLongPressStartPos({ x: startX, y: startY });

        const timer = setTimeout(() => {
            setContextMenu({
                show: true,
                x: startX,
                y: startY,
                messageId: messageId
            });
        }, 500); // 500ms long press duration

        setLongPressTimer(timer);
    };

    const handleLongPressEnd = (event) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleLongPressMove = (event) => {
        if (longPressTimer) {
            const currentX = event.touches ? event.touches[0].clientX : event.clientX;
            const currentY = event.touches ? event.touches[0].clientY : event.clientY;

            // If user moves too much, cancel long press
            const moveThreshold = 10;
            if (Math.abs(currentX - longPressStartPos.x) > moveThreshold ||
                Math.abs(currentY - longPressStartPos.y) > moveThreshold) {
                clearTimeout(longPressTimer);
                setLongPressTimer(null);
            }
        }
    };

    const handleContextMenuClick = (event, messageId) => {
        setContextMenu({
            show: true,
            x: event.clientX,
            y: event.clientY,
            messageId: messageId
        });
    };

    const handleMessageClick = (event, messageId) => {
        event.stopPropagation();
        console.log("message clicked for deletiong")
        // Close context menu if clicking on a different message
        if (contextMenu.show && contextMenu.messageId !== messageId) {
            setContextMenu({ show: false, x: 0, y: 0, messageId: null });
        }
    };

    const deleteMessage = async (messageId, deleteType) => {
        try {
            // This would typically make an API call to delete the message
            console.log(`Deleting message ${messageId} with type: ${deleteType}`);

            // For now, just remove from local state
            setMessages(prev => prev.filter(msg => msg._id !== messageId));
            setContextMenu({ show: false, x: 0, y: 0, messageId: null });

            // In a real implementation, you would make an API call like:
            // await axios.delete(`${process.env.REACT_APP_API_URL}/api/chat/messages/${messageId}`, {
            //     data: { deleteType },
            //     headers: { Authorization: `Bearer ${userInfo.token}` }
            // });
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const getChatDisplayName = () => {
        if (selectedChat.isGroupChat) {
            return selectedChat.chatName;
        }
        return selectedChat.withUserName || selectedChat.withUserId?.name || "Unknown User";
    };

    const getUserProfilePicture = () => {
        if (selectedChat.isGroupChat) {
            return selectedChat.groupPicture || "https://images.pexels.com/photos/8761854/pexels-photo-8761854.jpeg?auto=compress&cs=tinysrgb&w=400";
        }
        return selectedChat.withUserId?.profilePhoto || selectedChat.profilePhoto || "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400";
    };

    const handleProfilePictureClick = () => {
        setShowProfileModal(true);
    };

    const handleModalClick = (e) => {
        if (e.target === e.currentTarget) {
            setShowProfileModal(false);
        }
    };

    const shareLocation = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by this browser.');
            return;
        }

        setIsGettingLocation(true);
        setLocationError(null);
        resetAllActions();
        setShowInputActions(false);

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // Cache location for 1 minute
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const accuracy = position.coords.accuracy;

                try {
                    // Create a Google Maps link
                    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                    const locationText = `📍 My Location\n${mapsUrl}\n(Accuracy: ~${Math.round(accuracy)}m)`;

                    // Encode the location text before sending
                    const encodedLocationText = encodeText(locationText);

                    const messageData = {
                        senderId: currentUser._id,
                        withUserId: selectedChat.withUserId?._id || selectedChat.withUserId,
                        text: encodedLocationText, // Send encoded location text
                        attachments: [],
                        isLocation: true,
                        locationData: {
                            latitude,
                            longitude,
                            accuracy,
                            mapsUrl
                        }
                    };

                    const { data } = await axios.post(
                        process.env.REACT_APP_API_URL + "/api/chat/messages",
                        messageData,
                        {
                            headers: { Authorization: `Bearer ${userInfo.token}` },
                        }
                    );

                    // Decode the message before adding to local state
                    const decodedMessage = {
                        ...data.newMessage,
                        text: decodeText(data.newMessage.text)
                    };

                    setMessages((prev) => [...prev, decodedMessage]);
                    setIsGettingLocation(false);
                } catch (err) {
                    console.error("Error sending location:", err);
                    setIsGettingLocation(false);
                    alert('Failed to send location. Please try again.');
                }
            },
            (error) => {
                setIsGettingLocation(false);
                let errorMessage = 'Unable to get your location. ';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access and try again.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out. Please try again.';
                        break;
                    default:
                        errorMessage += 'An unknown error occurred.';
                        break;
                }

                setLocationError(errorMessage);
                alert(errorMessage);
            },
            options
        );
    };

    return (
        <div className="classic-chat-container">
            {selectedChat.isGroupChat && (
                <button className="classic-settings-btn">
                    ⚙️ Group Settings
                </button>
            )}

            <div className="chat-header">
                <div className="chat-header-left">
                    <div
                        className="profile-picture-container"
                        onClick={handleProfilePictureClick}
                    >
                        <img
                            src={getUserProfilePicture()}
                            alt={getChatDisplayName()}
                            className="profile-picture"
                        />
                    </div>
                    <div className="chat-info">
                        <h3 className="classic-chat-heading">
                            Chat with {getChatDisplayName()}
                        </h3>
                        <p className="chat-status">
                            {selectedChat.isGroupChat ? 'Group Chat' : 'Online'}
                        </p>
                    </div>
                </div>
                <button
                    className="close-chat-btn"
                    onClick={() => setSelectedChat(null)}
                    title="Close chat"
                >
                    ×
                </button>
            </div>

            {/* Profile Picture Modal */}
            {showProfileModal && (
                <div className="profile-modal-overlay" onClick={handleModalClick}>
                    <div className="profile-modal-content">
                        <button
                            className="profile-modal-close"
                            onClick={() => setShowProfileModal(false)}
                        >
                            ×
                        </button>
                        <div className="profile-modal-image-container">
                            <img
                                src={getUserProfilePicture()}
                                alt={getChatDisplayName()}
                                className="profile-modal-image"
                            />
                        </div>
                        <div className="profile-modal-info">
                            <h3>{getChatDisplayName()}</h3>
                            <p className="profile-modal-status">
                                {selectedChat.isGroupChat ? 'Group Chat' : 'Direct Message'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="classic-messages-container">
                {messages.map((m) => {
                    const isSender = m?.senderId === currentUser?._id;
                    const senderName = isSender ? "You" : (selectedChat.withUserName || selectedChat.withUserId?.name || "Unknown User");
                    const messageId = m._id || `${m.senderId}-${m.timestamp || Date.now()}`;
                    return (
                        <div
                            key={messageId}
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
                                onClick={(e) => handleMessageClick(e, messageId)}
                                onMouseDown={(e) => handleLongPressStart(e, messageId)}
                                onMouseUp={handleLongPressEnd}
                                onMouseLeave={handleLongPressEnd}
                                onMouseMove={handleLongPressMove}
                                onTouchStart={(e) => handleLongPressStart(e, messageId)}
                                onTouchEnd={handleLongPressEnd}
                                onTouchMove={handleLongPressMove}
                                style={{
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    MozUserSelect: 'none',
                                    msUserSelect: 'none'
                                }}
                            >
                                <div className="classic-message-author">
                                    {senderName}
                                </div>
                                <div className="classic-message-content">
                                    {m.text || ''}
                                </div>
                                {/* Render location messages with clickable links */}
                                {m.isLocation && m.locationData && (
                                    <div className="location-message">
                                        <a
                                            href={m.locationData.mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="location-link"
                                        >
                                            🗺️ Open in Google Maps
                                        </a>
                                    </div>
                                )}
                                <div className="classic-message-time">
                                    {formatTime(m.timestamp || m.createdAt || new Date())}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messageEndRef} />
            </div>

            {/* Context Menu */}
            {contextMenu.show && (
                <div
                    className="message-context-menu"
                    style={{
                        position: 'fixed',
                        left: `${contextMenu.x}px`,
                        top: `${contextMenu.y}px`
                    }}
                >
                    <div
                        className="context-menu-item delete-for-me"
                        onClick={() => deleteMessage(contextMenu.messageId, 'deleteForMe')}
                    >
                        🗑️ Delete for me
                    </div>
                    <div
                        className="context-menu-item delete-for-everyone"
                        onClick={() => deleteMessage(contextMenu.messageId, 'deleteForEveryone')}
                    >
                        ⚠️ Delete for everyone
                    </div>
                </div>
            )}

            {/* Attachments Preview */}
            {showInputActions && attachments.length > 0 && (
                <div className="attachments-preview">
                    {attachments.map((attachment, index) => (
                        <div key={index} className="attachment-item">
                            {attachment.preview && (
                                <img src={attachment.preview} alt="preview" className="attachment-preview-img" />
                            )}
                            {attachment.isVoiceNote && (
                                <div className="voice-note-preview">
                                    🎤 Voice Note
                                </div>
                            )}
                            <div className="attachment-info">
                                <span className="attachment-name">{attachment.name}</span>
                                <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                            </div>
                            <button
                                onClick={() => removeAttachment(index)}
                                className="remove-attachment-btn"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div className="emoji-picker-container">
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
            )}

            <div className="classic-input-container">
                {/* Input Actions Bar - Only show when not recording and not scheduling */}
                {showInputActions && !isRecording && !showScheduler && (
                    <div className="input-actions-bar">
                        <div style={{position: 'relative'}}>
                            <button
                                onClick={() => {
                                    if (showEmojiPicker) {
                                        setShowEmojiPicker(false);
                                    } else {
                                        resetAllActions();
                                        setShowEmojiPicker(true);
                                    }
                                }}
                                className="action-btn emoji-btn"
                                title="Add Emoji"
                            >
                                😊
                            </button>

                            {/* Emoji Picker */}
                            {showEmojiPicker && (
                                <div className="emoji-picker-container">
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        width={300}
                                        height={400}
                                    />
                                </div>
                            )}

                            {/* Emoji Picker */}
                            {showEmojiPicker && (
                                <div className="emoji-picker-container">
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        width={300}
                                        height={400}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                resetAllActions();
                                setShowInputActions(false);
                                fileInputRef.current?.click();
                            }}
                            className="action-btn attachment-btn"
                            title="Attach File"
                        >
                            📎
                        </button>

                        <button
                            onClick={startRecording}
                            className="action-btn voice-btn"
                            title="Record Voice"
                        >
                            🎤
                        </button>

                        <button
                            onClick={() => {
                                resetAllActions();
                                setShowInputActions(false);
                                setShowScheduler(true);
                            }}
                            className="action-btn schedule-btn"
                            title="Schedule Message"
                        >
                            ⏰
                        </button>
                        <button
                            onClick={() => {
                                shareLocation();
                            }}
                            className={`action-btn location-btn ${isGettingLocation ? 'loading' : ''}`}
                            title="Share location"
                            disabled={isGettingLocation}
                        >
                            {isGettingLocation ? (
                                <>
                                    <span className="location-spinner"></span>
                                    Getting location...
                                </>
                            ) : (
                                '📍'
                            )}
                        </button>
                    </div>
                )}

                {/* Recording Interface - Replaces input actions bar */}
                {isRecording && (
                    <div className="recording-interface">
                        <div className="recording-content">
                            <div className="recording-indicator">
                                <span className="recording-dot"></span>
                                <span className="recording-text">Recording...</span>
                                <span className="recording-time">{formatRecordingTime(recordingTime)}</span>
                            </div>
                            <div className="recording-controls">
                                <button
                                    onClick={cancelRecording}
                                    className="recording-btn cancel-recording"
                                    title="Cancel Recording"
                                >
                                    ❌ Cancel
                                </button>
                                <button
                                    onClick={stopRecording}
                                    className="recording-btn stop-recording"
                                    title="Stop Recording"
                                >
                                    ⏹️ Stop
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scheduler Interface - Replaces input actions bar */}
                {showScheduler && (
                    <div className="scheduler-interface">
                        <div className="scheduler-header">
                            <h4>📅 Schedule Message</h4>
                            <button
                                onClick={() => {
                                    setShowScheduler(false);
                                    setShowInputActions(true);
                                }}
                                className="close-scheduler-btn"
                                title="Close Scheduler"
                            >
                                ×
                            </button>
                        </div>
                        <div className="scheduler-inputs">
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="scheduler-input"
                                placeholder="Select date"
                            />
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="scheduler-input"
                                placeholder="Select time"
                            />
                        </div>
                    </div>
                )}

                {/* Main Input Row */}
                <div className="main-input-row">
                    <div className="input-wrapper">
                        <button
                            onClick={() => {
                                if (isRecording || showScheduler) {
                                    // If in recording or scheduling mode, go back to normal
                                    if (isRecording) {
                                        cancelRecording();
                                    }
                                    if (showScheduler) {
                                        setShowScheduler(false);
                                    }
                                    setShowInputActions(true);
                                } else {
                                    setShowInputActions(!showInputActions);
                                }
                            }}
                            className={`toggle-actions-btn-inside ${showInputActions || isRecording || showScheduler ? 'active' : ''}`}
                            title={showInputActions ? 'Hide Actions' : 'Show Actions'}
                        >
                            {isRecording || showScheduler ? '←' : showInputActions ? '−' : '+'}
                        </button>
                        <input
                            type="text"
                            value={newMsg}
                            onChange={(e) => setNewMsg(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={
                                showScheduler
                                    ? "Type message to schedule..."
                                    : isRecording
                                        ? "Voice recording in progress..."
                                        : "Type your message..."
                            }
                            className="classic-input-box"
                            disabled={isRecording}
                        />
                    </div>

                    <button
                        onClick={showScheduler ? scheduleMessage : sendMessage}
                        className="classic-send-button"
                        disabled={(!newMsg.trim() && attachments.length === 0) || isRecording}
                    >
                        {showScheduler ? 'Schedule' : 'Send'}
                    </button>
                </div>

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

export default ChatBox;
