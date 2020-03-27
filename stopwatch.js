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

  savedInterval;

  // // separate function as attribute to make the interval more independant
  interval(resolve) {
    return setInterval(() => {
      console.log('interval still going:', this.getSeconds());
      if (this.getSeconds() >= this.limit) {
        resolve(true);
        clearInterval(this.savedInterval);
      }
    }, 1000);
  }

  // limit is in seconds
  constructor(limit) {
    console.log('limit: ', limit);
    if (limit !== undefined) {
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
    // adding one second to limit because... buffer....
    this.limit = limit + 1;
    this.startedAt = moment();
    this.timer = new Promise((resolve, reject) => {
      this.savedInterval = this.interval(resolve);
    });
  }

  setTime(time) {
    const now = this.getSeconds();
    this.pausedOffset =
      now > time
        ? this.pausedOffset + now - time
        : this.pausedOffset - now - time;
        console.log(this.pausedOffset);
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

    clearInterval(this.savedInterval);
  }

  getSeconds() {
    return this.paused
      ? false
      : milliToSeconds(moment() - this.pausedOffset - this.startedAt);
  }
}

const milliToSeconds = ms => Math.floor(ms / 1000);

module.exports = StopWatch;
