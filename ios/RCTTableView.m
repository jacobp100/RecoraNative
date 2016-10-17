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
    _tableView = [[UITableView alloc] initWithFrame:frame];
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
  
  if (!_rowTitles) return;

  [_tableView reloadData];

  if (_onContentSizeChanged) {
    CGFloat height = [_tableView contentSize].height;

    NSDictionary *event = @{
      @"height": @(height),
    };
    _onContentSizeChanged(event);
  }
}

- (void)setRowTitles:(NSDictionary *)rowTitles
{
  _rowTitles = rowTitles;
  
  if (_rows) [_tableView reloadData];
}

- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView
{
  NSLog(@"\n\n\n\n\n\n\n\n\n\n:D\n\n\n\n\n\n\n\n\n\n\n\n");
  return 1;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
  NSLog(@"\n\n\n\n\n\n\n\n\n\n:D\n\n\n\n\n\n\n\n\n\n\n\n");
  return 5;// [_rows count];
}

-(UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (tableView != _tableView) return nil;

  UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:MyIdentifier];

  if (cell == nil) {
    cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault  reuseIdentifier:MyIdentifier];
  }

  NSString *row = [_rows objectAtIndex:indexPath.row];
  NSString *title = row ? [_rowTitles objectForKey:row] : nil;
  cell.textLabel.text = title ? title : @"";
  cell.textLabel.text = @":D";

  return cell;
}

- (void)tableView:(UITableView *)tableView willDisplayCell:(UITableViewCell *)cell forRowAtIndexPath:(NSIndexPath *)indexPath
{
  NSString *item = [_rows objectAtIndex:indexPath.row];
  NSString *title = item ? [_rowTitles objectForKey:item] : nil;
  
  UILabel *label = [cell textLabel];
  
  if (label && title) label.text = title;
}

@end
