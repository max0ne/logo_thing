window.onload = () => {
  console.log('onload');
  require('./logo_thing').animate({
    objUrl: 'fox.obj',
    container: document.getElementById('threeContainer'),
  });
};

require('./registerServiceWorker').default();
