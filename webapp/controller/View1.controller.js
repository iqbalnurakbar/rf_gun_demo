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

      onPressEnter: function () {
        if (this._validateInput()) {
          const oRouter = this.getOwnerComponent().getRouter();
          console.log("HITNAV");
          oRouter.navTo("detail");
        }
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

      _validateInput: function () {
        const sInput = this.byId("poInput");
        const sValue = sInput.getValue();
        let bValid = true;
        if (sValue.length === 0) {
          const sMessage = "PO is required";
          sInput.setValueState("Error");
          sInput.setValueStateText(sMessage);
          setTimeout(() => {
            sInput.focus();
          }, 0);
          bValid = false;
        } else {
          sInput.setValueState("None");
        }
        return bValid;
      },

      _openPOSelectDialog: function () {
        if (!this._oSelectPODialog) {
          this._oSelectPODialog = new SelectDialog({
            noDataText: "No PO available",
            title: "Select PO",
            items: {
              path: "/ZR_RF_PO_ITEM",
              template: new StandardListItem({
                title: "{PurchaseOrderNo}",
                description: "{PurchaseOrderItemNo}",
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
