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

      onWarehouseTypeValueHelp: function () {
        this._openWarehouseTypeSelectDialog();
      },

      onItemValueHelp: function () {
        this._openItemSelectDialog();
      },

      _openItemSelectDialog: function () {
        if (!this._oItemSelectDialog) {
          this._oItemSelectDialog = new SelectDialog({
            noDataText: "No plants available",
            title: "Select Plant",
            items: {
              path: "/ZC_EWM_PLANT",
              template: new StandardListItem({
                title: "{Plant}",
                description: "{PlantName}",
              }),
            },
            confirm: (oEvent) => {
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                console.log("HITITEM");
                this.byId("itemInput").setValue(oSelectedItem.getTitle());
                this._checkInputsAndShowButton();
              } else {
                MessageToast.show("No plant selected");
              }
            },
          });
        }

        this.getView().addDependent(this._oItemSelectDialog);
        this._oItemSelectDialog.open();
      },

      _openPlantSelectDialog: function () {
        if (!this._oSelectPlantDialog) {
          this._oSelectPlantDialog = new SelectDialog({
            noDataText: "No plants available",
            title: "Select Plant",
            items: {
              path: "/ZC_EWM_PLANT",
              template: new StandardListItem({
                title: "{Plant}",
                description: "{PlantName}",
              }),
            },
            confirm: (oEvent) => {
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                this.byId("plantInput").setValue(oSelectedItem.getTitle());
                this._checkInputsAndShowButton();
              } else {
                MessageToast.show("No plant selected");
              }
            },
          });
        }

        this.getView().addDependent(this._oSelectPlantDialog);
        this._oSelectPlantDialog.open();
      },

      _openWarehouseTypeSelectDialog: function () {
        if (!this._oSelectWarehouseTypeSelectDialog) {
          this._oSelectWarehouseTypeSelectDialog = new SelectDialog({
            noDataText: "No warehouse type available",
            title: "Select Warehouse Type",
            items: {
              path: "/ZC_EWM_WAREHOUSE_TYPE",
              template: new StandardListItem({
                title: "{warehouse_type}",
                description: "{warehouse_type}",
              }),
            },
            confirm: (oEvent) => {
              console.log("Hit warehouse");
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                this.byId("warehouseTypeInput").setValue(
                  oSelectedItem.getTitle()
                );
                this._checkInputsAndShowButton();
              } else {
                MessageToast.show("No warehouse type selected");
              }
            },
          });
        }

        this.getView().addDependent(this._oSelectWarehouseTypeSelectDialog);
        this._oSelectWarehouseTypeSelectDialog.open();
      },
    });
  }
);
