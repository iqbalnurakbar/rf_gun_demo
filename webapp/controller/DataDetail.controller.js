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
            // Update the view model with the filtered data
            const oPurchaseOrderModel = this.getView().getModel("purchaseOrder");
            oPurchaseOrderModel.setData({
              purchaseOrderNumber: sPurchaseOrder,
              items: oData.items
            });

            console.log("Data loaded in detail view:", oPurchaseOrderModel.getData());
          } else {
            console.error("No matching data found for PO:", sPurchaseOrder);
          }
        } else {
          console.error("No detailData model found");
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
    });
  }
);
