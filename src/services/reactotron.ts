import Reactotron from 'reactotron-react-native';

if (__DEV__) {
  Reactotron.configure({name: 'Connectly'})
    .useReactNative()
    .connect();
}

export default Reactotron;
