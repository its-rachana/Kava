const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User" // Assuming there's a User model
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
});

const conversationSchema = new mongoose.Schema({
    withUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    withUserName: {
        type: String,
        required: true
    },
    messages: {
        type: [messageSchema],
        default: []
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const userChatSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    conversations: {
        type: [conversationSchema],
        default: []
    },
    __v: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("UserChats", userChatSchema);
