const yts = require('yt-search');
const StopWatch = require('./stopwatch');
const fs = require('fs');

const roomDetails = [];

require('dotenv').config();

var server;

if (process.env.ENV === 'development') {
  // Initialize http server
  const http = require('http');
  server = http.createServer();
} else {
  // or https server
  const https = require('https');
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT),
  };
  server = https.createServer(options);
}
server.listen(8081);
console.log('Server running.');

var io = require('socket.io').listen(server, { origins: '*:*' });

io.on('connection', (socket) => {
  console.log('Socket connected.');
  let roomName = 'default';
  let userName = '';

  // Socket behavior for single client
  socket.on('joinRoom', ({ room: roomNameClient, id }) => {
    roomName = roomNameClient;
    userName = id;

    if (!roomDetails[roomName]) {
      roomDetails[roomName] = {
        queue: [],
        playingVideo: {},
        playbackState: false,
        stopwatch: new StopWatch(),
        userList: [],
      };
    }

    if (!socket.rooms[roomName]) {
      socket.join(roomName);
      console.log('user joined room: ' + roomName);
      roomDetails[roomName].userList.push(userName);
    }

    socket.emit('synchronizePlayList', roomDetails[roomName].queue);
    socket.emit('playVideo', roomDetails[roomName].playingVideo);
    socket.emit('playbackState', roomDetails[roomName].playbackState);
    socket.emit('setProgress', roomDetails[roomName].stopwatch.getSeconds());
    socket.emit('synchronizeUserList', roomDetails[roomName].userList);
  });

  // @@TODO destroy room object on last leave
  socket.on('disconnect', () => {
    const list = roomDetails[roomName].userList;
    if (list) list.splice(list.indexOf(userName));
  });

  socket.on('search', (searchTerm) => {
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
  socket.on('toggle', () => {
    if (roomDetails[roomName].playbackState) {
      roomDetails[roomName].playbackState = false;
      roomDetails[roomName].stopwatch.pause();
      // roomDetails[roomName].pausedAt = roomDetails[roomName].stopwatch.getSeconds();
    } else {
      roomDetails[roomName].playbackState = true;
      roomDetails[roomName].stopwatch.continue();
    }

    emitToRoom('toggle', roomDetails[roomName].playbackState);
  });

  socket.on('play', (video) => {
    playNext(video);
  });

  socket.on('playNext', () => playNext());

  socket.on('addToPlaylist', (video) => {
    roomDetails[roomName].queue.push(video);

    synchronizePlaylist();
  });

  // socket.on('setProgress', (val) => {
  //   roomDetails[roomName].stopwatch.setTime(val);
  //   emitToRoomExceptHimself('setTime', val);
  // });

  socket.on('deleteFromPlaylist', (index) => {
    if (roomDetails[roomName].queue[index]) {
      roomDetails[roomName].queue.splice(index, 1);
    }

    synchronizePlaylist();
  });

  socket.on('clearInterval', () => {
    roomDetails[roomName].stopwatch.clearInt();
  });
  // END Socket behavior for all clients

  // Helper methods emitting to all sockets in the room
  const playNext = (video) => {
    roomDetails[roomName].stopwatch.stop();
    if (!video && roomDetails[roomName].queue.length === 0) {
      console.log('empty playlist, will delete current video');
      emitToRoom('emptyPlayback');
      synchronizePlaylist();
      return;
    }
    roomDetails[roomName].playingVideo = video
      ? video
      : roomDetails[roomName].queue[0];
    if (!video) {
      roomDetails[roomName].queue.shift();
    }
    if (roomDetails[roomName].playingVideo) {
      emitToRoom('playVideo', roomDetails[roomName].playingVideo);

      const synchronizeProgress = () => {
        emitToRoom('setTime', roomDetails[roomName].stopwatch.getSeconds());
      };

      roomDetails[roomName].playbackState = true;
      console.log('video set, let"ts start watching'); 
      roomDetails[roomName].stopwatch = new StopWatch(
        roomDetails[roomName].playingVideo.duration,
        synchronizeProgress,
      );
      roomDetails[roomName].stopwatch.timer.then(() => playNext());
    }

    synchronizePlaylist();
  };

  const synchronizePlaylist = () => {
    emitToRoom('synchronizePlayList', roomDetails[roomName].queue);
  };

  const emitToRoomExceptHimself = (type, payload) => {
    socket.emit(type, payload);
    io.to(roomName).emit(type, payload);
  };

  const emitToRoom = (type, payload) => {
    socket.emit(type, payload);
    io.to(roomName).emit(type, payload);
  };
  // END Helper methods emitting to all sockets in the room
});
