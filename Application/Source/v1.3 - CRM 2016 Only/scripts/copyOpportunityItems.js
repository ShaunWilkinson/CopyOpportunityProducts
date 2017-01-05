function retrieveData() {
    // Handles opening a lookup window to select the opportunity to copy from
    var organisationUrl = Xrm.Page.context.getClientUrl();
    var UrlToOpen = organisationUrl + "/_controls/lookup/lookupinfo.aspx?LookupStyle=single&browse=0&showpropbutton=1&AllowFilterOff=1&objecttypes=3";

    var DialogOption = new Xrm.DialogOptions();
    DialogOption.width = 600;
    DialogOption.height = 600;
    Xrm.Internal.openDialog(UrlToOpen, DialogOption, null, null, Callback);
    var selectedOpportunity; 

    function Callback(selectedOpportunity) {
        // If user selected an opportunity
        if (selectedOpportunity != null) {
            var selectedOpportunityId = selectedOpportunity.items[0].id.substr(1, 36);
            retrieveProducts(selectedOpportunityId);
        }
    }     
}

function retrieveProducts(selectedOpportunityId) {
    var requestUrl = Xrm.Page.context.getClientUrl()
        + "/api/data/v8.0/opportunityproducts?$filter=_opportunityid_value eq (" 
        + selectedOpportunityId + ")";

    // Perform the XML request
    var request = new XMLHttpRequest();
    request.open("GET", encodeURI(requestUrl), true); 

    request.setRequestHeader("Accept", "application/json");
    request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    request.setRequestHeader("OData-MaxVersion", "4.0");
    request.setRequestHeader("OData-Version", "4.0");

    request.onreadystatechange = function() {
        if (this.readyState == 4 /* Complete */) {
            request.onreadystatechange = null;

            if (this.status == 200) /* OK */ {
                productsRetrieved(JSON.parse(this.responseText).value, selectedOpportunityId);
            } else { /* failed */
                console.log(JSON.parse(this.response).error.message);
                informationNotRetrieved();
            }
        }
    };

    request.send();
}

function productsRetrieved(records, selectedOpportunityId, removedProducts) {
    removedProducts = removedProducts || 0;

    if (records.length == 0) {
        noProductsInTargetOpp();
        return 0;
    }

    // Check if there are existing line items then get confirmation and delete if confirmed
    if (removedProducts == 0) {
       removeCurrentProducts(records, selectedOpportunityId);
    } else {
        copyProductsToCurrentOp(records, selectedOpportunityId);
    }
}

/* delete value takes true or false */
function removeCurrentProducts(records, selectedOpportunityId) {
    var requestUrl = Xrm.Page.context.getClientUrl()
        + "/api/data/v8.0/opportunityproducts?$filter=_opportunityid_value eq (" 
        + Xrm.Page.data.entity.getId().substr(1, 36) + ")";

    var request = new XMLHttpRequest();
    request.open("GET", encodeURI(requestUrl), true); 
    request.setRequestHeader("Accept", "application/json");
    request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    request.setRequestHeader("OData-MaxVersion", "4.0");
    request.setRequestHeader("OData-Version", "4.0");

    request.onreadystatechange = function() {
        if (this.readyState == 4) {
            request.onreadystatechange = null;

            if (this.status == 200) {
                var data = JSON.parse(this.responseText).value;
                // If current op contains items
                if (data.length != 0) {
                    var removeCurrentProductsConfirm = confirm("Should all of the current opportunity line items be removed?");
                    if (removeCurrentProductsConfirm) {
                        deleteCurrentProducts(data, records, selectedOpportunityId);
                    } else {
                        productsRetrieved(records, selectedOpportunityId, 1);
                    }
                } else {
                    productsRetrieved(records, selectedOpportunityId, 1);
                }
            }
        }
    };

    request.send();
}

function deleteCurrentProducts(currentProductsArray, records, selectedOpportunityId) {
    for (i = 0; i < currentProductsArray.length; i++) {
        //delete line items
        currentProductId = currentProductsArray[i].opportunityproductid;

        var requestUrl = Xrm.Page.context.getClientUrl()
        + "/api/data/v8.0/opportunityproducts(" 
        + currentProductId + ")";

        var request = new XMLHttpRequest();
        request.open("DELETE", encodeURI(requestUrl), true); 
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        request.setRequestHeader("OData-MaxVersion", "4.0");
        request.setRequestHeader("OData-Version", "4.0");

        request.onreadystatechange = function () {
            if (this.readyState == 4) {
                request.onreadystatechange = null;
                if (this.status == 204) {
                    console.log("Removed Line Item: " + currentProductId);
                } else {
                    console.log("Couldn't remove line item: " + currentProductId);
                    return;
                }
            }
        }

        request.send();
    }

    productsRetrieved(records, selectedOpportunityId, 1);
}

