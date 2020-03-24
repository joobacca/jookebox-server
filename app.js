var http = require('http');
var httpServer;
// var moment = require('moment');
var yts = require('yt-search');

const roomDetails = [];

require('dotenv').config();

// Initialize http server
httpServer = http.createServer();

console.log('Server running.');

var io = require('socket.io').listen(httpServer, { origins: '*:*'});
httpServer.listen(8081);

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
        playbackState: false,
        videoPausedAt: 0,
        videoStartedAt: 0,
        // videoStoppedTime: 0,
        // videoStoppedTimeAll: 0,
        // isVideoPlaying: false,
        // stopWatch: 0
      };
    }

    const room = roomDetails[roomName];
    console.log('synchronizing playlist', room.queue);
    socket.emit('synchronizePlayList', room.queue);
    if(room.playbackState) {
      socket.emit('playAt', )
    }
    socket.emit('playbackState', room.playbackState);
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
  socket.on('toggle', ({ playbackState, time }) => {
    const room = roomDetails[roomName];
    room.playbackState = !playbackState;
    room.videoPausedAt = time;

    emitToRoom('toggle', {
      state: room.playbackState,
      time: room.videoPausedAt,
    });
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
  });

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
    roomDetails[roomName].queue.forEach(el => console.log(el.title));
  };

  const emitToRoom = (type, payload) => {
    socket.emit(type, payload);
    io.to(roomName).emit(type, payload);
  };
  // END Helper methods emitting to all sockets in the room
});
