function controlCopyItemVisibility() {
	var entityName;
	// Gets the name of the current entity type IE 'opportunity'
	entityName = Xrm.Page.data.entity.getEntityName();

	// if the returned value is 'opportunity' then return true
	if (entityName == "opportunity") {
		return true;
	} else {
		return false;
	}
}