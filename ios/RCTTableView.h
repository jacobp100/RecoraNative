//
//  TableView.h
//  RecoraNative
//
//  Created by Jacob Parker on 17/10/2016.
//  Copyright © 2016 Facebook. All rights reserved.
//

#import "RCTView.h"

@class RCTTableView;

@interface RCTTableView : RCTView

@property (nonatomic, copy) NSArray *rows;
@property (nonatomic, copy) NSDictionary *rowTitles;

@end
