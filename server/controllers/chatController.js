const asyncHandler = require("express-async-handler");
const User = require("../models/Users");
const UserChats = require("../models/UserChats");
const mongoose = require("mongoose");
const {async} = require("nodemon");

const addMessageToConversation = asyncHandler(async (req, res) => {
    const {senderId, text, withUserId} = req.body;

    if (!senderId || !text) {
        return res.status(400).json({
            success: false,
            message: "_id, withUserId, senderId, and text are all required fields"
        });
    }

    try {
        const chat = await UserChats.findOne({_id: new mongoose.Types.ObjectId(senderId)});
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

const fetchChats = asyncHandler(async (req, res) => {

    if (!req.query.userId) {
        return res.status(400).json({message: "User ID is required"});
    }

    try {
        const userChat = await UserChats.findOne({
            _id: req.query.userId
        }).populate({
            path: "conversations.withUserId",
            select: "name email pic",
            model: "User"
        }).lean();

        if (!userChat) {
            return res.status(200).json([]);
        }

        return res.status(200).json(userChat || []);
    } catch (error) {
        return res.status(500).json({message: "Server error"});
    }
});
const createGroupChat = asyncHandler(async (req, res) => {
    const {name, users} = req.body;
    if (!name || !users) return res.status(400).json({message: "All fields required"});

    const parsedUsers = JSON.parse(users);
    if (parsedUsers.length < 2) return res.status(400).json({message: "Minimum 3 members required"});

    parsedUsers.push(req.user._id);

    const groupChat = await Chat.create({
        chatName: name,
        users: parsedUsers,
        isGroupChat: true,
        groupAdmin: [req.user._id],
    });

    const fullGroup = await Chat.findById(groupChat._id)
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    res.status(201).json(fullGroup);
});

const renameGroupChat = asyncHandler(async (req, res) => {
    const {chatId, newName} = req.body;
    if (!chatId || !newName) return res.status(400).json({message: "Missing chatId or name"});

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({message: "Chat not found"});

    const isAdmin = chat.groupAdmin.some(adminId => adminId.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({message: "Only admins can rename group"});

    chat.chatName = newName;
    await chat.save();

    const updated = await Chat.findById(chatId)
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    res.json(updated);
});

const addToGroup = asyncHandler(async (req, res) => {
    const {chatId, userId} = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({message: "Chat not found"});

    const isAdmin = chat.groupAdmin.includes(req.user._id.toString());
    if (!isAdmin) return res.status(403).json({message: "Only admins can add users"});

    if (chat.users.includes(userId)) return res.status(400).json({message: "User already in group"});

    chat.users.push(userId);
    await chat.save();

    const updated = await Chat.findById(chatId)
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    res.json(updated);
});

const promoteAdmin = asyncHandler(async (req, res) => {
    const {chatId, userId} = req.body;

    if (!chatId || !userId) {
        return res.status(400).json({message: "chatId and userId are required"});
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return res.status(404).json({message: "Chat not found"});
    }

    const isRequesterAdmin = chat.groupAdmin.some(
        (id) => id.toString() === req.user._id.toString()
    );
    if (!isRequesterAdmin) {
        return res.status(403).json({message: "Only admins can promote"});
    }

    chat.groupAdmin = [...new Set([...chat.groupAdmin.map(id => id.toString()), userId])];
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    res.json(updatedChat);
});

const demoteAdmin = asyncHandler(async (req, res) => {
    const {chatId, userId} = req.body;

    if (!chatId || !userId) {
        return res.status(400).json({message: "chatId and userId are required"});
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return res.status(404).json({message: "Chat not found"});
    }

    const isRequesterAdmin = chat.groupAdmin.some(
        (id) => id.toString() === req.user._id.toString()
    );
    if (!isRequesterAdmin) {
        return res.status(403).json({message: "Only admins can demote"});
    }

    chat.groupAdmin = chat.groupAdmin.filter(id => id.toString() !== userId);
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    res.json(updatedChat);
});

const removeFromGroup = asyncHandler(async (req, res) => {
    const {chatId, userId} = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({message: "Chat not found"});

    const isAdmin = chat.groupAdmin.some(admin => admin.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({message: "Only admins can remove users"});

    chat.users = chat.users.filter(id => id.toString() !== userId);
    chat.groupAdmin = chat.groupAdmin.filter(id => id.toString() !== userId);
    await chat.save();

    const updated = await Chat.findById(chatId)
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    res.json(updated);
});

const deleteGroup = asyncHandler(async (req, res) => {
    const {chatId} = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({message: "Group not found"});

    const isAdmin = chat.groupAdmin.some(id => id.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({message: "Only admins can delete groups"});

    await Chat.findByIdAndDelete(chatId);
    res.status(200).json({message: "Group deleted successfully"});
});

const deleteIndividualChat = asyncHandler(async (req, res) => {
    const {chatId} = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({message: "Chat not found"});

    if (chat.isGroupChat) {
        return res.status(400).json({message: "This route is for individual chats only"});
    }
    const isParticipant = chat.users.some(user => user.toString() === req.user._id.toString());
    if (!isParticipant) {
        return res.status(403).json({message: "You are not authorized to delete this chat"});
    }

    await Chat.findByIdAndDelete(chatId);
    res.status(200).json({message: "Chat deleted successfully"});
});
const initiateNewChat = asyncHandler(async (req, res) => {
    const {newUser, currentUser} = req.body;

    if (!newUser || !currentUser) {
        return res.status(400).json({message: "Missing required fields"});
    }

    try {
        const newConversation = {
            withUserId: newUser._id,
            withUserName: newUser.name,
            messages: [],
            lastUpdated: new Date()
        };

        const result = await UserChats.updateOne(
            {_id: currentUser},
            {$push: {conversations: newConversation}},
            {upsert: true}
        );

        return res.status(200).json({
            message: "New chat initiated",
            result
        });
    } catch (error) {
        console.error("Error adding conversation:", error);
        return res.status(500).json({message: "Server error"});
    }
});

const addConversationToChat = asyncHandler(async (req, res) => {
    const {newUser, currentUser} = req.body;

    if (!newUser || !currentUser) {
        return res.status(400).json({message: "Missing required fields"});
    }

    try {
        const chat = await UserChats.findOne({ _id: new mongoose.Types.ObjectId(senderId) });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat document not found"
            });
        }

        // Check if conversation with same user already exists
        const existing = chat.conversations.find(conv =>
            conv.withUserId.toString() === withUserId
        );

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Conversation with this user already exists"
            });
        }

        const newConversation = {
            withUserId: newUser._id,
            withUserName: newUser.name,
            messages: [],
            lastUpdated: new Date()
        };


        chat.conversations.push(newConversation);
        await chat.save();

        return res.status(201).json({
            success: true,
            message: "Conversation added successfully",
            newConversation
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to add conversation",
            error: error.message
        });
    }
});

module.exports = { addConversationToChat };

module.exports = {
    fetchChats,
    createGroupChat,
    renameGroupChat,
    addToGroup,
    removeFromGroup,
    promoteAdmin,
    demoteAdmin,
    deleteGroup,
    deleteIndividualChat,
    addMessageToConversation,
    initiateNewChat
};

