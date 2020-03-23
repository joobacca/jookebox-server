class Room {
  path = '';
  queue = [];
  playingVideo = {};
  playingVideoTime = 0;
  playingVideoDuration = 0;
  videoStoppedTime = 0;
  videoStoppedTimeAll = 0;
  isVideoPlaying = false;
  stopWatch = 0;

  constructor(path) {
    console.log('room created');
    this.path = path;
  }
}

module.exports = Room;