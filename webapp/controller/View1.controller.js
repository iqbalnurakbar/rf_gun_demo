sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
  ],
  (Controller, MessageToast, SelectDialog, StandardListItem) => {
    "use strict";

    return Controller.extend("rfgundemo.controller.View1", {
      onInit() {
        this._attachInputEventDelegates();
      },

      onInputChange: function () {
        this._checkInputsAndShowButton();
      },

      onItemWisePress: function () {
        const oItemLabel = this.byId("itemLabel");
        const oItemInput = this.byId("itemInput");
        const oInstructionText = this.byId("instructionText");

        oItemLabel.setVisible(true);
        oItemInput.setVisible(true);
        oInstructionText.setText("PLEASE ENTER ITEM TO START THE COUNTING");
      },

      _checkInputsAndShowButton: function () {
        const oPlantInput = this.byId("plantInput");
        const oWarehouseInput = this.byId("warehouseTypeInput");
        const oCountingMethodPanel = this.byId("countingMethodPanel");
        const oPlantIcon = this.byId("checkPlant");
        const oWareshouseIcon = this.byId("checkWarehouse");
        const oInstructionText = this.byId("instructionText");

        const sPlantValue = oPlantInput.getValue().trim();
        const sWarehouseValue = oWarehouseInput.getValue().trim();

        const sPlantMaxLength = oPlantInput.getMaxLength();
        const sWarehouseMaxLength = oWarehouseInput.getMaxLength();

        const isPlantValid = sPlantValue.length === sPlantMaxLength;
        const isWarehouseValid = sWarehouseValue.length === sWarehouseMaxLength;

        oPlantIcon.setVisible(isPlantValid);
        oWareshouseIcon.setVisible(isWarehouseValid);

        oCountingMethodPanel.setVisible(isPlantValid && isWarehouseValid);
        oInstructionText.setVisible(isPlantValid && isWarehouseValid);
      },

      _attachInputEventDelegates: function () {
        const oPlantInput = this.byId("plantInput");
        const oWarehouseInput = this.byId("warehouseTypeInput");

        if (oPlantInput) {
          oPlantInput.addEventDelegate({
            onkeydown: (oEvent) => {
              if (oEvent.key === "F7") {
                this.onPlantValueHelp();
                // } else if (oEvent.key === "Enter") {
                //   MessageToast.show("Enter pressed in Plant field");
              }
            },
          });
        }

        if (oWarehouseInput) {
          oWarehouseInput.addEventDelegate({
            onkeydown: (oEvent) => {
              if (oEvent.key === "F7") {
                this.onWarehouseTypeValueHelp();
                // } else if (oEvent.key === "Enter") {
                //   MessageToast.show("Enter pressed in Warehouse Type field");
              }
            },
          });
        }
      },

      onPlantValueHelp: function () {
        this._openPlantSelectDialog();
      },

      onPOValueHelp: function () {
        this._openPOSelectDialog();
      },

      _openPOSelectDialog: function () {
        if (!this._oSelectPODialog) {
          this._oSelectPODialog = new SelectDialog({
            noDataText: "No PO available",
            title: "Select PO",
            items: {
              path: "/ZR_RF_PO_ITEM",
              template: new StandardListItem({
                title: "{PurchaseOrder}",
                description: "{PurchaseOrderItem}",
              }),
            },
            confirm: (oEvent) => {
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                this.byId("poInput").setValue(oSelectedItem.getTitle());
                this._checkInputsAndShowButton();
              } else {
                MessageToast.show("No PO selected");
              }
            },
          });
        }

        this.getView().addDependent(this._oSelectPODialog);
        this._oSelectPODialog.open();
      },
    });
  }
);
