sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
  ],
  (Controller, MessageToast, Filter, FilterOperator, JSONModel, History) => {
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
        oPurchaseOrderInput.setValueState("None");
        oPurchaseOrderInput.setValueStateText("");

        this._checkPurchaseOrder(sPurchaseOrder);
      },

      _attachInputEventDelegates: function () {
        const oMainScreenPage = this.byId("mainScreenPage");
        if (oMainScreenPage) {
          oMainScreenPage.addEventDelegate({
            onkeydown: (oEvent) => {
              if (oEvent.key === "F4") {
                oEvent.preventDefault();
                this.onPurchaseOrderSubmit();
              }
            },
          });
        }
      },

      _checkPurchaseOrder: function (sPurchaseOrder) {
        const oModel = this.getView().getModel();
        const sPath =
          "/ZR_RF_PO_ITEM_MAIN(P_PurchaseOrderNo='" +
          sPurchaseOrder.trim() +
          "')/Set";
        const oListBinding = oModel.bindList(sPath);

        oListBinding.requestContexts().then(
          function (aContexts) {
            this.getView().setBusy(false);
            if (aContexts.length === 0) {
              MessageToast.show(
                "No data found for Purchase Order: " + sPurchaseOrder
              );
              return;
            }

            this._navigateToDetail(sPurchaseOrder);
          }.bind(this),
          function () {
            this.getView().setBusy(false);
            MessageToast.show(
              "Error retrieving data for Purchase Order: " + sPurchaseOrder
            );
          }.bind(this)
        );
      },

      _navigateToDetail: function (sPurchaseOrder) {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("RouteDataDetail", {
          purchaseOrderNumber: sPurchaseOrder,
        });
      },
    });
  }
);
