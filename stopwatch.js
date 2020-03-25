const moment = require('moment');

class StopWatch {
  // seconds
  constructorLimit = 0;
  limit = 0;
  // milliseconds
  startedAt = 0;
  paused = false;
  pausedOffset = 0;

  timer;

  // limit is in seconds
  constructor(limit) {
    if(limit !== null) {
      this.constructorLimit = limit;
      this.start();
    }
  }

  pause() {
    this.paused = true;
    this.pausedTime = moment();
  }

  start(limit = this.constructorLimit) {
    this.paused = false;
    this.pausedOffset = 0;
    this.startedAt = moment();
    this.timer = new Promise((resolve, reject) => {
      var interval = setInterval(() => {
        if(!this.paused) console.log(this.getSeconds(moment() - this.pausedOffset - this.startedAt));
        if (
          this.getSeconds(moment() - this.pausedOffset - this.startedAt) >=
            limit &&
          !this.paused
        ) {
          resolve(true);
          clearInterval(interval);
        }
      }, 1000);
    });
  }

  continue () {
    this.paused = false;
    this.pausedOffset += moment() - this.pausedTime;
  }

  stop() {
    this.paused = true;
    this.pausedOffset = 0;
    this.startedAt = 0;
    this.timer = null;
  }

  getSeconds(ms) {
    return Math.floor((ms / 1000) % 60);
  }
}

module.exports = StopWatch;
