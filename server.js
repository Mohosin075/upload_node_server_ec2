// server.js
const dotenv = require("dotenv");
const express = require("express");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const fs = require("fs");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// AWS S3 client (v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer setup for local temp storage
const upload = multer({
  dest: "uploads/",
});

// Function to upload file to S3
const uploadFileToS3 = async (file) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${Date.now()}_${file.originalname}`,
    Body: fs.createReadStream(file.path),
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(params));

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};

// Multi-file upload route
app.post("/upload", upload.array("files", 10), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({
      message: "No files uploaded!",
    });
  }

  try {
    // Upload all files to S3
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const fileUrl = await uploadFileToS3(file);
        fs.unlinkSync(file.path); // delete local file
        return {
          originalName: file.originalname,
          url: fileUrl,
        };
      })
    );

    res.json({
      message: "Files uploaded successfully!",
      files: uploadedFiles,
    });
  } catch (error) {
    // Cleanup any remaining files
    files.forEach((file) => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });

    return res.status(500).json({
      message: "Error uploading files",
      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("Server is live 🚀");
});

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
