// @flow
import React from 'react';
import { AsyncStorage } from 'react-native';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import reducer from '../redux';
import Recora from './Recora';
import persistenceMiddleware from '../redux/persistenceMiddleware';
import recoraMiddleware from '../redux/recoraMiddleware';
import quickCalculationMiddleware from '../redux/quickCalculationMiddleware';


const middlewares = applyMiddleware(
  // ({ getState }) => next => (action) => {
  //   const returnValue = next(action);
  //   console.log(getState());
  //   return returnValue;
  // },
  persistenceMiddleware(AsyncStorage),
  recoraMiddleware(),
  quickCalculationMiddleware()
);
const store = createStore(
  reducer,
  middlewares,
);

export default () => (
  <Provider store={store}>
    <Recora />
  </Provider>
);
