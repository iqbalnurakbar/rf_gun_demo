sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
  ],
  (Controller, MessageToast, Filter, FilterOperator, JSONModel) => {
    "use strict";

    return Controller.extend("rfgundemo.controller.MainScreen", {
      onInit() {
        const oRouter = this.getOwnerComponent().getRouter();
        const oModel = this.getOwnerComponent().getModel();
        oRouter.attachRouteMatched(
          function (oEvent) {
            oModel.refresh();
          }.bind(this)
        );
      },

      onPurchaseOrderSubmit: function () {
        const oPurchaseOrderInput = this.byId("purchaseOrderNumber");
        const sPurchaseOrder = oPurchaseOrderInput.getValue();

        if (!sPurchaseOrder) {
          oPurchaseOrderInput.setValueState("Error");
          oPurchaseOrderInput.setValueStateText(
            "Purchase Order number is required."
          );
          oPurchaseOrderInput.focus();
          return;
        }
        // Reset value state if input is valid
        oPurchaseOrderInput.setValueState("None");
        oPurchaseOrderInput.setValueStateText("");

        // TODO: Validate the input format
        // Check if the input is valid from the OData Service

        const oModel = this.getView().getModel();
        const oBindingContext = oModel.bindList(
          "/ZR_RF_PO_ITEM_MAIN",
          null,
          null,
          new Filter({
            path: "PurchaseOrderNo",
            operator: FilterOperator.EQ,
            value1: sPurchaseOrder,
          })
        );
        console.log("Binding context:", oBindingContext);
        oBindingContext
          .requestContexts()
          .then(
            function (aContexts) {
              // Check if any contexts are returned
              if (aContexts.length > 0) {
                const aFilteredData = aContexts.map(context => context.getObject());
                // Purchase Order found
                console.log("Purchase Order found:", aContexts[0].getObject());
                MessageToast.show(
                  `Purchase Order ${sPurchaseOrder} found. Navigating to detail.`
                );
                this._storeFilteredData(aFilteredData, sPurchaseOrder);
                this._navigateToDetail(sPurchaseOrder);
              } else {
                // Purchase Order not found
                MessageToast.show(
                  `Purchase Order ${sPurchaseOrder} not found. Please check the number.`
                );
              }
            }.bind(this)
          )
          .catch(
            function (oError) {
              console.error(oError);
              MessageToast.show("Error loading data. Please try again.");

              // debug only
              this._navigateToDetail(sPurchaseOrder);
            }.bind(this)
          );
      },

      _navigateToDetail: function (sPurchaseOrder) {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("RouteDataDetail", {
          purchaseOrderNumber: sPurchaseOrder,
        });
      },

      _storeFilteredData: function (aFilteredData, sPurchaseOrder) {
        // Create or get existing JSON model for passing data
        let oDataModel = this.getOwnerComponent().getModel("detailData");
        if (!oDataModel) {
          oDataModel = new JSONModel();
          this.getOwnerComponent().setModel(oDataModel, "detailData");
        }

        // Store the filtered data
        oDataModel.setData({
          purchaseOrderNumber: sPurchaseOrder,
          items: aFilteredData
        });
      },
    });
  }
);
