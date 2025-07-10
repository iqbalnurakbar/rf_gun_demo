sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/m/MessageToast',
    'sap/ui/core/routing/History',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
  ],
  // @ts-ignore
  (Controller, MessageToast, History, JSONModel, Filter, FilterOperator) => {
    'use strict';

    return Controller.extend('rfgundemo.controller.DataDetail', {
      onInit() {
        const that = this;
        const oRouter = this.getOwnerComponent().getRouter();

        oRouter.attachRouteMatched(
          function (oEvent) {
            const oArgs = oEvent.getParameter('arguments');
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
          }.bind(this)
        );

        this._attachInputEventDelegates();
      },

      onNavBack: function () {
        const oHistory = History.getInstance();
        const sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo('RouteMainScreen', {}, true);
        }
      },

      onSaveAndPostButtonPress: function () {
        const oList = this.byId('orderList');
        const aSelectedItems = oList.getSelectedItems();
        const aSelectedData = [];

        aSelectedItems.forEach((item, index) => {
          const oItemData = {};
          const sId = item.getId();

          // Get all the input references
          const quantitySuggestInput = sap.ui.getCore().byId(`${sId}-quantitySuggestInput`);
          const quantityReceiveInput = sap.ui.getCore().byId(`${sId}-quantityReceiveInput`);
          const purchaseOrderItemInput = sap.ui.getCore().byId(`${sId}-purchaseOrderItemNoInput`);
          const materialInput = sap.ui.getCore().byId(`${sId}-materialInput`);
          const materialDescInput = sap.ui.getCore().byId(`${sId}-materialDescriptionInput`);
          const plantInput = sap.ui.getCore().byId(`${sId}-plantInput`);
          const storageLocationInput = sap.ui.getCore().byId(`${sId}-storageLocationInput`);

          // Get all the values
          // @ts-ignore
          const quantitySuggestValue = quantitySuggestInput?.getValue() || '';
          // @ts-ignore
          const quantityReceiveValue = quantityReceiveInput?.getValue() || '';
          // @ts-ignore
          const purchaseOrderItemValue = purchaseOrderItemInput?.getValue() || '';
          // @ts-ignore
          const materialValue = materialInput?.getValue() || '';
          // @ts-ignore
          const materialDescValue = materialDescInput?.getValue() || '';
          // @ts-ignore
          const plantValue = plantInput?.getValue() || '';
          // @ts-ignore
          const storageLocationValue = storageLocationInput?.getValue() || '';

          // Validate quantity receive
          const parsedQuantityReceive = parseFloat(quantityReceiveValue);
          if (!quantityReceiveValue || isNaN(parsedQuantityReceive) || parsedQuantityReceive <= 0) {
            MessageToast.show(`Please enter a valid Quantity Receive value for item ${index + 1}`);
            return;
          }

          const parsedQuantitySuggest = parseFloat(quantitySuggestValue);


          // NOW populate oItemData with ALL the values
          oItemData['MaterialDocument'] = "0000000000";
          oItemData['PurchaseOrder'] = this.getOwnerComponent().getModel('purchaseOrder').getProperty('/purchaseOrderNumber');
          oItemData['PurchaseOrderItem'] = purchaseOrderItemValue;
          oItemData['Material'] = materialValue;
          oItemData['MaterialDescription'] = materialDescValue;
          oItemData['QuantitySuggest'] = parsedQuantitySuggest.toFixed(3);
          oItemData['QuantityReceive'] = parsedQuantityReceive.toFixed(3);
          oItemData['QuantityUnit'] = "PC";
          oItemData['Plant'] = plantValue;
          oItemData['StorageLocation'] = storageLocationValue;
          oItemData['ConfirmStatus'] = true;

          aSelectedData.push(oItemData);
        });

        if (aSelectedData.length === 0) {
          MessageToast.show("Please select items and enter valid quantities");
          return;
        }

        console.log('Data from Selected Items:', aSelectedData);
        this._postToMigoAPI(aSelectedData);
      },


      _postToMigoAPI: function (oData) {
        // Get PurchaseOrder from your existing model instead of non-existent input
        const sPurchaseOrder = this.getOwnerComponent().getModel('purchaseOrder').getProperty('/purchaseOrderNumber');

        console.log("PurchaseOrder:", sPurchaseOrder);
        console.log("Item data:", oData);

        const oModel = this.getView().getModel();

        // Try the simple flat structure first
        const body = {
          MaterialDocument: "",
          PurchaseOrder: sPurchaseOrder,
          item: [...oData]
        };

        oModel.bindList("/ZC_RFH_MIGO_DEMO")
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
        const oDataDetailPage = this.byId('dataDetailPage');
        if (oDataDetailPage) {
          oDataDetailPage.addEventDelegate({
            onkeydown: oEvent => {
              if (oEvent.key === 'F3') {
                oEvent.preventDefault();
                this.onNavBack();
              } else if (oEvent.key === 'F8') {
                oEvent.preventDefault();
                this.onSaveAndPostButtonPress();
              }
            },
          });
        }
      },

      _loadPurchaseOrderData: function (sPurchaseOrder) {
        const oPurchaseOrderModel =
          this.getOwnerComponent().getModel('purchaseOrder');

        // @ts-ignore
        return new Promise(resolve => {
          if (!oPurchaseOrderModel) {
            const oNewModel = new JSONModel({
              purchaseOrderNumber: '',
              items: [],
            });

            this.getOwnerComponent().setModel(oNewModel, 'purchaseOrder');
            this._loadPurchaseOrderDataFromService(sPurchaseOrder).then(
              resolve
            );
          } else {
            const aItems = oPurchaseOrderModel.getProperty('/items') || [];
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
        const sPath = `/ZR_RF_PO_ITEM_MAIN(P_PurchaseOrderNo='${sPurchaseOrder.trim()}')/Set`;
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
              this.getOwnerComponent().getModel('purchaseOrder');
            oPurchaseOrderModel.setProperty(
              '/purchaseOrderNumber',
              sPurchaseOrder
            );
            oPurchaseOrderModel.setProperty(
              '/items',
              aContexts.map(oContext => oContext.getObject())
            );

            this._bindDataToList(
              aContexts.map(oContext => oContext.getObject())
            );
          }.bind(this),
          function () {
            MessageToast.show(
              `Error retrieving data for Purchase Order: ${sPurchaseOrder}`
            );
          }.bind(this)
        );
      },

      // @ts-ignore
      _bindDataToList: function (aItems) {
        const oList = this.byId('orderList');
        oList.bindItems({
          path: 'purchaseOrder>/items',
          factory: this._createListItem.bind(this),
          templateShareable: false,
        });

        // Focus on the 'Quantity Receive' input for the first item after all items are rendered.
        oList.attachEventOnce('updateFinished', function () {
          setTimeout(() => {
            const oItems = oList.getItems();
            if (oItems.length > 0) {
              const oInput = oItems[0]
                .getContent()[0]
                .getItems()[4]
                .getItems()[1];
              if (oInput) {
                oInput.focus();
              }
            }
          }, 500);
        });
      },

      // @ts-ignore
      _createListItem: function (sId, oContext) {
        return new sap.m.CustomListItem(sId, {
          content: [
            new sap.m.HBox({
              items: [
                new sap.m.VBox({
                  items: [
                    new sap.m.Label({
                      text: 'Line No',
                      labelFor: `${sId}-purchaseOrderItemNoInput`,
                    }),
                    new sap.m.Input({
                      id: `${sId}-purchaseOrderItemNoInput`,
                      value: '{purchaseOrder>PurchaseOrderItemNo}',
                      editable: false,
                    }),
                  ],
                }).addStyleClass('sapUiSmallMargin'),
                new sap.m.VBox({
                  items: [
                    new sap.m.Label({
                      text: 'Material',
                      labelFor: `${sId}-materialInput`,
                    }),
                    new sap.m.Input({
                      id: `${sId}-materialInput`,
                      value: '{purchaseOrder>Material}',
                      editable: false,
                    }),
                  ],
                }).addStyleClass('sapUiSmallMargin'),
                new sap.m.VBox({
                  items: [
                    new sap.m.Label({
                      text: 'Material Desc',
                      labelFor: `${sId}-materialDescriptionInput`,
                    }),
                    new sap.m.Input({
                      id: `${sId}-materialDescriptionInput`,
                      value: '{purchaseOrder>MaterialDescription}',
                      editable: false,
                    }),
                  ],
                }).addStyleClass('sapUiSmallMargin'),
                ,
                new sap.m.VBox({
                  items: [
                    new sap.m.Label({
                      text: 'Quantity Suggest',
                      labelFor: `${sId}-quantitySuggestInput`,
                    }),
                    new sap.m.Input({
                      id: `${sId}-quantitySuggestInput`,
                      value: '{purchaseOrder>QuantitySuggest}',
                      editable: false,
                    }),
                  ],
                }).addStyleClass('sapUiSmallMargin'),
                ,
                new sap.m.VBox({
                  items: [
                    new sap.m.Label({
                      text: 'Quantity Receive',
                      labelFor: `${sId}-quantityReceiveInput`,
                    }),
                    new sap.m.Input({
                      id: `${sId}-quantityReceiveInput`,
                      value: '',
                    }),
                  ],
                }).addStyleClass('sapUiSmallMargin'),
                ,
                new sap.m.VBox({
                  items: [
                    new sap.m.Label({
                      text: 'Plant',
                      labelFor: `${sId}-plantInput`,
                    }),
                    new sap.m.Input({
                      id: `${sId}-plantInput`,
                      value: '{purchaseOrder>Plant}',
                    }),
                  ],
                }).addStyleClass('sapUiSmallMargin'),
                ,
                new sap.m.VBox({
                  items: [
                    new sap.m.Label({
                      text: 'Storage Location',
                      labelFor: `${sId}-storageLocationInput`,
                    }),
                    new sap.m.Input({
                      id: `${sId}-storageLocationInput`,
                      value: '{purchaseOrder>StorageLocation}',
                    }),
                  ],
                }).addStyleClass('sapUiSmallMargin'),
                ,
                new sap.m.VBox({
                  items: [
                    new sap.m.Label({
                      text: 'Confirm Status',
                      labelFor: `${sId}-confirmStatusButton`,
                    }),
                    new sap.m.ToggleButton({
                      id: `${sId}-confirmStatusButton`,
                      text: "OK",
                      width: '100%',
                      enabled: true,
                      pressed: '{purchaseOrder>ConfirmStatus}',
                      press: this.onOkButtonPress.bind(this),
                      layoutData: new sap.m.FlexItemData({
                        growFactor: 1
                      })
                    })
                  ],
                }).addStyleClass('sapUiSmallMargin'),
                ,
              ],
            }),
          ],
        });
      },
      onOkButtonPress: function (oEvent) {
        const oButton = oEvent.getSource();
        const bPressed = oButton.getPressed();

        // Get the parent list item
        const oListItem = oButton.getParent().getParent().getParent(); // Navigate to CustomListItem
        const oList = this.byId('orderList');

        if (bPressed) {
          oButton.setIcon("sap-icon://accept");
          oButton.setType("Emphasized");
        } else {
          oButton.setIcon("");
          oButton.setType("Default");
        }

        // Update model data (Confirm Status)
        const oContext = oButton.getBindingContext('purchaseOrder');
        if (oContext) {
          const sPath = oContext.getPath() + '/ConfirmStatus';
          const oPurchaseOrderModel = this.getOwnerComponent().getModel('purchaseOrder');
          oPurchaseOrderModel.setProperty(sPath, bPressed);
        }

        // Update list item selection state
        oList.setSelectedItem(oListItem, bPressed);

        console.log(`Item ${bPressed ? 'confirmed and selected' : 'unconfirmed and deselected'}`);
      },
    });
  }
);
