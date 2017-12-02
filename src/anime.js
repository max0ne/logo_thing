import _ from 'lodash';

/**
 * animation curve functions found here
 * https://gist.github.com/gre/1650294
 */
export const animationCurveFunctions = {
  // no easing, no acceleration
  linear: function (t) { return t },
  // accelerating from zero velocity
  easeInQuad: function (t) { return t * t },
  // decelerating to zero velocity
  easeOutQuad: function (t) { return t * (2 - t) },
  // acceleration until halfway, then deceleration
  easeInOutQuad: function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t },
  // accelerating from zero velocity 
  easeInCubic: function (t) { return t * t * t },
  // decelerating to zero velocity 
  easeOutCubic: function (t) { return (--t) * t * t + 1 },
  // acceleration until halfway, then deceleration 
  easeInOutCubic: function (t) { return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1 },
  // accelerating from zero velocity 
  easeInQuart: function (t) { return t * t * t * t },
  // decelerating to zero velocity 
  easeOutQuart: function (t) { return 1 - (--t) * t * t * t },
  // acceleration until halfway, then deceleration
  easeInOutQuart: function (t) { return t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t },
  // accelerating from zero velocity
  easeInQuint: function (t) { return t * t * t * t * t },
  // decelerating to zero velocity
  easeOutQuint: function (t) { return 1 + (--t) * t * t * t * t },
  // acceleration until halfway, then deceleration 
  easeInOutQuint: function (t) { return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t }
};

/**
 * guess an animation duration for an animation from `current` to `target`
 * @param {number[]} current 
 * @param {number[]} target 
 * @return {number}
 */
function _estimateAnimationDuration(current, target) {
  // euclidian distance / step
  return _euclidianDistance(current, target) / 5;
}

/**
 * @param {number[]} from 
 * @param {number[]} to 
 * @return | to - from |
 */
function _euclidianDistance(from, to) {
  const vec = _vectorDiff(from, to);
  return Math.sqrt(_.sum(vec.map((vv) => vv * vv)));
}

/** 
 * @param {number[]} from 
 * @param {number[]} to 
 * @return {number[]} to - from
 */
function _vectorDiff(from, to) {
  return to.map((tt, idx) => tt - from[idx]);
}

/** 
 * @param {number[]} from 
 * @param {number[]} to 
 * @return {number[]} to + from
 */
function _vecSum(one, two) {
  return one.map((oo, idx) => oo + two[idx]);
}

/**
 * @param {number[]} vec
 * @return {number[]} unit vector
 */
function _unitVector(vec) {
  const sum = _euclidianDistance(vec, [0, 0, 0]);
  return vec.map((vv) => vv / sum);
}

/**
 * @param {number[]} vec
 * @param {number} scalar
 * @return {number[]}
 */
function _vecTimesScalar(vec, scalar) {
  return vec.map((vv) => vv * scalar);
}

/**
 * apply an animation curve from `current` to `target`, each frame increment by value of `curveFunction`,
 * animation is applied by `applyFrame` function, and `applyFrame` is supposed to ask to continue to next frame by calling
 * its param `pushFrame`
 * 
 * returns an handle object to start / cancel this animation
 * 
 * @param {number[]} current 
 * @param {number[]} target
 * @param {function} curveFunction a animation curve function that maps timing values 0 -> 1 to animation curve value 0 -> 1
 * @param {function} applyFrame
 * @param {number[]} applyFrame.nextCurrent
 * @return {object} animation control
 */
export function animationCurve(current, target, curveFunction, applyFrame) {
  let currentFrame = 0;
  let cancelled = false;
  const initial = current;
  const animationFrames = _estimateAnimationDuration(current, target);

  // if less than 1 frame needed, just apply the frame to avoid super small number problems
  if (animationFrames < 1) {
    applyFrame(target, () => { });
    return { start: () => { }, cancel: () => { } };
  }

  const direction = _unitVector(_vectorDiff(current, target));
  const distance = _euclidianDistance(current, target);
  const pushFrame = () => {
    if (cancelled) {
      return;
    }
    else if (currentFrame >= 1) {
      return;
    } else {
      currentFrame += 1 / animationFrames;
    }

    const nextTraveledDistance = Math.min(curveFunction(currentFrame), 1) * distance;
    const nextTraveledVector = _vecTimesScalar(direction, nextTraveledDistance);
    const nextCurrent = _vecSum(nextTraveledVector, initial);
    current = nextCurrent;
    applyFrame(current, pushFrame);
  };

  return {
    start: pushFrame,
    cancel: () => cancelled = true
  };
}
