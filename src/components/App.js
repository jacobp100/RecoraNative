// @flow
import React from 'react';
import { AsyncStorage, AppState } from 'react-native';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import reducer from '../redux';
import Recora from './Recora';
import cacheInvalidationMiddleware from '../redux/cacheInvalidationMiddleware';
import currencyUpdaterMiddleware from '../redux/currencyUpdaterMiddleware';
import persistenceMiddleware from '../redux/persistenceMiddleware';
import recoraMiddleware from '../redux/recoraMiddleware';
import quickCalculationMiddleware from '../redux/quickCalculationMiddleware';


const middlewares = applyMiddleware(
  // ({ getState }) => next => (action) => {
  //   const returnValue = next(action);
  //   console.log(getState());
  //   return returnValue;
  // },
  cacheInvalidationMiddleware(),
  currencyUpdaterMiddleware(AppState),
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
