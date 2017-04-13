# Description

This solution adds a button to the command bar of the Opportunity entity in CRM which allows you to copy all of the opportunity line items from an existing opportunity. This will also copy the price list of the target opportunity and will set the 'Revenue' field to System Calculated if required.

![Image of the command bar with added button](https://s18.postimg.org/p9d14698p/command_Bar.png)

I'm happy to extend this if I get any requests for new functionality, I can be reached by email through CodePlex or by commenting on my blog at [www.SPandCRM.com](http://www.spandcrm.com)

![](https://spandcrm2013.files.wordpress.com/2016/11/addlineitems2.png)

* * *

# Updates

**Update 1.3**

*   This version and new versions will only be compatible with CRM 2016.
*   Updated solution to use the CRM 2016 WebApi version 8.0
*   Totally rewritten with the WebApi in mind (likely to rewrite sections in future however it works)
*   Removed SDK.REST dependency
*   Removed JSON2 dependency
*   Removed limitVisibilityToOpportunity js file (replaced with XML in the Application Ribbon)
*   Solution no longer alerts the user upon clicking 'Copy Items' button
*   Solution will no longer replace price list unless required.
*   Solution will no longer display the 'remove current items' question unless there are current items.
*   Solution should now stop in most cases if any

**Update 1.2**

*   Solution 'Copy Opportunity Item' button will now only display on the opportunity edit form type rather than all opportunity forms.
*   Fixed a broken reference to the JSON2 library.

**Update 1.1**

*   Change to method used to display command bar button.
*   Removed opportunity entity from solution.
*   'Copy Line Item' button now appears in the ellipses menu rather than taking up the command bar.
*   Solution now supports CRM 2013 6.0 & 6.1
*   Removed several dependencies which were part of the previous release.
*   Added some comments to code.
*   Solution will not remove current line items unless target opportunity contains items.

* * *

If you've found this solution useful feel free to drop some pennies my way -

PayPal - [https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=BS3SEUPQDJF4Q](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=BS3SEUPQDJF4Q "PayPal Donation Link")
