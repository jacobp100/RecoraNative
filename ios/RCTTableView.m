//
//  TableView.m
//  RecoraNative
//
//  Created by Jacob Parker on 17/10/2016.
//  Copyright © 2016 Facebook. All rights reserved.
//

#import "RCTTableView.h"

#import <Foundation/Foundation.h>
#import "RCTViewManager.h"

NSString *MyIdentifier = @"BasicTextCellReuseIdentifier";

@interface RCTTableView () <UITableViewDelegate, UITableViewDataSource>

@property (nonatomic, copy) RCTDirectEventBlock onContentSizeChanged;
@property (nonatomic, copy) RCTDirectEventBlock onRowPress;
@property (nonatomic, copy) RCTDirectEventBlock onDeletePress;
@property (nonatomic, copy) RCTDirectEventBlock onRowChangeText;

@end

@implementation RCTTableView
{
  UITableView *_tableView;
}

- (void)dealloc
{
  _tableView.delegate = nil;
  _tableView.dataSource = nil;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if ((self = [super initWithFrame:frame])) {
    _tableView = [[UITableView alloc] initWithFrame:self.bounds];
    _tableView.delegate = self;
    _tableView.dataSource = self;
    [self addSubview:_tableView];
  }
  return self;
}

RCT_NOT_IMPLEMENTED(- (instancetype)initWithCoder:(NSCoder *)aDecoder)

- (void) layoutSubviews
{
  [super layoutSubviews];
  _tableView.frame = self.bounds;
}

- (void)setRows:(NSArray *)rows
{
  _rows = rows;

  if (_rowTitles != nil) {
    [_tableView reloadData];
    [self sendContentHeightEvent];
  }

//  NSArray *oldRows = _rows;
//  _rows = rows;
//
//  if (_rows != nil) {
//    [CATransaction begin];
//
//    [CATransaction setCompletionBlock:^{
//      [_tableView reloadData];
//      [self sendContentHeightEvent];
//    }];
//
//    [_tableView beginUpdates];
//
//    NSArray<NSString *> *deletedRows = [oldRows filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:^BOOL(id row, NSDictionary *bindings) {
//      return ![rows containsObject:row];
//    }]];
//    NSArray<NSString *> *insertedRows = [rows filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:^BOOL(id row, NSDictionary *bindings) {
//      return ![oldRows containsObject:row];
//    }]];
//
//    NSMutableArray<NSString *> *nextRows = [oldRows mutableCopy];
//    NSMutableArray<NSIndexPath *> *indexPathsToDelete = [[NSMutableArray alloc] init];
//    NSMutableArray<NSIndexPath *> *indexPathsToInsert = [[NSMutableArray alloc] init];
//
//    for (NSString *row in deletedRows) {
//      NSUInteger i = [nextRows indexOfObject:row];
//      [indexPathsToDelete addObject:[NSIndexPath indexPathForRow:i inSection:0]];
//      [nextRows removeObjectAtIndex:i];
//    }
//
//    for (NSString *row in insertedRows) {
//      NSUInteger i = [rows indexOfObject:row];
//      [indexPathsToInsert addObject:[NSIndexPath indexPathForRow:i inSection:0]];
//      [nextRows insertObject:row atIndex:i];
//    }
//
//    if ([nextRows count] != [rows count]) {
//      @throw @"oh";
//    }
//
//    [_tableView deleteRowsAtIndexPaths:indexPathsToDelete withRowAnimation:UITableViewRowAnimationLeft];
//    [_tableView insertRowsAtIndexPaths:indexPathsToInsert withRowAnimation:UITableViewRowAnimationTop];
//
//    [_tableView endUpdates];
//
//    [CATransaction commit];
//  } else if (_rowTitles != nil) {
//    [_tableView reloadData];
//    [self sendContentHeightEvent];
//  }
}

- (void)setRowTitles:(NSDictionary *)rowTitles
{
  _rowTitles = rowTitles;
  
  if (_rows != nil) [_tableView reloadData];
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
  return [_rows count];
}

- (BOOL)tableView:(UITableView *)tableView canEditRowAtIndexPath:(NSIndexPath *)indexPath
{
  return YES;
}


- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (tableView != _tableView) return nil;

  UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:MyIdentifier];

  if (cell == nil) {
    cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault  reuseIdentifier:MyIdentifier];
  }

  NSString *row = [_rows objectAtIndex:indexPath.row];
  NSString *title = row ? [_rowTitles objectForKey:row] : nil;
  cell.textLabel.text = title ? title : @"?";

  return cell;
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (_onRowPress) {
    NSDictionary *event = @{
      @"id": [_rows objectAtIndex:indexPath.row],
    };
    _onRowPress(event);
  }
  [_tableView deselectRowAtIndexPath:indexPath animated:YES];
}

- (void)tableView:(UITableView *)tableView commitEditingStyle:(UITableViewCellEditingStyle)editingStyle forRowAtIndexPath:(NSIndexPath *)indexPath {
  if (editingStyle == UITableViewCellEditingStyleDelete) {
    if (_onDeletePress) {
      NSDictionary *event = @{
        @"id": [_rows objectAtIndex:indexPath.row],
      };
      _onDeletePress(event);
    }
  }
}

- (void) sendContentHeightEvent
{
  if (_onContentSizeChanged) {
    CGFloat height = [_tableView contentSize].height;

    NSDictionary *event = @{
      @"height": @(height),
    };
    _onContentSizeChanged(event);
  }
}

@end
