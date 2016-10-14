import { StyleSheet, PixelRatio } from 'react-native';

// // PANTONE 139-1-3 U
// export const primary = '#daec57';
// // PANTONE 139-1-5 U
// export const primaryBold = '#c6e435'; // Used for the app icon

// export const background = 'black';
// // PANTONE Neutral Black C
// export const backgroundAccent = '#19191A';

// We're using Apple's size classes to have a nice LaunchScreen.xib
// See http://useyourloaf.com/blog/size-classes/
// And http://iosres.com
// This is the largest size that is still compact (landscape iPad with 50/50 split)
// For now, we'll just assume the size classes won't have overlapping size ranges
// But in future, we may want to use a native module to get the actual size class
export const deviceWidthRegularDetailWidthThreshold = 512;
// Should be >= threshold
export const deviceWidthRegularDetailMaxWidth = 600;

export const tableStyles = StyleSheet.create({
  headerContainer: {
    height: 36,
    paddingHorizontal: 24,
    paddingVertical: 6,
    justifyContent: 'flex-end',
  },
  header: {
    color: '#555',
    fontSize: 10,
  },
  splitRowContentContainer: {
    flexDirection: 'row',
  },
  splitRowContentPrimary: {
    flex: 1,
  },
  rowContentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  activeRow: {
    backgroundColor: '#222',
  },
  text: {
    fontSize: 16,
    fontWeight: '400',
    // color: primary,
  },
  destructiveText: {
    color: 'white',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  separatorActive: {
    backgroundColor: '#2F2F2F',
  },
  instructions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});

export const iosTableViewStyles = {
  container: {
    backgroundColor: '#efeff4',
    paddingVertical: 16,
  },
  section: {
    backgroundColor: 'white',
    borderColor: '#c8c7cc',
    borderTopWidth: 1 / PixelRatio.get(),
    borderBottomWidth: 1 / PixelRatio.get(),
    marginVertical: 16,
  },
};
