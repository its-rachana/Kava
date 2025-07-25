const express = require("express");
const router = express.Router();
const {
    fetchSecretChats,
    addMessageToConversation,
    initiateNewSecretChat,
    fetchIndividualSecretChats} = require("../controllers/secretChatController");
const { protect } = require("../middleware/authMiddleware");

router.route("/")
    .get(protect, fetchSecretChats);
router.route("/fetchcurrentchatmessages")
    .get(protect,fetchIndividualSecretChats)
router.route("/messages")
    .post(protect, addMessageToConversation)
router.route("/initiatechat")
    .post(protect, initiateNewSecretChat)
module.exports = router;
