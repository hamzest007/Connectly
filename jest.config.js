module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-image-picker$': '<rootDir>/__mocks__/react-native-image-picker.ts',
    '^react-native-get-random-values$': '<rootDir>/__mocks__/react-native-get-random-values.js',
  },
};
