// @flow
import React, { Component } from 'react';
import { Modal, WebView } from 'react-native';
import { flow, split, map, fromPairs } from 'lodash/fp';

export const redirectUri = 'about:blank';

export default class AuthenticationModal extends Component {
  onLoadStart = (e) => {
    const uri = decodeURIComponent(e.nativeEvent.url);
    const baseUri = uri.split('?', 1)[0];
    const queryString = uri.slice(baseUri.length + 1);
    const parameters = flow(
      split('&'),
      map(split('=')),
      fromPairs
    )(queryString);
    console.log(parameters);
  }

  webView = null;

  render() {
    const { visible, uri } = this.props;

    return (
      <Modal visible={visible} animationType="slide">
        {visible && <WebView
          onLoadStart={this.onLoadStart}
          source={{ uri }}
        />}
      </Modal>
    );
  }
}
