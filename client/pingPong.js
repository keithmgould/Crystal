/* 
  PingPong Keeps track of Lag.  It shoots a ping to the server and sees how long it takes to get a pong.
  This is not used in Crystal, but its here for clients who want it.
*/
define(['crystal/common/api'], function (CrystalApi) {

  var lags = [], 
      avgLag = 0;

  var initialize = function () {
    // Send out a ping once per second
    CrystalApi.Subscribe("update", function (data) {
      if(data.tickCount % 60 === 0){
        CrystalApi.Publish("messageToServer", {
          target: 'crystal', 
          type: 'ping', 
          message: Date.now()
        });
      }
    });

    // Listen for Pongs
    CrystalApi.Subscribe("messageFromServer:crystal", function (data) {
      if(data.type != "pong"){ return; }
      var lag = Date.now() - data.message;
      pushNewLag(lag);
    });
  }

  var pushNewLag = function (lag) {
    lags.push(lag);
    if(lags.length > 5) {
        lags.shift();
    }

    updateAvgLag();
    CrystalApi.Publish("crystalDebug", {type: "lagInfo", avgLag: avgLag, lastLag: lag});
  }

  var updateAvgLag = function () {
    sum = _.reduce(lags, function(memo, num){ return memo + num; }, 0);
    avgLag = sum / lags.length;
  }

  return {
    initialize: initialize
  };
});