// @flow
import React, { Component } from 'react';
import { ScrollView, View, Text, TextInput, TouchableHighlight, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { getOr, keys, map, fromPairs } from 'lodash/fp';
import SortableTable from './SortableTable';

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
  },
  textInput: {
    height: 40,
  },
});

const getSectionTitlesWithDefaults = (sections, sectionTitles) => {
  const sectionIndices = keys(sections);

  const pairs = map(index => {
    const sectionId = sections[index];
    const title = getOr(`Section ${index + 1}`, sectionId, sectionTitles);
    return [sectionId, title];
  }, sectionIndices);

  return fromPairs(pairs);
};

class EditModal extends Component {
  state = {
    draggingTableItems: false,
  }

  startDraggingTableItems = () => this.setState({ draggingTableItems: true })
  endDraggingTableItems = () => this.setState({ draggingTableItems: false })

  render() {
    const { closeModal, sections, sectionTitles } = this.props;
    const { draggingTableItems } = this.state;

    return (
      <ScrollView style={styles.container} scrollEnabled={!draggingTableItems}>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionBody}>
            <Text style={styles.title}>TITLE</Text>
            <TextInput style={styles.textInput} value="a" />
            <Text style={styles.title}>SECTIONS</Text>
            <View style={styles.outsetSectionBody}>
              <SortableTable
                rows={sections}
                rowTitles={getSectionTitlesWithDefaults(sections, sectionTitles)}
                onDragStart={this.startDraggingTableItems}
                onDragEnd={this.endDraggingTableItems}
              />
            </View>
          </View>
          <View style={styles.separator} />
          <TouchableHighlight onPress={closeModal}>
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
    sections: getOr([], ['documentSections', documentId], state),
    sectionTitles: state.sectionTitles,
  })
)(EditModal);
