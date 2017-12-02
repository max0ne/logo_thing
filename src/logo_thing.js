import GyroNorm from 'gyronorm';
import _ from 'lodash';
import THREEMLTLoader from 'three-mtl-loader';
import * as anime from './anime';

const THREE = require('three');
require('three-obj-loader')(THREE);

/**
 * listener {function}
 */
function observeMouse(listener) {
  const oldMouseMove = document.onmousemove;
  document.onmousemove = (...params) => {
    oldMouseMove && oldMouseMove(...params);

    let event = params[0];
    let eventDoc, doc, body;

    event = event || window.event; // IE-ism

    // If pageX/Y aren't available and clientX/Y are,
    // calculate pageX/Y - logic taken from jQuery.
    // (This is to support old IE)
    if (event.pageX == null && event.clientX != null) {
      eventDoc = (event.target && event.target.ownerDocument) || document;
      doc = eventDoc.documentElement;
      body = eventDoc.body;

      event.pageX = event.clientX +
        ((doc && doc.scrollLeft) || (body && body.scrollLeft) || 0) -
        ((doc && doc.clientLeft) || (body && body.clientLeft) || 0);
      event.pageY = event.clientY +
        ((doc && doc.scrollTop) || (body && body.scrollTop) || 0) -
        ((doc && doc.clientTop) || (body && body.clientTop) || 0);
    }
    listener(event.pageX, event.pageY);
  }
}

function observeGyro(listener) {
  const gn = new GyroNorm();
  let initialBeta, initialGamma;
  let lastBeta, lastGamma;
  gn.init().then(() => {
    gn.start((data) => {
      if (_.isNil(initialBeta)) {
        initialBeta = data.do.beta;
        initialGamma = data.do.gamma;
      } else {
        const {beta, gamma} = data.do;
        if (lastBeta === beta && lastGamma === gamma) {
          return;
        }
        lastBeta = beta;
        lastGamma = gamma;
        listener({
          beta: beta - initialBeta,
          gamma: gamma - initialGamma,
        });
      }
    });
  });
}

/**
 * find center of element
 * @param {object} findElementCenter
 * @return {object}
 */
function findElementCenter(element) {
  let rec = element.getBoundingClientRect();
  return {
    x: rec.left + rec.width / 2,
    y: rec.top + rec.height / 2
  };
}

/**
 * @param {string} objUrl url to `.obj` file
 * @param {string} mtlUrl url to `.mtl` file - optional
 * @param {function} callback
 * @return {promise}
 */
function loadObject(objUrl, mtlUrl, callback) {
  const loadObj = (mtl) => {
    const loader = new THREE.OBJLoader();
    loader.materials = mtl;
    loader.load(
      // resource URL
      objUrl,

      // pass the loaded data to the onLoad function.
      //Here it is assumed to be an object
      callback.bind(null, null),

      // Function called when download progresses
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },

      // Function called when download errors
      callback.bind(null)
    );
  };

  if (_.isFunction(mtlUrl)) {
    callback = mtlUrl;
    loadObj(null);
  } else {
    const mtlLoader = new THREEMLTLoader();
    mtlLoader.load(mtlUrl, loadObj);
  }
  
}

/**
 * setup scene to render
 * @param {Document.Element} container
 * @param {THREE.Object3D} obj 
 * @return {object} foxlook, foxrotate
 */
function renderThreeScene(containerDom, obj) {
  let scene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(75, containerDom.clientWidth / containerDom.clientHeight, 0.1, 1000);

  scene.background = new THREE.Color(0xffffff);

  let renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(containerDom.clientWidth, containerDom.clientHeight);
  containerDom.appendChild(renderer.domElement);

  scene.add(obj);
  const boundingBox = new THREE.Box3().setFromObject(obj);

  'xyz'.split('').forEach((axis) => {
    obj.position[axis] = - (boundingBox.max[axis] + boundingBox.min[axis]) / 2;
  });

  const cameraZ = (boundingBox.max.z - boundingBox.min.z) * 15;
  camera.position.z = 500; //cameraZ;

  const addLight = (xx, yy) => {
    let spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(xx, yy, 100);

    spotLight.castShadow = true;

    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;

    spotLight.shadow.camera.near = 500;
    spotLight.shadow.camera.far = 4000;
    spotLight.shadow.camera.fov = 30;

    scene.add(spotLight);
  };
  addLight(-500, -100);
  addLight(500, 100);

  // render first frame
  renderer.render(scene, camera);

  let currentLookAt = [0, 0, 0];
  let cancelPreviousAnimation = null;
  const foxlook = (...lookatXYZ) => {
    // remove previous animation if exist
    cancelPreviousAnimation && cancelPreviousAnimation();

    // apply new look by an animation curve
    const animation = anime.animationCurve(currentLookAt, lookatXYZ, anime.animationCurveFunctions.easeOutCubic, (nextLookat, continueFrame) => {
      currentLookAt = nextLookat;
      obj.lookAt(...nextLookat);
      requestAnimationFrame(() => {
        renderer.render(scene, camera);
        continueFrame();
      });
    });

    cancelPreviousAnimation = animation.cancel;
    animation.start();
  };
  const rad = (deg) => deg / 180 * Math.PI;
  const foxrotate = (beta, gamma) => {
    obj.rotation.x = rad(beta);
    obj.rotation.y = rad(gamma);
    requestAnimationFrame(() => {
      renderer.render(scene, camera);
    });
  };

  return { foxlook, foxrotate };
}

/**
 * @param {object} config
 * @param {THREE.Object3D} config.obj3d 3d object to render - optional
 * @param {string} config.text3d text to render - optional
 * @param {string} config.objUrl url to `.obj` file
 * @param {string} config.mtlUrl url to `.mtl` file - optional
 * @param {HTMLElement} config.container dom container
 */
export function animate(config) {
  // eslint-disable-next-line
  const { objUrl, mtlUrl, container, obj3d, text3d } = config;
  if (obj3d) {
    applyObj3d(obj3d);
  } else if (text3d) {
    new THREE.FontLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/fonts/helvetiker_regular.typeface.json',
      (font) => {
        const geometry = new THREE.TextGeometry(text3d, {
          font,
          size: 100,
          height: 1,
          curveSegments: 1,
          bevelEnabled: true,
          bevelThickness: 1,
          bevelSize: 8,
          bevelSegments: 1
        });

        const textMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0 }));
        applyObj3d(textMesh);
      });
  } else if (objUrl) {
    loadObject(objUrl, mtlUrl, (err, foxobj) => {
      if (err) {
        console.error(err);
        return;
      }
      applyObj3d(foxobj);
    });
  } else {
    console.error('one of', 'objUrl', 'obj3d', 'text3d', 'required');
  }

  /**
   * @param {THREE.Object3D} obj 
   */
  function applyObj3d(obj) {
    const { foxlook, foxrotate } = renderThreeScene(container, obj);
    observeMouse((mouseX, mouseY) => {
      const { x: elementX, y: elementY } = findElementCenter(container);
      foxlook(mouseX - elementX, elementY - mouseY, 100);
      window.foxlook = foxlook;
    })

    observeGyro(({beta, gamma}) => {
      foxrotate(beta, gamma);
    });
  }
}