function copyProductsToCurrentOp(records, selectedOpportunityId) {
    var selectedOpportunity = retrieveRecord(selectedOpportunityId, "opportunities", callback);

    function callback(data) {
        // Set price list if required
        try {
            var currentPriceList = Xrm.Page.getAttribute("pricelevelid").getValue()[0].id.substr(1, 36);
        } catch (err) {
            var currentPriceList = null;
        }

        if (data._pricelevelid_value != null && data._pricelevelid_value != currentPriceList) {
            retrieveRecord(data._pricelevelid_value, "pricelevels", setpricelist)

            function setpricelist(data) {
                var priceList = new Array();
                    priceList[0] = new Object();
                    priceList[0].id = data.pricelevelid;
                    priceList[0].name = data.name;
                    priceList[0].entityType = "pricelevel";

                Xrm.Page.getAttribute("pricelevelid").setValue(priceList);
            }
        }
        
        // Set revenue to system calculated
        var currentRecordRevenue = Xrm.Page.getAttribute("isrevenuesystemcalculated").getValue();
        if (currentRecordRevenue == false) {
            Xrm.Page.getAttribute("isrevenuesystemcalculated").setValue(true);    
        }

        // Get current record name and details
        var currentRecordId = Xrm.Page.data.entity.getId().substr(1, 36);
        var currentRecordLogicalName = Xrm.Page.data.entity.getEntityName();
        var currentRecordName = Xrm.Page.data.entity.getPrimaryAttributeValue();

        // Retrieve required details then set each value (may be quicker to make a single request for all records)
        for (i = 0; i < records.length; i++) {
            var existingProduct = records[i];

            var lineItem = {};
                lineItem.isproductoverridden = existingProduct.isproductoverridden; 
                lineItem["productid@odata.bind"] = "/products(" + existingProduct._productid_value + ")";
                lineItem["uomid@odata.bind"] = "/uoms(" + existingProduct._uomid_value + ")";
                lineItem["opportunityid@odata.bind"] = "/opportunities(" + currentRecordId + ")";
                lineItem.quantity = existingProduct.quantity;

            createRecord(lineItem, "opportunityproducts");
        }

        setTimeout(success, 200); // Small pause to allow record creation
    };
}

function retrieveRecord(recordId, recordType, callback) {
    var requestUrl = Xrm.Page.context.getClientUrl()
        + "/api/data/v8.0/"
        + recordType 
        + "(" + recordId + ")";

    var request = new XMLHttpRequest();
        request.open("GET", encodeURI(requestUrl), false); 
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        request.setRequestHeader("OData-MaxVersion", "4.0");
        request.setRequestHeader("OData-Version", "4.0");

    request.onreadystatechange = function () {
        if (this.readyState == 4) {
            request.onreadystatechange == null;
            if (this.status == 200) {
                callback(JSON.parse(this.responseText));
            } else {
                console.log("issue: " + this.status);
                callback(false);
            }
        }
    }

    request.send();
}

function createRecord(data, recordType) {
    var requestUrl = Xrm.Page.context.getClientUrl()
        + "/api/data/v8.0/"
        + recordType;

    var request = new XMLHttpRequest();
        request.open("POST", encodeURI(requestUrl), false); 
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        request.setRequestHeader("OData-MaxVersion", "4.0");
        request.setRequestHeader("OData-Version", "4.0");

    request.onreadystatechange = function () {
        if (this.readyState == 4) {
            request.onreadystatechange == null;
            if (this.status == 204) {
                var recordId = this.getResponseHeader("OData-EntityId");
                console.log("Created line item: " + recordId);
            } else {
                var error = JSON.parse(this.response).error;
                console.log(error.message);
            }
        }
    }

    request.send(JSON.stringify(data));
}

function success() {
    var completeMsg = "Completed Line Item Copy";
    Xrm.Utility.alertDialog(
        completeMsg, 
        function() {
            var subgrid = Xrm.Page.ui.get("opportunityproductsGrid");
            subgrid.refresh();
        }
    );    
}

function informationNotRetrieved() {
    var informationNotRetrievedMsg = "Couldn't retrieve the selected opportunities line items.";
    Xrm.Utility.alertDialog(
        informationNotRetrievedMsg, 
        function() { return null; }
    );
}

function noProductsInTargetOpp() {
    var noProductsInTargetOppMsg = "No line items are present in the target opportunity.";
    Xrm.Utility.alertDialog(
        noProductsInTargetOppMsg,
        function() { return null; }
    );
}