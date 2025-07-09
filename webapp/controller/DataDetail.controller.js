sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  (Controller, MessageToast, History, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("rfgundemo.controller.DataDetail", {
      onInit() {
        const oRouter = this.getOwnerComponent().getRouter();
        const oModel = this.getOwnerComponent().getModel();

        const oPurchaseOrderModel = new JSONModel({
          purchaseOrderNumber: "",
          items: []
        });

        this.getView().setModel(oPurchaseOrderModel, "purchaseOrder");

        oRouter.attachRouteMatched(function (oEvent) {
          const oArgs = oEvent.getParameter("arguments");
          if (oArgs && oArgs.purchaseOrderNumber) {
            const sPurchaseOrder = oArgs.purchaseOrderNumber;
            // oPurchaseOrderModel.setProperty(
            //   "/purchaseOrderNumber",
            //   sPurchaseOrder
            // );
            // Get the stored filtered data
            this._loadFilteredData(sPurchaseOrder);
          }
          oModel.refresh();
        }.bind(this));

        // const oList = this.byId("orderList");
        // console.log("Order List:", oList);

        // const oBinding = oList.getBinding("items");
        // const sPONumber = oPurchaseOrderModel.getProperty(
        //   "/purchaseOrderNumber"
        // );

        // if (oBinding) {
        //   // Create a filter object
        //   const oFilter = new Filter(
        //     "PurchaseOrderNo",
        //     FilterOperator.EQ,
        //     sPONumber
        //   );

        //   // Apply the filter to the list binding
        //   oBinding.filter([oFilter]);
        // }
      },

      _loadFilteredData: function (sPurchaseOrder) {
        // Get the stored filtered data from component
        const oDataModel = this.getOwnerComponent().getModel("detailData");

        if (oDataModel) {
          const oData = oDataModel.getData();
          console.log("Retrieved stored data:", oData);

          if (oData && oData.purchaseOrderNumber === sPurchaseOrder) {
            // Add isConfirmed to each individual item
            const aEnhancedItems = oData.items.map(item => ({
              ...item,
              isConfirmed: false
            }));
            // Update the view model with the filtered data
            const oPurchaseOrderModel = this.getView().getModel("purchaseOrder");
            oPurchaseOrderModel.setData({
              purchaseOrderNumber: sPurchaseOrder,
              items: aEnhancedItems
            });
          }
        }
      },

      onNavBack: function () {
        const oHistory = History.getInstance();
        const sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteMainScreen", {}, true);
        }
      },

      _applyPurchaseOrderFilter: function (sPurchaseOrder) {
        const oList = this.byId("orderList");
        const oBinding = oList.getBinding("items");

        if (oBinding) {
          // Create a filter object
          const oFilter = new Filter(
            "PurchaseOrderNo",
            FilterOperator.EQ,
            sPurchaseOrder
          );

          // Apply the filter to the list binding
          oBinding.filter([oFilter]);
        }
      },

      onOkButtonPress: function (oEvent) {
        const oButton = oEvent.getSource();
        const bPressed = oButton.getPressed();
        const oBindingContext = oButton.getBindingContext("purchaseOrder");

        if (oBindingContext) {
          const oModel = this.getView().getModel("purchaseOrder");
          const sPath = oBindingContext.getPath(); // e.g., "/items/0", "/items/1"
          const oRowData = oBindingContext.getObject();


          console.log(`Item ${oRowData.PurchaseOrderItemNo} isConfirmed: ${bPressed}`);
          console.log("Updated row data:", oBindingContext.getObject());

          if (bPressed) {
            // Update THIS specific item's isConfirmed property
            oModel.setProperty(sPath + "/isConfirmed", true);
            MessageToast.show(`Item ${oRowData.PurchaseOrderItemNo} confirmed`);
          } else {
            oModel.setProperty(sPath + "/isConfirmed", false);
            MessageToast.show(`Item ${oRowData.PurchaseOrderItemNo} unconfirmed`);
          }
        }
      }
    });
  }
);