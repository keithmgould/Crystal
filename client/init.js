/*
  While Crystal uses Require.JS, Crystal mostly runs with lots of files working in a sordid parallel dance.  So while Require.JS promotes
  modules loading eachother, we have to initialize quite a few at the same time.  This is largely a consequence of Crystal's heavy
  use of the mediator pattern, which allows a lot of crosstalk between modules, albeit in a clean encapsulated way.
*/
define(['crystal/client/transporter',
        'crystal/client/loop',
        'crystal/client/selfEntityManager',
        'crystal/client/otherEntitiesManager',
        'crystal/common/physics',
        'crystal/client/pingPong',
        'crystal/client/interpolator'], function (Transporter, Loop, SelfEntityManager, OtherEntitiesManager, Physics, PingPong, Interpolator) {

  var initialize = function () {
    Transporter.initialize();
    Physics.initialize();
    SelfEntityManager.initialize();
    OtherEntitiesManager.initialize();
    Loop.initialize();
    PingPong.initialize();
    Interpolator.initialize();
  }

  return {
    initialize: initialize
  }
});
