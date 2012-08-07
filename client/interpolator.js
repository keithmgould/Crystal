/*
  Interpolation is the standard trick (since at least 2001) to smooth out an incoming stream of snapshots.  We interpolate
  between the last two snapshots at a rate much higher than the rate we receive snapshots, and still have a smooth experience.
  Crystal uses Smooth.JS for interpolation.
*/
define(['crystal/client/lib/smooth', 'underscore'], function (Smooth, _) {
  
  var delay = 100; // Ms

  var initialize = function () {
    this.__defineGetter__("delay", function () {
      return delay;
    });
    this.__defineSetter__("delay", function (val) {
      delay = val;
    });
  }

  var interpolate = function (snapshots, fromTime, toTime) {
    var path = Smooth(snapshots, {
      method: Smooth.METHOD_CUBIC, 
      clip: Smooth.CLIP_ZERO, 
      cubicTension: Smooth.CUBIC_TENSION_CATMULL_ROM,
      scaleTo: [fromTime, toTime]
    });

    var point = path(toTime - delay);
    var snapshot = {
      x: point[0],
      y: point[1],
      a: point[2]
    }
    return snapshot;
  }

  return {
    initialize: initialize,
    interpolate: interpolate
  };
});