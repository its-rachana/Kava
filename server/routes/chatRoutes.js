const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/chatController");

const { protect } = require("../middleware/authMiddleware");

router.post("/initiate-chat",protect, initiateNewChat);
router.get("/",protect, fetchChats);
router.post("/messages", protect, addMessageToConversation)


router.put("/remove", protect, deleteIndividualChat);

router.post("/group", protect, createGroupChat);

router.put("/rename", protect, renameGroupChat);

router.put("/add", protect, addToGroup);
router.put("/group/remove", protect, removeFromGroup);

router.put("/group/promote", protect, promoteAdmin);
router.put("/group/demote", protect, demoteAdmin);

router.delete("/:chatId", protect, deleteGroup);

module.exports = router;
