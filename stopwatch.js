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

  // // separate function as attribute to make the interval more independant
  // interval = resolve =>
  //   setInterval(() => {
  //     // if (!this.paused) console.log(this.getSeconds());
  //     if (this.getSeconds() >= this.limit && !this.paused) {
  //       resolve(true);

  //       clearInterval(this.interval);
  //     }
  //   }, 1000);

  // limit is in seconds
  constructor(limit) {
    if (limit !== null) {
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
    this.limit = limit;
    this.startedAt = moment();
    this.timer = new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        // if (!this.paused) console.log(this.getSeconds());
        if (this.getSeconds() >= this.limit && !this.paused) {
          resolve(true);
          clearInterval(interval);
        }
      }, 1000);

    });
  }

  getPercent(callback) {
    if (callback) {
      return callback(getSeconds() / limit);
    }
  }

  continue() {
    this.paused = false;
    this.pausedOffset += moment() - this.pausedTime;
  }

  stop() {
    this.paused = true;
    this.pausedOffset = 0;
    this.startedAt = 0;
    this.timer = null;

    clearInterval(this.interval);
  }

  getSeconds() {
    return milliToSeconds(
      moment() -
        this.pausedOffset -
        this.startedAt -
        (this.paused ? this.pausedAt : 0),
    );
  }
}

const milliToSeconds = ms => Math.floor((ms / 1000) % 60);

module.exports = StopWatch;
