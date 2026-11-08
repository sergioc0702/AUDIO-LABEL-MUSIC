import { Easing } from 'react-native';

export const motionEasing = {
  enter: Easing.bezier(0.16, 1, 0.3, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
  loop: Easing.inOut(Easing.sin),
};

export const motionDuration = {
  feedback: 120,
  state: 200,
  exit: 200,
  enter: 320,
  sheetEnter: 240,
  sheetExit: 160,
};
