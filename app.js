var http = require('http');
var httpServer;
var moment = require('moment');
var yts = require('yt-search');

const roomDetails = [];

require('dotenv').config();

const defaultConnectionDetails = {
  PORT: 8081,
  HOST: `0.0.0.0`,
};

// Initialize http server
httpServer = http
  .createServer()
  .listen(
    process.env.PORT || defaultConnectionDetails.PORT,
    // process.env.HOST || defaultConnectionDetails.HOST,
  );
console.log('Server running.');

var io = require('socket.io')(httpServer);

io.on('connection', socket => {
  console.log('Socket connected.');
  let roomName = 'default';

  // Socket behavior for single client
  socket.on('joinRoom', path => {
    console.log('user joined room: ' + path);
    roomName = path;
    socket.join(roomName);

    if (!roomDetails[roomName]) {
      roomDetails[roomName] = {
        queue: [],
        playingVideo: {},
        playbackStatus: false,
        video
        // videoStoppedTime: 0,
        // videoStoppedTimeAll: 0,
        // isVideoPlaying: false,
        // stopWatch: 0
      };
    }
    console.log('synchronizing playlist', roomDetails[roomName].queue);
    socket.emit('synchronizePlayList', roomDetails[roomName].queue);
    socket.emit('playbackStatus', roomDetails[roomName].playbackStatus);
  });

  socket.on('search', searchTerm => {
    yts(
      {
        query: searchTerm,
        pageStart: 0,
        pageend: 2,
      },
      (err, r) => {
        if (err) throw new Error(err);
        console.log('searched');
        socket.emit('searchResults', r.videos);
      },
    );
  });
  // END Socket behavior for single client

  // { title, videoId, description, author }
  // Socket behavior for all clients
  socket.on('play', video => {
    roomDetails[roomName].playingVideo = video;
    console.log('playing: ' + video);

    emitToRoom('playVideo', video);
  });

  socket.on('playNext', () => {
    const room = roomDetails[roomName];
    room.playingVideo = roomDetails[roomName].queue[0];
    room.queue.shift();

    emitToRoom('playVideo', room.playingVideo);
    synchronizePlaylist();
  });

  socket.on('addToPlaylist', video => {
    roomDetails[roomName].queue.push(video);
    
    synchronizePlaylist();
  });

  socket.on('setProgress', val => {
    console.log(val);
  })

  socket.on('deleteFromPlaylist', index => {
    const room = roomDetails[roomName];
    if (room.queue[index]) {
      room.queue.splice(index, 1);
    } else {
      console.log('synchronizing playlist');
      socket.emit('synchronizePlayList', room.queue);
    }

    synchronizePlaylist();
  });
  // END Socket behavior for all clients

  // Helper methods emitting to all sockets in the room
  const synchronizePlaylist = () => {
    emitToRoom('synchronizePlayList', roomDetails[roomName].queue);
    roomDetails[roomName].queue.forEach(el => console.log(el.title))
  };

  const emitToRoom = (type, payload) => {
    socket.emit(type, payload);
    io.to(roomName).emit(type, payload);
  };
  // END Helper methods emitting to all sockets in the room
});
