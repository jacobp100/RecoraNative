// @flow
import React, { Component } from 'react';
import { NavigatorIOS, AsyncStorage } from 'react-native';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import reducer, { loadDocuments, loadDocument } from '../redux';
import DocumentList from './DocumentList';
import DocumentView from './DocumentView';
import persistenceMiddleware from '../redux/persistenceMiddleware';
import recoraMiddleware from '../redux/recoraMiddleware';


const middlewares = applyMiddleware(
  persistenceMiddleware(AsyncStorage),
  recoraMiddleware(),
);
const store = createStore(
  reducer,
  middlewares,
);

export default class App extends Component {
  constructor() {
    super();
    store.dispatch(loadDocuments());
  }

  navigator = null;

  navigateDocument = (documentId) => {
    if (!this.navigator) return;
    store.dispatch(loadDocument(documentId));
    this.navigator.push({
      component: DocumentView,
      passProps: { documentId },
      title: ':D',
    });
  }

  render() {
    return (
      <Provider store={store}>
        <NavigatorIOS
          ref={navigator => { this.navigator = navigator; }}
          initialRoute={{
            component: DocumentList,
            passProps: { navigateDocument: this.navigateDocument },
            title: 'Recora',
          }}
          style={{ flex: 1 }}
        />
      </Provider>
    );
  }
}
