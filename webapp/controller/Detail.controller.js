sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/routing/History",
], (Controller, MessageToast, MessageBox, History) => {
  "use strict";

  return Controller.extend("rfgundemo.controller.Detail", {

    onInit() {
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("detail").attachPatternMatched(this._onRouteMatched, this);
      this._attachInputEventDelegates();
    },

    _onRouteMatched: function (oEvent) {
      const oArgs = oEvent.getParameter("arguments");
      const sPONumber = oArgs.poNumber;

      console.log("PO Number:", sPONumber);

      // Store PO number
      this.sPONumber = sPONumber;

      // Update page title
      this.getView().byId("dataDetailPage").setTitle("Detail Page - PO: " + sPONumber);

      // Bind list items manually
      this._bindListItems(sPONumber);
    },

    _bindListItems: function (sPONumber) {
      const oList = this.getView().byId("itemsList");
      const sPath = "/ZR_RF_PO_ITEM_MAIN_BETA(P_PurchaseOrderNo='" + sPONumber + "')/Set";

      console.log("Binding list to path:", sPath);

      // Show loading
      //this.getView().setBusy(true);

      oList.bindItems({
        path: sPath,
        template: this._getListItemTemplate(),
        events: {
          dataReceived: function (oEvent) {
            //this.getView().setBusy(false);

            const oBinding = oEvent.getSource();
            const iLength = oBinding.getLength();

            if (iLength > 0) {
              oList.setHeaderText("Order Details (" + iLength + " items)");
              MessageToast.show("Loaded " + iLength + " items for PO " + sPONumber);
            } else {
              oList.setHeaderText("Order Details (No items found)");
              MessageToast.show("No items found for PO " + sPONumber);
            }
          }.bind(this),

          dataRequested: function () {
            //this.getView().setBusy(true);
            console.log("Data requested for PO:", sPONumber);
          }.bind(this)
        }
      });
    },

    _getListItemTemplate: function () {
      return new sap.m.CustomListItem({
        content: [
          new sap.ui.layout.form.SimpleForm({
            editable: true,
            layout: "ResponsiveGridLayout",
            columnsXL: 2,
            columnsL: 2,
            columnsM: 1,
            class: "sapUiResponsiveMargin",
            maxContainerCols: 3,
            width: "auto",
            content: [
              // Line No
              new sap.m.VBox({
                items: [
                  new sap.m.Label({ text: "Line No" }),
                  new sap.m.Input({
                    value: "{PurchaseOrderItemNo}",
                    editable: false,
                    width: "17%"
                  })
                ]
              }),

              // Material and Description
              new sap.m.HBox({
                items: [
                  new sap.m.VBox({
                    class: "sapUiSmallMarginEnd",
                    items: [
                      new sap.m.Label({ text: "Material" }),
                      new sap.m.Input({
                        value: "{Material}",
                        editable: false
                      })
                    ]
                  }),
                  new sap.m.VBox({
                    class: "sapUiSmallMarginEnd",
                    items: [
                      new sap.m.Label({ text: "Material Desc" }),
                      new sap.m.Input({
                        value: "{MaterialDescription}",
                        editable: false
                      })
                    ]
                  })
                ]
              }),

              // Quantities
              new sap.m.HBox({
                items: [
                  new sap.m.VBox({
                    class: "sapUiSmallMarginEnd",
                    items: [
                      new sap.m.Label({ text: "Quantity Suggest" }),
                      new sap.m.Input({
                        value: "{QuantitySuggest}",
                        editable: false
                      })
                    ]
                  }),
                  new sap.m.VBox({
                    class: "sapUiSmallMarginEnd",
                    items: [
                      new sap.m.Label({ text: "Quantity Receive" }),
                      new sap.m.Input({
                        value: "{QuantityReceive}",
                        change: this.onQuantityChange.bind(this)
                      })
                    ]
                  })
                ]
              }),

              // Plant
              new sap.m.HBox({
                items: [
                  new sap.m.VBox({
                    items: [
                      new sap.m.Label({ text: "Plant" }),
                      new sap.m.Input({ value: "{Plant}" })
                    ]
                  })
                ]
              }),

              // Storage Location
              new sap.m.VBox({
                items: [
                  new sap.m.Label({ text: "Storage Location" }),
                  new sap.m.Input({ value: "{StorageLocation}" })
                ]
              }),

              // Confirm Status
              new sap.m.VBox({
                items: [
                  new sap.m.Label({ text: "Confirm Status" }),
                  new sap.m.Button({
                    text: "OK",
                    press: this.onConfirmItem.bind(this)
                  })
                ]
              })
            ]
          })
        ]
      });
    },

    onQuantityChange: function (oEvent) {
      const oInput = oEvent.getSource();
      const oContext = oInput.getBindingContext();
      const sNewValue = oEvent.getParameter("value");
      const sItemNo = oContext.getProperty("PurchaseOrderItemNo");
      const sMaterial = oContext.getProperty("Material");

      // Validate quantity input
      if (sNewValue && sNewValue.trim() !== "" && isNaN(sNewValue)) {
        oInput.setValueState("Error");
        oInput.setValueStateText("Please enter a valid number");
        MessageToast.show("Invalid quantity for item " + sItemNo);
        return;
      }

      // Clear error state if input is valid
      oInput.setValueState("None");

      console.log("Quantity changed for item:", sItemNo, "Material:", sMaterial, "New value:", sNewValue);

      if (sNewValue && sNewValue.trim() !== "") {
        MessageToast.show("Quantity updated for item " + sItemNo);
      }
    },

    onConfirmItem: function (oEvent) {
    },

    onNavBack: function () {
      const oHistory = History.getInstance();
      const sPreviousHash = oHistory.getPreviousHash();

      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      } else {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("mainview", {}, true);
      }
    },
    _attachInputEventDelegates: function () {
      const oDetailPage = this.byId("dataDetailPage");
      if (oDetailPage) {
        console.log("Hit");
        oDetailPage.addEventDelegate({
          onkeydown: (oEvent) => {
            if (oEvent.key === "F3") {
              this.onNavBack();
              // } else if (oEvent.key === "Enter") {
              //   MessageToast.show("Enter pressed in Plant field");
            }
          },
        });
      }
    },
  });
});