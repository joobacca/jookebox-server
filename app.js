var http = require('http');
var httpServer;
var moment = require('moment');
var yts = require('yt-search');
var StopWatch = require('./stopwatch');

const roomDetails = [];

require('dotenv').config();

// Initialize http server
httpServer = http.createServer();

console.log('Server running.');


// Timer test

// const Timer = new StopWatch(5);
// Timer.timer.then(res => {
//   console.log(res);
//   Timer.stop();
// });

// setTimeout(() => Timer.pause(), 2000);

// setTimeout(() => Timer.continue(), 4000);

var io = require('socket.io').listen(httpServer, { origins: '*:*' });
httpServer.listen(8081, { origins: '*:*' });

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
        videoStartedAt: 0,
        videoOffset: 0,
      };
    }

    const room = roomDetails[roomName];

    socket.emit('synchronizePlayList', room.queue);
    // if(room.playbackState) {
    //   socket.emit('playAt', )
    // }
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

    if(room.playbackState) {
      room.playbackState = false;
    } else {
      play(room.playingVideo, room.videoOffset, false);
    }
    emitToRoom('toggle', {
      state: room.playbackState,
      time: room.videoOffset,
    });
  });

  socket.on('playNext', () => {
    const room = roomDetails[roomName];

    const video = roomDetails[roomName].queue[0];
    room.queue.shift();

    play(video);
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
      socket.emit('synchronizePlayList', room.queue);
    }

    synchronizePlaylist();
  });
  // END Socket behavior for all clients

  // Helper methods emitting to all sockets in the room
  const play = (video, offset = 0, initial = false) => {
    const room = roomDetails[roomName];

    room.videoStartedAt = initial ? moment() : room.videoStartedAt;
    room.playbackState = true;
    room.playingVideo = video;
    room.videoOffset = offset;

    emitToRoom('play', { video, offset });
  };

  const synchronizePlaylist = () => {
    emitToRoom('synchronizePlayList', roomDetails[roomName].queue);
  };

  const emitToRoom = (type, payload) => {
    socket.emit(type, payload);
    io.to(roomName).emit(type, payload);
  };
  // END Helper methods emitting to all sockets in the room
});
