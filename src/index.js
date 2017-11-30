window.onload = () => {
  console.log('onload');
  require('./logo_thing').animate({
    objUrl: 'fox.obj',
    mtlUrl: 'fox.mtl',

    // objUrl: 'Space_Invader.obj',
    // mtlUrl: 'Space_Invader.mtl',
    // text3d: "'_'",
    container: document.getElementById('threeContainer'),
  });
};

require('./registerServiceWorker').default();
