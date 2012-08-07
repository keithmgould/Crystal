/*
  While Crystal uses Require.JS, Crystal mostly runs with lots of files working in a sordid parallel dance.  So while Require.JS promotes
  modules loading eachother, we have to initialize quite a few at the same time.  This is largely a consequence of Crystal's heavy
  use of the mediator pattern, which allows a lot of crosstalk between modules, albeit in a clean encapsulated way.
*/
define(['crystal/server/transporter', 
        'crystal/server/loop',
        'crystal/common/physics',
        'crystal/server/photographer',
        'crystal/server/pingPong'], function (Transporter, Loop, Physics, Photographer, PingPong) {
  var initialize = function (io) {
    Transporter.initialize(io);
    Physics.initialize();  
    Photographer.initialize(true);
    PingPong.initialize();
    Loop.start();
  }
  return {
    initialize: initialize
  }
});