// @flow
import React from 'react';
import { AsyncStorage } from 'react-native';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import reducer, { setCustomUnits } from '../redux';
import Recora from './Recora';
import cacheInvalidationMiddleware from '../redux/cacheInvalidationMiddleware';
import persistenceMiddleware from '../redux/persistenceMiddleware';
import recoraMiddleware from '../redux/recoraMiddleware';
import quickCalculationMiddleware from '../redux/quickCalculationMiddleware';
import fetchCurrencies from '../fetchCurrencies';


const middlewares = applyMiddleware(
  // ({ getState }) => next => (action) => {
  //   const returnValue = next(action);
  //   console.log(getState());
  //   return returnValue;
  // },
  cacheInvalidationMiddleware(),
  persistenceMiddleware(AsyncStorage),
  recoraMiddleware(),
  quickCalculationMiddleware()
);
const store = createStore(
  reducer,
  middlewares,
);

fetchCurrencies()
  .then(customUnits => store.dispatch(setCustomUnits(customUnits)));

export default () => (
  <Provider store={store}>
    <Recora />
  </Provider>
);
