class StopWatch {
  limit = 0;
  currentTime = 0;
  paused = false;

  timer;
  savedInterval;
  savedCallback;

  // separate function as attribute to make the interval more independant
  interval(resolve) {
    return setInterval(() => {
      if(!this.paused) {
        this.currentTime += 1;
        if(this.savedCallback) {
          this.savedCallback();
        }
      }
      if (this.currentTime >= this.limit) {
        resolve(true);
        clearInterval(this.savedInterval);
      }
    }, 1000);
  }

  // limit is in seconds
  constructor(limit = 0, callback = () => {}) {
    this.limit = limit;
    this.savedCallback = callback;
  }

  start() {
    clearInterval(this.savedInterval);
    this.currentTime = 0;
    this.paused = false;
    this.timer = new Promise((resolve, reject) => {
      this.savedInterval = this.interval(resolve);
    });
  }

  setTime(time) {
    this.currentTime = time;
  }

  pause() {
    this.paused = true;
  }

  continue() {
    this.paused = false;
  }

  stop() {
    this.paused = true;
    clearInterval(this.savedInterval);
  }

  getSeconds() {
    return this.currentTime;
  }
}

module.exports = StopWatch;
