const moment = require('moment');
const yts = require('yt-search');
const StopWatch = require('./stopwatch');
const fs = require('fs');

const roomDetails = [];

require('dotenv').config();


var server;
if(process.env.ENV === 'development') {
  const http = require('http');
  server = http.createServer();
} else {
  // Initialize http server
  const https = require('https');
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT),
  }
  server = https.createServer(options);
}

console.log('Server running.');

// Timer test

// const Timer = new StopWatch(5);
// Timer.timer.then(res => {
//   console.log(res);
//   Timer.stop();
// });

// setTimeout(() => Timer.pause(), 2000);

// setTimeout(() => Timer.continue(), 4000);

var io = require('socket.io').listen(server, { origins: '*:*' });
server.listen(8081);

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
        stopwatch: new StopWatch(),
        userList: []
      };
    }

    const room = roomDetails[roomName];

    socket.emit('synchronizePlayList', room.queue);
    socket.emit('playVideo', room.playingVideo);
    socket.emit('playbackState', room.playbackState);
    socket.emit('setProgress', room.stopwatch.getSeconds());
    socket.emit('synchronizeUserList', room.userList);
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
        socket.emit('searchResults', r.videos);
      },
    );
  });
  // END Socket behavior for single client

  // { title, videoId, description, author }
  // Socket behavior for all clients
  socket.on('toggle', ({ playbackState }) => {
    const room = roomDetails[roomName];

    if (room.playbackState) {
      room.playbackState = false;
      room.stopwatch.pause();
      // room.pausedAt = room.stopwatch.getSeconds();
    } else {
      room.playbackState = true;
      room.stopwatch.continue();
    }

    emitToRoom('toggle', {
      state: room.playbackState,
    });
  });

  socket.on('play', video => {
    playNext(video);
  });

  socket.on('playNext', () => playNext());

  socket.on('addToPlaylist', video => {
    roomDetails[roomName].queue.push(video);

    synchronizePlaylist();
  });

  socket.on('setProgress', val => {
    emitToRoom('setProgress', val);
    // nvm it was easy all along lmao
  });

  socket.on('deleteFromPlaylist', index => {
    const room = roomDetails[roomName];

    if (room.queue[index]) {
      room.queue.splice(index, 1);
    }

    synchronizePlaylist();
  });
  // END Socket behavior for all clients

  // Helper methods emitting to all sockets in the room
  const playNext = video => {
    const room = roomDetails[roomName];
    if(!video && room.queue.length === 0) {
      console.log('empty playlist, will delete current video');
      emitToRoom('emptyPlayback');
        synchronizePlaylist();
        return;
    }
    room.playingVideo = video ? video : room.queue[0];
    if(!video) {
      room.queue.shift();
    }
    if (room.playingVideo) {
      room.playbackState = true;
      room.stopwatch = new StopWatch(room.playingVideo.duration);
      room.stopwatch.timer.then(() => playNext());
    }

    emitToRoom('playVideo', room.playingVideo);
    synchronizePlaylist();
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
