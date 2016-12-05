// @flow
import React, { Component } from 'react';
import { NavigatorIOS } from 'react-native';
import { connect } from 'react-redux';
import { get } from 'lodash/fp';
import DocumentList from './DocumentList';
import DocumentView from './DocumentView';
import Settings from './Settings';


class Recora extends Component {
  getRouteFor = (documentId) => {
    let documentView = null;
    return {
      component: DocumentView,
      passProps: {
        ref: ref => { documentView = ref; },
        documentId,
        refreshRoute: () => this.replaceDocument(documentId),
      },
      title: get(documentId, this.props.documentTitles),
      rightButtonSystemIcon: 'edit',
      onRightButtonPress: () => {
        if (documentView) documentView.getWrappedInstance().showEditModal();
      },
    };
  }

  navigateDocument = (documentId) => {
    if (this.navigator) this.navigator.push(this.getRouteFor(documentId));
  }

  navigateSettings = () => {
    if (this.navigator) {
      this.navigator.push({
        component: Settings,
        title: 'Settings',
      });
    }
  }

  replaceDocument = (documentId) => {
    // FIXME: This does not work.
    if (!this.navigator) return;
    const currentRoute = this.navigator.navigationContext.currentRoute;
    currentRoute.title = get(documentId, this.props.documentTitles);
    this.navigator.replaceAtIndex(currentRoute, 1);
  }

  navigator = null;

  render() {
    return (
      <NavigatorIOS
        ref={navigator => { this.navigator = navigator; }}
        initialRoute={{
          component: DocumentList,
          passProps: {
            navigateDocument: this.navigateDocument,
            navigateSettings: this.navigateSettings,
          },
          navigationBarHidden: true,
          title: 'Documents',
        }}
        style={{ flex: 1 }}
      />
    );
  }
}

export default connect(
  state => ({
    documentTitles: state.documentTitles,
  }),
)(Recora);
