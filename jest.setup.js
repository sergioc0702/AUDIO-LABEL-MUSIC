/* eslint-env jest */
require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock'),
);
// Exercise the player/controller integration without a native UI runtime.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { Easing, FlatList, Text, View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      Text,
      FlatList,
      createAnimatedComponent: Component => Component,
    },
    Easing,
    ReduceMotion: { System: 'system' },
    useSharedValue: value => React.useRef({ value }).current,
    useAnimatedStyle: read => read(),
    useAnimatedReaction: jest.fn(),
    useAnimatedRef: () => React.useRef(null),
    useAnimatedScrollHandler: jest.fn(),
    useEvent: jest.fn(),
    useFrameCallback: () => ({ setActive: jest.fn() }),
    scrollTo: jest.fn(),
    cancelAnimation: jest.fn(),
    withTiming: (value, _config, onFinish) => {
      onFinish?.(true);
      return value;
    },
    withRepeat: value => value,
    withSequence: (...values) => values[values.length - 1],
    withDelay: (_delay, value) => value,
    useAnimatedProps: read => read(),
  };
});

// Tests never reach the internet; lyrics searches fail as if offline.
global.fetch = jest.fn(() => Promise.reject(new Error('Sin conexión en pruebas')));
