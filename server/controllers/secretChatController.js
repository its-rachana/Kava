const asyncHandler = require("express-async-handler");
const SecretUserChat = require("../models/SecretChat");
const mongoose = require("mongoose");

const fetchSecretChats = asyncHandler(async (req, res) => {

    if (!req.query.userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        const userChat = await SecretUserChat.findOne({
            _id: req.query.userId
        }).populate({
            path: "conversations.withUserId",
            select: "name email pic",
            model: "User"
        }).lean();

        if (!userChat) {
            return res.status(200).json([]);
        }

        return res.status(200).json(userChat.conversations || []);
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
});

const addMessageToConversation = asyncHandler(async (req, res) => {
    const {senderId,text, withUserId} = req.body;

    if (!senderId || !text) {
        return res.status(400).json({
            success: false,
            message: "_id, withUserId, senderId, and text are all required fields"
        });
    }

    try {
        const chat = await SecretUserChat.findOne({ _id: new mongoose.Types.ObjectId(senderId) });
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat document not found"
            });
        }

        const conversation = chat.conversations.find(conv =>
            conv.withUserId.toString() === withUserId
        );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation with specified user not found"
            });
        }

        const newMessage = {
            senderId,
            text,
            timestamp: new Date(),
            read: false
        };

        conversation.messages.push(newMessage);
        conversation.lastUpdated = new Date();

        await chat.save();

        return res.status(201).json({
            success: true,
            message: "Message added successfully",
            newMessage,
            conversation
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to add message",
            error: error.message
        });
    }
});

const fetchIndividualSecretChats = asyncHandler(async(req,res)=>{

    if (!req.query.currentUser) {
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        const userChat = await SecretUserChat.findOne({
            _id: req.query.currentUser
        }).populate({
            path: "conversations.withUserId",
            select: "name email pic",
            model: "User"
        }).lean();
        const targetWithUserId = req.query.withUserId;

        const matchedConversation = userChat?.conversations?.find(convo =>
            convo.withUserId?._id?.toString() === targetWithUserId
        );
        if (!userChat) {
            return res.status(200).json([]);
        }

        return res.status(200).json(matchedConversation || []);
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
});
const initiateNewSecretChat = asyncHandler(async (req, res) => {
    const { currentUser, newUser } = req.body;
    if (!currentUser || !newUser._id || !newUser.name) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const objectId = new mongoose.Types.ObjectId(newUser._id);

    const userChat = await SecretUserChat.findOne({ _id: new mongoose.Types.ObjectId(currentUser) });

    if (!userChat) {
        return res.status(404).json({ error: "User not found." });
    }

    const existingConversation = userChat.conversations.find(
        (c) => c.withUserId.toString() === newUser._id
    );

    if (existingConversation) {
        return res.status(200).json({ message: "Conversation already exists", conversation: existingConversation });
    }

    const newConversation = {
        withUserId: new mongoose.Types.ObjectId(newUser._id),
        withUserName: newUser.name,
        messages: [],
        lastUpdated: new Date()
    };

    userChat.conversations.push(newConversation);
    await userChat.save();
    const response = {
        lastUpdated:newConversation.lastUpdated,
        messages:newConversation.messages,
        withUserId:{
            name:newConversation.withUserName,
            _id: newConversation.withUserId
        },
        withUserName:newConversation.withUserName

    }
    res.status(201).json({ message: "New conversation initiated", conversation: response });
});

module.exports = {
    fetchSecretChats,
    addMessageToConversation,
    initiateNewSecretChat,
    fetchIndividualSecretChats };
