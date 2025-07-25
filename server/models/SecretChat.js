const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const messageSchema = new Schema(
    {
        senderId: {
            type: Types.ObjectId,
            required: true
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
            required: true
        }
    },
    { _id: false }
);

const conversationSchema = new Schema(
    {
        withUserId: {
            type: Types.ObjectId,
            required: true
        },
        withUserName: {
            type: String,
            required: true
        },
        messages: {
            type: [messageSchema],
            required: true
        },
        lastUpdated: {
            type: Date,
            required: true
        }
    },
    { _id: false }
);

const secretChatSchema = new Schema(
    {
        _id: {
            type: Types.ObjectId,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        conversations: {
            type: [conversationSchema],
            required: true
        }
    }
);

module.exports = mongoose.model("SecretChat", secretChatSchema);
