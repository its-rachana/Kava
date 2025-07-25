const express = require("express");
const router = express.Router();
const {
    fetchSecretChats,
    addMessageToConversation,
    initiateNewSecretChat,
    fetchIndividualSecretChats} = require("../controllers/secretChatController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, fetchSecretChats);            //done
router.route("/fetchcurrentchatmessages").get(protect,fetchIndividualSecretChats)   //done

router.route("/messages").post(protect, addMessageToConversation)           //done
router.route("/initiatechat").post(protect, initiateNewSecretChat)          //done
module.exports = router;
