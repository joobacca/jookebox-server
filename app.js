var http = require("http");
var https = require("https");
var httpServer;
var moment = require("moment");
require("dotenv").config();

// const API_KEY = "AIzaSyAxEfvaZOZla24lYRhSOhUrOTroiTNfyVE";

const defaultConnectionDetails = {
  PORT: 5000,
  HOST: `0.0.0.0`
};

httpServer = http
  .createServer(() =>
    console.log(
      process.env.PORT || defaultConnectionDetails.PORT,
      process.env.HOST || defaultConnectionDetails.HOST
    )
  )
  .listen(
    process.env.PORT || defaultConnectionDetails.PORT,
    process.env.HOST || defaultConnectionDetails.HOST
  );
console.log("Server running.");

var io = require("socket.io")(httpServer);

io.on("connection", socket => {
  console.log("Socket connected.");
  socket.on("joinRoom", path => {
    console.log("user joined room: " + path);
  });
});
