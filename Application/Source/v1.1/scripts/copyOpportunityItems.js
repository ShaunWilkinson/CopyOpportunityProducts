function retrieveData() {
	loadWebResource("sw_json2");
	loadWebResource("sw_SDK.REST.js");

    // Setup confirmation dialog
    var copyDescription = confirm("Would you like to copy line items from another opportunity? (Will remove current items and set Revenue to 'System Calculated' if required)");

    // if user confirms then run copy description function
    if (copyDescription == true) {
        userConfirmsCopyDescription();
    }
}

function loadWebResource(resource) {
	var httpRequest = null;

	// Attempt to retrieve web resource using HttpRequest
	try {    
		httpRequest = new XMLHttpRequest();

	  	var clientUrl= Xrm.Page.context.getClientUrl();

	 	if (clientUrl.match(/\/$/)) {
			clientUrl = clientUrl.substring(0, clientUrl.length - 1);
		}

		httpRequest.open("GET", clientUrl + "/webresources/" + resource, false);
		httpRequest.send(null);
		eval(httpRequest.responseText);

	} catch (e) {
		console.log("Error loading " + resource + ":\n" + e.description);
	}
}

// Input is recordId, function to run on success, function to run on failure
function userConfirmsCopyDescription() {

    // Handles opening a lookup window to select the opportunity to copy from
    // ==== LOOKUP ========
    var organizationUrl = Xrm.Page.context.getClientUrl();
    var entityTypeCode = 3; // 3 = opportunity
    var UrlToOpen = organizationUrl + "/_controls/lookup/lookupinfo.aspx?LookupStyle=single&browse=0&showpropbutton=1&AllowFilterOff=1&objecttypes=" + entityTypeCode;

    var DialogOption = new Xrm.DialogOptions;
    DialogOption.width = 600;
    DialogOption.height = 600;
    Xrm.Internal.openDialog(UrlToOpen, DialogOption, null, null, Callback);
    var selectedOpportunity; // Contains selected opportunity
    // ==== END LOOKUP =====

    function Callback(selectedOpportunity){
        var lookupEntityType = "opportunity"; // account

        // If user selected an opportunity and it's type 'opportunity'
        if (selectedOpportunity != null && selectedOpportunity.items[0].typename == lookupEntityType) {
            // Get the guid and name
            var recordId = selectedOpportunity.items[0].id;
            var recordName = selectedOpportunity.items[0].name;
 
            // function to remove the current items
            getCurrentOpportunityLineItems();

            // OData URI query to get the selected opps line items
                var oDataURILineItems = Xrm.Page.context.getClientUrl()
                    + "/XRMServices/2011/OrganizationData.svc/"
                    + "OpportunitySet"
                    + "(guid'" 
                    + recordId + "')"
                    + "?$expand=product_opportunities";

            // Perform the XML request
            var request = new XMLHttpRequest();
            request.open("GET", encodeURI(oDataURILineItems), true); // oDataURI
            request.setRequestHeader("Accept", "application/json");
            request.setRequestHeader("Content-Type", "application/json; charset=utf-8");

            request.onreadystatechange = function() {
                //debug
                if (this.readyState == 4 /* Complete */) {
                    request.onreadystatechange = null; //avoids memory leak?

                    if (this.status == 200) { // Succesful request
                        // run informationRetrieved passing parsed JSON result
                        informationRetrieved(JSON.parse(this.responseText).d);
                    } else { // unsuccseful request
                        // display error MSG
                        informationNotRetrieved();
                    }
                }
            };

            request.send();
                    
        }
    }; 
}

function getCurrentOpportunityLineItems() {
    var currentRecordId = Xrm.Page.data.entity.getId();

    // Build oData query
    var oDataURICurrentLineItems = Xrm.Page.context.getClientUrl()
            + "/XRMServices/2011/OrganizationData.svc/"
            + "OpportunitySet"
            + "(guid'" 
            + currentRecordId + "')"
            + "?$expand=product_opportunities";

    // Perform the request
    var request = new XMLHttpRequest();
    request.open("GET", encodeURI(oDataURICurrentLineItems), true); // oDataURI
    request.setRequestHeader("Accept", "application/json");
    request.setRequestHeader("Content-Type", "application/json; charset=utf-8");

    request.onreadystatechange = function() {
        //debug
        if (this.readyState == 4 /* Complete */) {
            request.onreadystatechange = null; //avoids memory leak?

            if (this.status == 200) { // Succesful request
                removeCurrentOppItems(JSON.parse(this.responseText).d); 
            } else {

            }
        }
    };

    request.send();
}

