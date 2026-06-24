const express = require("express");
const upload = require("../middlewares/upload");
const cloudinary = require("../utils/cloudinary");
const { userAuth } = require("../middlewares/auth");

const router = express.Router();

router.post("/", userAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "auto",
    });

    res.json({
      url: result.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      resourceType: result.resource_type,
    });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
