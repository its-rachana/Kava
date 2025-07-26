import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import EmojiPicker from 'emoji-picker-react';
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
    const messageEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    useEffect(() => {
        setCurrentUser(userInfo);
        if (!selectedChat) return;

        // Handle both new chats and existing chats
        setMessages(selectedChat.messages || []);
        // Socket functionality can be added later
    }, [selectedChat]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle clicks outside context menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenu.show && !event.target.closest('.message-context-menu')) {
                setContextMenu({ show: false, x: 0, y: 0, messageId: null });
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenu.show]);

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
            const messageData = {
                senderId: currentUser._id,
                withUserId: selectedChat.withUserId?._id || selectedChat.withUserId,
                text: newMsg,
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


            setMessages((prev) => [...prev, data.newMessage]);
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

    // Helper function to get chat display name
    const getChatDisplayName = () => {
        if (selectedChat.isGroupChat) {
            return selectedChat.chatName;
        }
        return selectedChat.withUserName || selectedChat.withUserId?.name || "Unknown User";
    };

    return (
        <div className="classic-chat-container">
            {selectedChat.isGroupChat && (
                <button className="classic-settings-btn">
                    ⚙️ Group Settings
                </button>
            )}

            <h3 className="classic-chat-heading">
                Chat with {getChatDisplayName()}
            </h3>

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
                                    {m.text}
                                </div>
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
            {attachments.length > 0 && (
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

            {/* Scheduler */}
            {showScheduler && (
                <div className="scheduler-container">
                    <h4>Schedule Message</h4>
                    <div className="scheduler-inputs">
                        <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="scheduler-input"
                        />
                        <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="scheduler-input"
                        />
                    </div>
                    <div className="scheduler-actions">
                        <button onClick={scheduleMessage} className="schedule-btn">
                            Schedule
                        </button>
                        <button onClick={() => setShowScheduler(false)} className="cancel-schedule-btn">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="classic-input-container">
                {/* Input Actions Bar */}
                <div className="input-actions-bar">
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
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
                    </div>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="action-btn attachment-btn"
                        title="Attach File"
                    >
                        📎
                    </button>

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`action-btn voice-btn ${isRecording ? 'recording' : ''}`}
                        title={isRecording ? 'Stop Recording' : 'Record Voice'}
                    >
                        {isRecording ? '⏹️' : '🎤'}
                        {isRecording && <span className="recording-time">{formatRecordingTime(recordingTime)}</span>}


                    </button>

                    <button
                        onClick={() => setShowScheduler(!showScheduler)}
                        className={`action-btn schedule-btn ${showScheduler ? 'active' : ''}`}
                        title="Schedule Message"
                    >
                        ⏰
                    </button>
                </div>

                {/* Main Input Row */}
                <div className="main-input-row">
                    <input
                        type="text"
                        value={newMsg}
                        onChange={(e) => setNewMsg(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="classic-input-box"
                    />

                    <button
                        onClick={showScheduler ? scheduleMessage : sendMessage}
                        className="classic-send-button"
                        disabled={!newMsg.trim() && attachments.length === 0}
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
