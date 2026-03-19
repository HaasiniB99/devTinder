const mongoose = require("mongoose");
 
const connectDB = async () => {
  // console.log(process.env.DB_CONNECTION_SECRET);
  await mongoose.connect(process.env.DB_CONNECTION_SECRET);
  console.log("MongoDB connected successfully");

};

module.exports = connectDB;
