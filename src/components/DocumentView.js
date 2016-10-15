// @flow
import React, { Component } from 'react';
import { Modal } from 'react-native';
import EditModal from './EditModal';
import Page from './Page';

export default class DocumentView extends Component {
  state = { modalVisible: false }

  onEdit() {
    this.setState({ modalVisible: true });
  }

  closeModal = () => { this.setState({ modalVisible: false }); }

  render() {
    const { documentId } = this.props;
    const { modalVisible } = this.state;
    return (
      <Page documentId={documentId}>
        <Modal
          animationType="slide"
          visible={modalVisible}
          transparent
        >
          <EditModal documentId={documentId} closeModal={this.closeModal} />
        </Modal>
      </Page>
    );
  }
}
