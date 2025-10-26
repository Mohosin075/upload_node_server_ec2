// server.ts
import  configDotenv  from "dotenv";
import express from "express";

import AWS from "aws-sdk";
import multer from "multer";
import fs from "fs";

configDotenv.config();
const app = express();
const PORT = 5000;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});


const upload = multer({
    dest : 'uploads/'
})


const uploadFileToS3 = async(file)=>{
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${Date.now()}_${file.originalname}`,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
    }
   return await s3.upload(params).promise();
}

app.post("/upload",upload.single("file"), async (req, res) => {
    const file = req.file
    if (!file) {
        return res.status(400).json({
            message : "File not found!"
        })
    }
   try {
     const data = await uploadFileToS3(file);

    //  delete local file
     fs.unlinkSync(file.path);

     res.json({
        message : "File uploaded successfully!",
        fileUrl : data.Location
     })

   } catch (error) {

    if(fs.existsSync(file.path))
    //  delete local file
     fs.unlinkSync(file.path);
    return res.status(500).json({
        message: "Error uploading file",
        error: error.message,
      });
   }
})

app.get("/",  (req, res) => {
  res.send("Server is live 🚀");
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
