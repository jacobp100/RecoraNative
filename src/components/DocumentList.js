// @flow
import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import QuickCalculation from './QuickCalculation';
import SortableTable from './SortableTable';
import { addDocument, deleteDocument, setDocumentTitle, reorderDocuments } from '../redux';


const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    marginTop: 36,
    marginBottom: 24,
  },
  flex: {
    flex: 1,
    alignItems: 'center',
  },
  button: {
    padding: 8,
  },
  buttonBorder: {
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgb(220, 28, 100)',
    borderRadius: 100,
    backgroundColor: 'white',
  },
  buttonText: {
    color: 'rgb(220, 28, 100)',
    fontSize: 10,
    fontWeight: '700',
  },
});

class DocumentList extends Component {
  state = {
    editingTableItems: false,
    draggingTableItems: false,
  }

  startDraggingTableItems = () => this.setState({ draggingTableItems: true })
  endDraggingTableItems = () => this.setState({ draggingTableItems: false })
  toggleEditing = () => this.setState({ editingTableItems: !this.state.editingTableItems })
  navigateDocument = (documentId) => {
    this.setState({ editingTableItems: false, draggingTableItems: false });
    this.props.navigateDocument(documentId);
  }

  render() {
    const {
      documents, documentTitles, addDocument, deleteDocument, setDocumentTitle, reorderDocuments,
    } = this.props;
    const { draggingTableItems, editingTableItems } = this.state;

    return (
      <KeyboardAwareScrollView scrollEnabled={!draggingTableItems}>
        <QuickCalculation />
        <View style={styles.actionRow}>
          <View style={styles.flex} />
          <TouchableOpacity onPress={addDocument}>
            <View style={[styles.button, styles.buttonBorder]}>
              <Text style={styles.buttonText}>NEW DOCUMENT</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.flex}>
            <TouchableOpacity onPress={this.toggleEditing}>
              <View style={styles.button}>
                <Text style={styles.buttonText}>{editingTableItems ? 'DONE' : 'EDIT'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <SortableTable
          rows={documents}
          rowTitles={documentTitles}
          isEditing={editingTableItems}
          onDragStart={this.startDraggingTableItems}
          onDragEnd={this.endDraggingTableItems}
          onRowPress={this.navigateDocument}
          onDeletePress={deleteDocument}
          onRowChangeText={setDocumentTitle}
          onOrderChange={reorderDocuments}
        />
      </KeyboardAwareScrollView>
    );
  }
}

export default connect(
  ({ documents, documentTitles }) => ({
    documents,
    documentTitles,
  }),
  { addDocument, deleteDocument, setDocumentTitle, reorderDocuments }
)(DocumentList);