// input is array of current opportunity items from current opp
function removeCurrentOppItems(data) {
    // holds array of opps
    var currentOppItems = data['product_opportunities'].results;

    // Remove all current opp items
    for (i = 0; i < currentOppItems.length; i++) {
        // Holds id of opportunity item
        var currentOppItemId = currentOppItems[i].OpportunityProductId;

        // Uses SDK.Rest plugin to delete opportunity products
        SDK.REST.deleteRecord(
            currentOppItemId, 
            "OpportunityProduct", 
            function() {}, 
            function() {}
        );
    }
}

// Ran if information about account is succesfully requested
function informationRetrieved(record) {

    // list of line items for the retrieved record and the Price List
    var opportunityListItemArray = record['product_opportunities'].results;
    console.log(opportunityListItemArray);
    var existingOppPrice = record.PriceLevelId;

    if (opportunityListItemArray.length == 0) {
        noOpportunitiesInTargetOp();
        return null;
    }

    var priceList = new Array();
    priceList[0] = new Object();
    priceList[0].id = record.PriceLevelId.Id;
    priceList[0].name = record.PriceLevelId.Name;
    priceList[0].entityType = record.PriceLevelId.LogicalName;

    if (record.PriceLevelId.Id == null) {
        noPriceListInTargetOpp();
        return null;
    }

    // TODO price lsit not being set

    // Get current record name and details
    var currentRecordId = Xrm.Page.data.entity.getId();
    var currentRecordLogicalName = Xrm.Page.data.entity.getEntityName();
    var currentRecordName = Xrm.Page.data.entity.getPrimaryAttributeValue();
    var currentRecordRevenue = Xrm.Page.getAttribute('isrevenuesystemcalculated').getValue();

    // Change Revenue field to System Calculated
    if (currentRecordRevenue == false) {
        Xrm.Page.getAttribute('isrevenuesystemcalculated').setValue(true);
    }

    // Set price lsit of current record to existing records
    Xrm.Page.getAttribute('pricelevelid').setValue(priceList);//.setValue(existingOpportunityPriceList);

    for (i = 0; i < opportunityListItemArray.length; i++) {
        var existingLineItem = opportunityListItemArray[i];

        // Set new line item values to old line item values (uses SKD.REST & JSON)
        var lineItem = {};
        lineItem.IsProductOverridden = existingLineItem.IsProductOverridden; // defined
        lineItem.ProductId = { // opp item Id
            Id: existingLineItem.ProductId.Id,
            LogicalName: existingLineItem.ProductId.LogicalName,
            Name: existingLineItem.ProductId.Name
        };
        lineItem.UoMId = { // Item Units
            Id: existingLineItem.UoMId.Id,
            LogicalName: existingLineItem.UoMId.LogicalName,
            Name: existingLineItem.UoMId.Name
        };
        lineItem.OpportunityId = { // Opp Id
            Id: currentRecordId,
            LogicalName: currentRecordLogicalName,
            Name: currentRecordName
        };
        lineItem.Quantity = existingLineItem.Quantity; // Quantity

        // Creat the new line item using SDK.REST
        SDK.REST.createRecord(lineItem, "OpportunityProduct", function(){}, function(){});
    }

    success();

    Xrm.Utility.openEntityForm("opportunity", currentRecordId);
}

function noOpportunitiesInTargetOp() {
    var failMsg = "No line items in selected opportunity";
    Xrm.Utility.alertDialog(failMsg, function() {});
}

function noPriceListInTargetOpp() {
    var failMsg = "No Price List in selected opportunity";
    Xrm.Utility.alertDialog(failMsg, function() {});
}

function success() {
    var successMsg = "Copied line items succesfully";
    Xrm.Utility.alertDialog(successMsg, function() {});
}

function informationNotRetrieved() {
    var msgRetrievalFail = "Couldn't retrieve line items from the opportunity";
    Xrm.Utility.alertDialog(msgRetrievalFail, function() {});
}