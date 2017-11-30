window.onload = () => {
  console.log('onload');
  require('./logo_thing').animate({
    objUrl: 'fox.obj',
    // text3d: "'_'",
    container: document.getElementById('threeContainer'),
  });
};

require('./registerServiceWorker').default();
