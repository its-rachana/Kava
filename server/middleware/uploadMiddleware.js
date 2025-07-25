const multer = require("multer");

// Use memory storage so you get the file as buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;
