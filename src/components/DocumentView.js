// @flow
import React, { Component } from 'react';
import { Modal } from 'react-native';
import { connect } from 'react-redux';
import { loadDocument, unloadDocument } from '../redux';
import EditModal from './EditModal';
import Page from './Page';

class DocumentView extends Component {
  state = { modalVisible: false }

  componentWillMount() {
    this.props.loadDocument(this.props.documentId);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.documentId !== this.props.documentId) {
      this.props.loadDocument(nextProps.documentId);
      this.props.unloadDocument(this.props.documentId);
    }
  }

  componentWillUnmount() {
    this.props.unloadDocument(this.props.documentId);
  }

  onEdit() {
    this.setState({ modalVisible: true });
  }

  closeModal = (forceRefresh) => {
    this.setState({ modalVisible: false });
    if (forceRefresh) this.props.refreshRoute();
  }

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

export default connect(
  null,
  { loadDocument, unloadDocument }
)(DocumentView);
