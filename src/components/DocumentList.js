// @flow
import React, { Component } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, RefreshControl,
} from 'react-native';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { includes, filter } from 'lodash/fp';
import QuickCalculation from './QuickCalculation';
import SortableTable from './SortableTable';
import CreateDocument from './CreateDocument';
import { deleteDocument, setDocumentTitle } from '../redux';
import { loadDocuments } from '../redux/persistenceMiddleware';
import { button as buttonStyles } from '../styles';


const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    marginTop: 36,
    marginBottom: 24,
    marginHorizontal: 12,
  },
  flex: {
    flex: 1,
    alignItems: 'center',
  },
  padLeft: {
    paddingLeft: 12,
  },
  textInput: {
    height: 28,
    textAlign: 'left',
  },
  fudgeHeight: {
    height: 30,
  },
});

const textInputContainerStyles =
  [styles.flex, buttonStyles.border, buttonStyles.textInputBorder, styles.fudgeHeight];

class DocumentList extends Component {
  state = {
    isLoading: false,
    editingTableItems: false,
    searchingTableItems: false,
    searchQuery: '',
    creatingDocument: false,
    draggingTableItems: false,
  }

  componentWillMount() {
    this.loadDocuments(false);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.accounts !== this.props.accounts) this.loadDocuments();
  }

  setSearchQuery = searchQuery => this.setState({ searchQuery })
  startDraggingTableItems = () => this.setState({ draggingTableItems: true })
  endDraggingTableItems = () => this.setState({ draggingTableItems: false })
  toggleEditing = () => this.setState({
    editingTableItems: !this.state.editingTableItems,
    searchingTableItems: false,
    searchQuery: '',
  })
  toggleSearching = () => this.setState({
    editingTableItems: false,
    searchingTableItems: !this.state.searchingTableItems,
    searchQuery: '',
  })
  toggleCreatingDocument = () => this.setState({ creatingDocument: !this.state.creatingDocument })
  navigateDocument = (documentId) => {
    this.setState({
      editingTableItems: false,
      searchingTableItems: false,
      searchQuery: '',
      creatingDocument: false,
      draggingTableItems: false,
    });
    this.props.navigateDocument(documentId);
  }
  loadDocuments = (skipSetLoading) => {
    if (skipSetLoading !== false) this.setState({ isLoading: true });
    const loadingPromise = (this.loadingPromise || Promise.resolve())
      .then(() => this.props.loadDocuments())
      .then(() => {
        if (this.loadingPromise === loadingPromise) {
          this.setState({ isLoading: false });
        }
      });
    this.loadingPromise = loadingPromise;
  }

  loadingPromise = null

  render() {
    const {
      documents, documentTitles, deleteDocument, setDocumentTitle, navigateSettings,
    } = this.props;
    const {
      draggingTableItems, editingTableItems, searchingTableItems, searchQuery, creatingDocument,
      isLoading,
    } = this.state;

    const toolbar = searchingTableItems ? (
      <View style={styles.actionRow}>
        <View style={textInputContainerStyles}>
          <TextInput
            style={[styles.flex, buttonStyles.buttonText, styles.textInput]}
            value={searchQuery}
            onChangeText={this.setSearchQuery}
            placeholder="Search"
            blurOnSubmit
            autoFocus
          />
        </View>
        <TouchableOpacity onPress={this.toggleSearching}>
          <View style={[buttonStyles.button, styles.padLeft]}>
            <Text style={buttonStyles.buttonText}>CLOSE</Text>
          </View>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={this.toggleCreatingDocument}>
          <View style={[buttonStyles.button, buttonStyles.border, buttonStyles.buttonBorder]}>
            <Text style={buttonStyles.buttonText}>NEW DOCUMENT</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.flex} />
        <TouchableOpacity onPress={this.toggleEditing}>
          <View style={buttonStyles.button}>
            <Text style={buttonStyles.buttonText}>{editingTableItems ? 'DONE' : 'EDIT'}</Text>
          </View>
        </TouchableOpacity>
        {!editingTableItems && <TouchableOpacity onPress={this.toggleSearching}>
          <View style={[buttonStyles.button, styles.padLeft]}>
            <Text style={buttonStyles.buttonText}>SEARCH</Text>
          </View>
        </TouchableOpacity>}
        {!editingTableItems && <TouchableOpacity onPress={navigateSettings}>
          <View style={[buttonStyles.button, styles.padLeft]}>
            <Text style={buttonStyles.buttonText}>SETTINGS</Text>
          </View>
        </TouchableOpacity>}
      </View>
    );

    const searchQueryLowerCase = searchQuery.toLowerCase();
    const rows = !searchQuery
      ? documents
      : filter(documentId => (
        includes(searchQueryLowerCase, documentTitles[documentId].toLowerCase())
      ), documents);

    const refreshControl = (
      <RefreshControl
        onRefresh={this.loadDocuments}
        refreshing={isLoading}
        title=" "
      />
    );

    return (
      <KeyboardAwareScrollView
        scrollEnabled={!draggingTableItems}
        refreshControl={refreshControl}
      >
        <QuickCalculation />
        {toolbar}
        <SortableTable
          rows={rows}
          rowTitles={documentTitles}
          isEditing={editingTableItems}
          onDragStart={this.startDraggingTableItems}
          onDragEnd={this.endDraggingTableItems}
          onRowPress={this.navigateDocument}
          onDeletePress={deleteDocument}
          onRowChangeText={setDocumentTitle}
        />
        <Modal visible={creatingDocument} animationType="slide">
          <CreateDocument
            onClose={this.toggleCreatingDocument}
            onDocumentCreated={this.navigateDocument}
          />
        </Modal>
      </KeyboardAwareScrollView>
    );
  }
}

export default connect(
  ({ documents, documentTitles, accounts }) => ({
    documents,
    documentTitles,
    accounts,
  }),
  { deleteDocument, setDocumentTitle, loadDocuments }
)(DocumentList);
