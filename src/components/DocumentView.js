// @flow
import React, { Component } from 'react';
import { Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { includes } from 'lodash/fp';
import { unloadDocument } from '../redux';
import { loadDocument } from '../redux/persistenceMiddleware';
import EditModal from './EditModal';
import Page from './Page';

const styles = StyleSheet.create({
  indicator: {
    marginTop: 60,
  },
});

class DocumentView extends Component {
  state = {
    modalVisible: false,
    isLoading: false,
  }

  componentWillMount() {
    this.loadDocument(this.props.documentId, this.props.loadedDocuments);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.documentId !== this.props.documentId) {
      this.loadDocument(nextProps.documentId, nextProps.loadedDocuments);
      this.props.unloadDocument(this.props.documentId);
    }
  }

  componentWillUnmount() {
    this.props.unloadDocument(this.props.documentId);
  }

  showEditModal() {
    this.setState({ modalVisible: true });
  }

  closeModal = (forceRefresh) => {
    this.setState({ modalVisible: false });
    if (forceRefresh) this.props.refreshRoute();
  }

  loadDocument = (documentId, loadedDocuments) => {
    if (includes(documentId, loadedDocuments)) return;

    const loadDocumentPromise = (this.loadDocumentPromise || Promise.resolve())
      .then(() => { this.setState({ isLoading: true }); })
      .then(() => this.props.loadDocument(documentId))
      .then(() => {
        if (this.loadDocumentPromise === loadDocumentPromise) {
          this.setState({ isLoading: false });
        }
      });
    this.loadDocumentPromise = loadDocumentPromise;
  }

  loadDocumentPromise = null

  render() {
    const { documentId } = this.props;
    const { modalVisible, isLoading } = this.state;
    return (
      <Page documentId={documentId}>
        {isLoading && <ActivityIndicator style={styles.indicator} />}
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
  ({ loadedDocuments }) => ({ loadedDocuments }),
  { loadDocument, unloadDocument },
  null,
  { withRef: true }
)(DocumentView);
