const yts = require('yt-search');
const StopWatch = require('./stopwatch');
const http = require('http');

const roomDetails = [];

require('dotenv').config();

const server = http.createServer();
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
    console.log(id, ' joined room');

    if (!roomDetails[roomName]) {
      roomDetails[roomName] = {
        queue: [],
        playingVideo: {},
        playbackState: false,
        stopwatch: new StopWatch(),
        userList: [],
      };
      console.log('room created');
    }

    socket.join(roomName);
    console.log('user joined room: ' + roomName);
    roomDetails[roomName].userList.push(userName);
    emitToRoom('synchronizeUserList', roomDetails[roomName].userList);
    socket.emit('synchronizePlayList', roomDetails[roomName].queue);
    socket.emit('playVideo', roomDetails[roomName].playingVideo);
    socket.emit('toggle', roomDetails[roomName].playbackState);
    socket.emit('setTime', roomDetails[roomName].stopwatch.getSeconds());
    socket.emit('joinedRoom');
  });

  // @@TODO destroy room object on last leave
  socket.on('disconnect', () => {
    if (roomDetails[roomName]) {
      const list = roomDetails[roomName].userList;
      if (list) list.splice(list.indexOf(userName), 1);
      emitToRoomExceptHimself(
        'synchronizeUserList',
        roomDetails[roomName].userList,
      );
      if (list.length === 0) {
        clearRoom();
      }
    }

    // get rid of event listeners
    Object.keys(socket._events).forEach((ev) => {
      socket.listeners(ev).forEach((callback) => {
        socket.off(ev, callback);
      });
    });
  });

  socket.on('synchronizeApp', () => {
    if (roomDetails[roomName]) {
      socket.emit('synchronizePlayList', roomDetails[roomName].queue);
      socket.emit('playVideo', roomDetails[roomName].playingVideo);
      socket.emit('toggle', roomDetails[roomName].playbackState);
      socket.emit('setTime', roomDetails[roomName].stopwatch.getSeconds());
      console.log('sent details out');
    }
  });

  socket.on('getUserList', () => {
    socket.emit('synchronizeUserList', roomDetails[roomName].userList);
  });

  socket.on('getPlayList', () => {
    socket.emit('synchronizePlayList', roomDetails[roomName].queue);
  });

  socket.on('search', (searchTerm) => {
    console.log('searched!');
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

  socket.on('setProgress', (val) => {
    const room = roomDetails[roomName];
    if (room) room.stopwatch.setTime(val);
    emitToRoomExceptHimself('setTime', val);
  });

  socket.on('deleteFromPlaylist', (index) => {
    if (roomDetails[roomName].queue[index]) {
      roomDetails[roomName].queue.splice(index, 1);
    }

    synchronizePlaylist();
  });

  // END Socket behavior for all clients

  // Helper methods emitting to all sockets in the room
  const playNext = (video) => {
    const room = roomDetails[roomName];
    if (room.stopwatch) room.stopwatch.stop();
    if (!video && room.queue.length === 0) {
      console.log('empty playlist, will delete current video');
      emitToRoom('emptyPlayback');
      synchronizePlaylist();
      return;
    }
    room.playingVideo = video ? video : room.queue[0];
    if (!video) {
      room.queue.shift();
    }

    if (room.playingVideo) {
      emitToRoom('playVideo', room.playingVideo);
      room.playbackState = true;
      room.stopwatch = new StopWatch(room.playingVideo.duration, () => {
        emitToRoom('synchronizeProgress', room.stopwatch.getSeconds());
      });
      room.stopwatch.start();
      room.stopwatch.timer.then(() => playNext());
    }

    synchronizePlaylist();
  };

  const clearRoom = () => {
    const room = roomDetails[roomName];
    room.stopwatch.stop();
    roomDetails[roomName] = null;
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
