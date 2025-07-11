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
        const that = this;
        const oRouter = this.getOwnerComponent().getRouter();

        oRouter.attachRouteMatched(function (oEvent) {
          const oArgs = oEvent.getParameter("arguments");
          if (oArgs && oArgs.purchaseOrderNumber) {
            that.getView().setBusy(true);
            that
              ._loadPurchaseOrderData(oArgs.purchaseOrderNumber)
              .then(() => {
                that.getView().setBusy(false);
              })
              .catch(() => {
                that.getView().setBusy(false);
              });
          }
        });

        this._attachInputEventDelegates();
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

      onSaveAndPostButtonPress: function () {},

      _attachInputEventDelegates: function () {
        const oDataDetailPage = this.byId("dataDetailPage");
        if (oDataDetailPage) {
          oDataDetailPage.addEventDelegate({
            onkeydown: (oEvent) => {
              if (oEvent.key === "F3") {
                oEvent.preventDefault();
                this.onNavBack();
              } else if (oEvent.key === "F8") {
                oEvent.preventDefault();
                this.onSaveAndPostButtonPress();
              }
            },
          });
        }
      },

      _loadPurchaseOrderData: function (sPurchaseOrder) {
        const oPurchaseOrderModel =
          this.getOwnerComponent().getModel("purchaseOrder");

        return new Promise((resolve) => {
          if (!oPurchaseOrderModel) {
            const oNewModel = new JSONModel({
              purchaseOrderNumber: "",
              items: [],
            });

            this.getOwnerComponent().setModel(oNewModel, "purchaseOrder");
            this._loadPurchaseOrderDataFromService(sPurchaseOrder).then(
              resolve
            );
          } else {
            const aItems = oPurchaseOrderModel.getProperty("/items") || [];
            if (Array.isArray(aItems) && aItems.length > 0) {
              this._bindDataToList(aItems);
              resolve();
            } else {
              this._loadPurchaseOrderDataFromService(sPurchaseOrder).then(
                resolve
              );
            }
          }
        });
      },

      _loadPurchaseOrderDataFromService: function (sPurchaseOrder) {
        const oModel = this.getView().getModel();
        const sPath = `/ZR_RF_PO_ITEM_MAIN_BETA(P_PurchaseOrderNo='${sPurchaseOrder.trim()}')/Set`;
        const oListBinding = oModel.bindList(sPath);

        return oListBinding.requestContexts().then(
          function (aContexts) {
            if (aContexts.length === 0) {
              MessageToast.show(
                `No data found for Purchase Order: ${sPurchaseOrder}`
              );
              return;
            }

            const oPurchaseOrderModel =
              this.getOwnerComponent().getModel("purchaseOrder");
            oPurchaseOrderModel.setProperty(
              "/purchaseOrderNumber",
              sPurchaseOrder
            );
            oPurchaseOrderModel.setProperty(
              "/items",
              aContexts.map((oContext) => oContext.getObject())
            );
          }.bind(this),
          function () {
            MessageToast.show(
              `Error retrieving data for Purchase Order: ${sPurchaseOrder}`
            );
          }.bind(this)
        );
      },
    });
  }
);
