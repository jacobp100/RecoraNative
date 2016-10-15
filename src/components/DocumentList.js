// @flow
import React, { Component } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import QuickCalculation from './QuickCalculation';
import SortableTable from './SortableTable';
import { addDocument } from '../redux';


const styles = StyleSheet.create({
  center: {
    alignSelf: 'center',
  },
  addDocumentContainer: {
    marginTop: 36,
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgb(220, 28, 100)',
    borderRadius: 100,
    backgroundColor: 'white',
  },
  addDocumentText: {
    color: 'rgb(220, 28, 100)',
    fontSize: 10,
    fontWeight: '700',
  },
});

class DocumentList extends Component {
  state = {
    draggingTableItems: false,
  }

  startDraggingTableItems = () => this.setState({ draggingTableItems: true })
  endDraggingTableItems = () => this.setState({ draggingTableItems: false })

  render() {
    const { documents, documentTitles, addDocument, navigateDocument } = this.props;
    const { draggingTableItems } = this.state;

    return (
      <ScrollView
        style={{ flex: 1 }}
        keyboardDismissMode="interactive"
        scrollEnabled={!draggingTableItems}
        showsVerticalScrollIndicator
      >
        <QuickCalculation />
        <View style={styles.center}>
          <TouchableOpacity onPress={addDocument}>
            <View style={styles.addDocumentContainer}>
              <Text style={styles.addDocumentText}>NEW DOCUMENT</Text>
            </View>
          </TouchableOpacity>
        </View>
        <SortableTable
          rows={documents}
          rowTitles={documentTitles}
          onRowPress={navigateDocument}
          onDragStart={this.startDraggingTableItems}
          onDragEnd={this.endDraggingTableItems}
        />
      </ScrollView>
    );
  }
}

export default connect(
  ({ documents, documentTitles }) => ({
    documents,
    documentTitles,
  }),
  { addDocument }
)(DocumentList);
