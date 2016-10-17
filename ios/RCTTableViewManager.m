//
//  RCTTableViewManager.m
//  RecoraNative
//
//  Created by Jacob Parker on 17/10/2016.
//  Copyright © 2016 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>

#import "RCTTableViewManager.h"
#import "RCTTableView.h"

#import "RCTBridge.h"
#import "RCTUIManager.h"
#import "UIView+React.h"


@interface RCTTableViewManager ()

@end

@implementation RCTTableViewManager
{
  NSConditionLock *_shouldStartLoadLock;
  BOOL _shouldStartLoad;
}

RCT_EXPORT_MODULE()

- (UIView *)view
{
  RCTTableView *tableView = [RCTTableView new];
  return tableView;
}


RCT_EXPORT_VIEW_PROPERTY(rows, NSArray)
RCT_EXPORT_VIEW_PROPERTY(rowTitles, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onContentSizeChanged, RCTDirectEventBlock)

@end
