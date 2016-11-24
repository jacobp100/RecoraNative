#import <SafariServices/SFSafariViewController.h>
#import "RCTBridgeModule.h"
#import "RCTViewManager.h"

@interface RCTOAuth : NSObject <RCTBridgeModule, SFSafariViewControllerDelegate>

- (id)init;
- (void)didAuthenticate:(NSNotification*)notification;
- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller;

@end
