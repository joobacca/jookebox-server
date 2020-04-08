const moment = require('moment');

class StopWatch {
  // seconds
  limit = 0;
  pausedAt = 0;
  pausedOffset = 0;
  setTimeOffset = 0;

  // milliseconds
  startedTime = 0;
  pausedTime = 0;

  paused = false;
  timer;

  savedInterval;

  // // separate function as attribute to make the interval more independant
  interval(resolve, callback) {
    let i = 0;
    return setInterval(() => {
      console.log(' interval still going: \n', this.getSeconds(), this.limit);
      if (callback && !this.paused) callback();
      if (this.getSeconds() >= this.limit) {
        resolve(true);
        clearInterval(this.savedInterval);
      }
    }, 1000);
  }

  // limit is in seconds
  constructor(limit, callback) {
    if (limit !== undefined) {
      this.start(limit, callback);
    }
  }

  start(limit, callback) {
    clearInterval(this.savedInterval);
    this.paused = false;
    this.pausedAt = 0;
    this.pausedOffset = 0;
    this.setTimeOffset = 0;
    // adding one second to limit because... buffer....
    this.limit = limit + 1;
    this.startedTime = moment();
    this.timer = new Promise((resolve, reject) => {
      this.savedInterval = this.interval(resolve, callback);
    });
  }

  setTime(time) {
    this.setTimeOffset += this.getSeconds() - time;
  }

  pause() {
    this.pausedAt = this.getSeconds();
    this.pausedTime = moment();
    this.paused = true;
  }

  continue() {
    this.paused = false;
    this.pausedAt = 0;
    this.pausedOffset += moment() - this.pausedTime;
  }

  stop() {
    this.paused = true;
    this.pausedAt = 0;
    this.pausedOffset = 0;
    this.startedTime = 0;
    if(this.timer) this.timer.resolve();

    clearInterval(this.savedInterval);
  }

  getSeconds() {
    return this.paused
      ? this.pausedAt
      : milliToSeconds(moment() - this.pausedOffset - this.startedTime) -
          this.setTimeOffset;
  }
}

const milliToSeconds = (ms) => Math.floor(ms / 1000);

module.exports = StopWatch;
