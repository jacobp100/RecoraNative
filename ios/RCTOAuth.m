//
//  RCTOAuth.m
//  RecoraNative
//
//  Created by Jacob Parker on 23/11/2016.
//  Copyright © 2016 Facebook. All rights reserved.
//

//#import <Foundation/Foundation.h>
#import <SafariServices/SFSafariViewController.h>
#import "RCTOAuth.h"
#import "RCTBridgeModule.h"
#import "RCTViewManager.h"
#import "RCTUtils.h"

@implementation RCTOAuth
{
  SFSafariViewController* _safariViewController;
  RCTPromiseResolveBlock _resolve;
  RCTPromiseRejectBlock _reject;
}

RCT_EXPORT_MODULE()

- (id)init
{
  self = [super init];
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(didAuthenticate:)
                                               name:@"kCloseSafariViewControllerNotification"
                                             object:nil];
  return self;
}

- (void)dealloc
{
  [self abort];
}

- (NSDictionary *)constantsToExport
{
  return @{
    @"url": @"recora://authenticate",
  };
}

RCT_EXPORT_METHOD(authenticate:(NSString*)uri resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
{
  [self abort];

  NSURL* url = [[NSURL alloc]initWithString:uri];
  _resolve = resolve;
  _reject = reject;
  _safariViewController = [[SFSafariViewController alloc]initWithURL:url];
  _safariViewController.delegate = self;
  
  [RCTPresentedViewController() presentViewController:_safariViewController animated:YES completion:nil];
}

- (void)didAuthenticate:(NSNotification*)notification
{
  if (_resolve != nil) {
    _resolve([(NSURL *)notification.object absoluteString]);
  }
  [self clear];
}

- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller
{
  [self abort];
}

- (void)abort
{
  if (_reject != nil) {
    _reject(@"unknown_exception", @"Unknown exception", nil);
  }
  [self clear];
}

- (void)clear
{
  if (_safariViewController) {
    [_safariViewController dismissViewControllerAnimated:true completion:nil];
  }
  
  _resolve = nil;
  _reject = nil;
  _safariViewController = nil;
}

@end
