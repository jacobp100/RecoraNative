// @flow
import React, { Component } from 'react';
import { ScrollView, View, Text, TextInput, TouchableHighlight, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { getOr } from 'lodash/fp';
import SortableTable from './SortableTable';
import { setDocumentTitle, addSection, reorderSections } from '../redux';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sectionContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionBody: {
    padding: 24,
    backgroundColor: 'white',
  },
  outsetSectionBody: {
    marginHorizontal: -24,
  },
  padBottomSectionBody: {
    paddingBottom: 36,
  },
  sectionAction: {
    padding: 12,
    backgroundColor: 'white',
  },
  action: {
    fontSize: 16,
    textAlign: 'center',
    color: '#007AFF',
  },
  actionDestructive: {
    color: '#FF3B30',
  },
  separator: {
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  title: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 18,
  },
  textInput: {
    height: 22,
    marginBottom: 22,
  },
});

class EditModal extends Component {
  state = {
    draggingTableItems: false,
  }

  setDocumentTitle = (text) => {
    this.props.setDocumentTitle(text);
    this.didEditDocumentTitle = true;
  }

  startDraggingTableItems = () => this.setState({ draggingTableItems: true })
  endDraggingTableItems = () => this.setState({ draggingTableItems: false })

  closeModal = () => {
    if (this.props.closeModal) this.props.closeModal(this.didEditDocumentTitle);
    this.didEditDocumentTitle = false;
  }

  didEditDocumentTitle = false;

  render() {
    const { closeModal, title, sections, sectionTitles, addSection, reorderSections } = this.props;
    const { draggingTableItems } = this.state;

    return (
      <ScrollView style={styles.container} scrollEnabled={!draggingTableItems}>
        <View style={styles.sectionContainer}>
          <View style={[styles.sectionBody, styles.padBottomSectionBody]}>
            <Text style={styles.title}>TITLE</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={this.setDocumentTitle}
            />
            <Text style={styles.title}>SECTIONS</Text>
            <View style={styles.outsetSectionBody}>
              <SortableTable
                rows={sections}
                rowTitles={sectionTitles}
                onDragStart={this.startDraggingTableItems}
                onDragEnd={this.endDraggingTableItems}
                onOrderChange={reorderSections}
                isEditing
              />
            </View>
          </View>
          <View style={styles.separator} />
          <TouchableHighlight onPress={addSection}>
            <View style={styles.sectionAction}>
              <Text style={styles.action}>Add Section</Text>
            </View>
          </TouchableHighlight>
          <View style={styles.separator} />
          <TouchableHighlight onPress={this.closeModal}>
            <View style={styles.sectionAction}>
              <Text style={styles.action}>Close</Text>
            </View>
          </TouchableHighlight>
        </View>
        <View style={styles.sectionContainer}>
          <TouchableHighlight onPress={closeModal}>
            <View style={styles.sectionAction}>
              <Text style={[styles.action, styles.actionDestructive]}>
                Delete Document
              </Text>
            </View>
          </TouchableHighlight>
        </View>
      </ScrollView>
    );
  }
}

export default connect(
  (state, { documentId }) => ({
    title: getOr('', ['documentTitles', documentId], state),
    sections: getOr([], ['documentSections', documentId], state),
    sectionTitles: state.sectionTitles,
  }),
  (dispatch, { documentId }) => ({
    setDocumentTitle: text => dispatch(setDocumentTitle(documentId, text)),
    addSection: () => dispatch(addSection(documentId)),
    reorderSections: order => dispatch(reorderSections(documentId, order)),
  })
)(EditModal);
