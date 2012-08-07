/*
  The server side game loop.  This is the heartbeat, and runs around 60 times per second.
*/

define(['crystal/common/api'], function (CrystalApi) {
  var updateInterval = 1000 / 60,     // how many MS before another call to update()
      tickCount = 0,                  // how many ticks have transpired
      startedAt;                      // Time the loop started

  var start = function () {
    startedAt = Date.now();
    accurateInterval();
  }

  var accurateInterval = function () {
    var next, nextTickAt;
    update();
    tickCount++;
    nextTickAt = Math.round((tickCount * updateInterval) + startedAt);
    next = nextTickAt - Date.now();
    if(next < 0) {next = 0;}
    setTimeout(accurateInterval, next);
  }

  var update = function () {
    CrystalApi.Publish("update", {tickCount: tickCount});
  };

  return {
    start: start
  };

});
