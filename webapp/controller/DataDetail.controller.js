sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
  ],
  function (Controller, MessageToast, History) {
    "use strict";

    return Controller.extend("rfgundemo.controller.DataDetail", {
      onInit: function () {
        var that = this;
        var oRouter = this.getOwnerComponent().getRouter();
        this.sPurchaseOrderNumber = "";

        oRouter.attachRouteMatched(function (oEvent) {
          var oArgs = oEvent.getParameter("arguments");
          if (oArgs && oArgs.purchaseOrderNumber) {
            that.getView().setBusy(true);
            that._loadPurchaseOrderData(oArgs.purchaseOrderNumber);
            that._setOrderDetailsTitle(oArgs.purchaseOrderNumber);
            that.sPurchaseOrderNumber = oArgs.purchaseOrderNumber;
          }
        });

        this._attachInputEventDelegates();
      },

      onNavBack: function () {
        var oHistory = History.getInstance();
        var sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          var oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteMainScreen", {}, true);
        }
      },

      onSaveAndPostButtonPress: function () {
        const oList = this.byId("orderList");
        const aSelectedItems = oList.getSelectedItems();
        const aSelectedData = [];
        console.log("Selected Items:", aSelectedItems);

        aSelectedItems.forEach((item) => {
          const oItemData = {};
          const aCells = item.getCells(); // ✅ Use getCells() instead of getContent()

          const MaterialDocument = "";
          const PurchaseOrder = this.sPurchaseOrderNumber;
          const PurchaseOrderItem = aCells[0].getValue(); // Line No
          const Material = aCells[1].getValue(); // Material
          const MaterialDescription = aCells[2].getValue(); // Material Desc
          const QuantitySuggest = parseFloat(aCells[4].getValue()).toFixed(3); // Quantity Suggest
          const QuantityReceive = parseFloat(aCells[5].getValue()).toFixed(3); // Quantity Receive
          const QuantityUnit = aCells[6].getValue(); // Quantity Unit
          const Plant = aCells[7].getValue(); // Plant
          const StorageLocation = aCells[8].getValue(); // Storage Location
          const ConfirmStatus = true;

          oItemData["MaterialDocument"] = MaterialDocument;
          oItemData["PurchaseOrder"] = PurchaseOrder;
          oItemData["PurchaseOrderItem"] = PurchaseOrderItem;
          oItemData["Material"] = Material;
          oItemData["MaterialDescription"] = MaterialDescription;
          oItemData["QuantitySuggest"] = QuantitySuggest;
          oItemData["QuantityReceive"] = QuantityReceive;
          oItemData["QuantityUnit"] = QuantityUnit;
          oItemData["Plant"] = Plant;
          oItemData["StorageLocation"] = StorageLocation;
          oItemData["ConfirmStatus"] = ConfirmStatus;

          aSelectedData.push(oItemData);
        });

        if (aSelectedData.length === 0) {
          MessageToast.show("Please select items and enter valid quantities");
          return;
        }

        console.log("Data from Selected Items:", aSelectedData);
        this._postToMigoAPI(aSelectedData);
      },

      _postToMigoAPI: function (aBAPIData) {
        const that = this;
        const oModel = this.getView().getModel();

        // Try the simple flat structure first
        const body = {
          MaterialDocument: "",
          PurchaseOrder: aBAPIData[0].PurchaseOrder,
          item: [...aBAPIData],
        };

        oModel
          .bindList("/ZC_RFH_MIGO_DEMO")
          .create(body)
          .created()
          .then(() => {
            MessageToast.show("Data posted successfully");
          })
          .catch((oError) => {
            console.log("=== ERROR DETAILS ===");
            console.log("Error object:", oError);
            console.log("Error message:", oError.message);
            console.log("Error status:", oError.status);
            console.error("Full error:", oError);
            MessageToast.show("Error posting data: " + oError.message);
          });
      },

      _attachInputEventDelegates: function () {
        var oDataDetailPage = this.byId("dataDetailPage");
        if (oDataDetailPage) {
          oDataDetailPage.addEventDelegate({
            onkeydown: function (oEvent) {
              if (oEvent.key === "F3") {
                oEvent.preventDefault();
                this.onNavBack();
              } else if (oEvent.key === "F8") {
                oEvent.preventDefault();
                this.onSaveAndPostButtonPress();
              }
            }.bind(this),
          });
        }
      },

      _loadPurchaseOrderData: function (sPurchaseOrder) {
        var sPath =
          "/ZR_RF_PO_ITEM_MAIN(P_PurchaseOrderNo='" +
          sPurchaseOrder.trim() +
          "')/Set";

        var oList = this.byId("orderList");
        oList.bindItems({
          path: sPath,
          template: this.byId("orderList").getItems()[0].clone(),
          events: {
            dataReceived: function (oEvent) {
              this.getView().setBusy(false);
              if (!oEvent.getParameters().data) {
                MessageToast.show(
                  "No data found for Purchase Order: " + sPurchaseOrder
                );
              } else {
                // Use setTimeout to ensure the DOM is rendered
                setTimeout(() => {
                  var oFirstItem = oList.getItems()[0];
                  if (oFirstItem) {
                    // Assuming a standard way to find the input
                    var oInput = oFirstItem.getCells()[4];
                    if (oInput) {
                      oInput.focus();
                    } else {
                      console.warn("Quantity Receive Input not found");
                    }
                  } else {
                    console.warn("First item not found");
                  }
                }, 100); // Adjust delay as needed
              }
            }.bind(this),
            dataRequested: function () {},
          },
        });
      },

      _setOrderDetailsTitle: function (sPurchaseOrder) {
        var oTitle = this.byId("orderDetailsTitle");
        if (oTitle) {
          oTitle.setText("Order Details for " + sPurchaseOrder);
        }
      },

      onOkButtonPress: function (oEvent) {
        const oButton = oEvent.getSource();
        const bPressed = oButton.getPressed();

        // Get the parent list item
        const oList = this.byId("orderList");
        const oListItem = oButton.getParent();

        if (bPressed) {
          oButton.setIcon("sap-icon://accept");
          oButton.setType("Emphasized");
        } else {
          oButton.setIcon("");
          oButton.setType("Default");
        }

        // Update list item selection state
        oList.setSelectedItem(oListItem, bPressed);
      },
    });
  }
);
