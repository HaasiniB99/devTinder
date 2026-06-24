#!/usr/bin/env node

const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const sampleImageUrl =
  "https://res.cloudinary.com/demo/image/upload/sample.jpg";

const run = async () => {
  const uploadResult = await cloudinary.uploader.upload(sampleImageUrl, {
    folder: "devtinder-onboarding",
  });

  console.log("Uploaded image secure URL:");
  console.log(uploadResult.secure_url);
  console.log("Uploaded image public ID:");
  console.log(uploadResult.public_id);

  const details = await cloudinary.api.resource(uploadResult.public_id);

  console.log("Image metadata:");
  console.log(`width: ${details.width}`);
  console.log(`height: ${details.height}`);
  console.log(`format: ${details.format}`);
  console.log(`bytes: ${details.bytes}`);

  const transformedUrl = cloudinary.url(uploadResult.public_id, {
    secure: true,
    fetch_format: "auto", // f_auto lets Cloudinary choose the best image format for the browser.
    quality: "auto", // q_auto lets Cloudinary optimize compression quality automatically.
  });

  console.log(
    "Done! Click link below to see optimized version of the image. Check the size and the format."
  );
  console.log(transformedUrl);
};

run().catch((err) => {
  console.error("Cloudinary onboarding failed:", err.message);
  process.exit(1);
});
