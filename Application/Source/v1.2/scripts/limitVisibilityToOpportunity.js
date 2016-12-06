function controlCopyItemVisibility() {
	// Gets the name of the current entity type IE 'opportunity'
	var entityName = Xrm.Page.data.entity.getEntityName();
	var formType = Xrm.Page.ui.getFormType();

	// if the returned value is 'opportunity' then return true
	if (entityName == "opportunity" && formType == 2) {
		return true;
	} else {
		return false;
	}
}