/*
  The client side game loop.  This is the heartbeat, and runs around 60 times per second.
  performTickCheck ensures we keep our 60 Hz accurate.
*/
define(['crystal/common/api', 'crystal/common/physics', 'underscore'], function (CrystalApi, Physics, _) {
  var request = window.requestAnimationFrame       ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
                function( callback ){
                  window.setTimeout(callback, 1000 / 60);
                };

  var tickCount = 0,
      updateInterval = 1000 / 60,
      startedAt;

  var accurateInterval = function () {
    while(performTickCheck()){
      update();
      tickCount++;
    }
    request(accurateInterval);
  }

  var performTickCheck = function () {
    var nextTickAt = (tickCount * updateInterval) + startedAt;
    return (nextTickAt <= Date.now());
  }

  var update = function () {
    CrystalApi.Publish('update', {tickCount: tickCount});
  }

  var initialize = function () {
    startedAt = Date.now();
    request(accurateInterval);
  }

  return {
    initialize: initialize
  };
});
