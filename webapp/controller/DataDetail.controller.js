sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/m/MessageToast',
    'sap/ui/core/routing/History',
    "sap/ui/core/Fragment",
    "sap/m/plugins/UploadSetwithTable",
  ],
  function (Controller, MessageToast, History, Fragment, UploadSetwithTable) {
    'use strict';

    return Controller.extend('rfgundemo.controller.DataDetail', {
      onInit: function () {
        var that = this;
        var oRouter = this.getOwnerComponent().getRouter();
        this.sPurchaseOrderNumber = "";

        oRouter.attachRouteMatched(function (oEvent) {
          var oArgs = oEvent.getParameter('arguments');
          if (oArgs && oArgs.purchaseOrderNumber) {
            that.getView().setBusy(true);
            that._loadPurchaseOrderData(oArgs.purchaseOrderNumber);
            that._setOrderDetailsTitle(oArgs.purchaseOrderNumber);
            that.sPurchaseOrderNumber = oArgs.purchaseOrderNumber;
          }
        });

        this._attachInputEventDelegates();
      },

      onPluginActivated: function (oEvent) {
        this.oUploadPluginInstance = oEvent.getParameter("oPlugin");
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

      onDownload: function (oEvent) {
        const oContexts = this.byId("orderList").getSelectedContexts();
        if (oContexts && oContexts.length) {
          oContexts.forEach((oContext) =>
            this.oUploadPluginInstance.download(oContext, true)
          );
        }
      },

      onUpload: async function () {
        this.loadFragment({
          id: "uploadFileDialog",
          name: "rfgundemo.view.fragments.UploadFileDialog",
          controller: this,
        }).then((fragment) => {
          this.dialog = fragment;
          this.dialog.open();
        });
      },

      onCancelPress: function () {
        this.dialog.close();
        this.dialog.destroy();
      },

      onUploadPress: async function () {
        if (!this.fileContent || !this.fileName) {
          MessageToast.show("Please select a file to upload.");
          return;
        }

        try {
          // * Prepare OData action bound to the upload service
          const oModel = this.getView().getModel();
          const oContext = this.getView().getBindingContext();
          console.log("Binding Context:", oContext);

          const oAction = oModel.bindContext(
            "/ZC_RFH_MIGO_DEMO/com.sap.gateway.srvd_a2x.zui_rf_po_item.v0001.uploadFile(...)",
            oContext
          );

          // // * Set required parameters on the action
          oAction.setParameter("fileName", this.fileName);
          oAction.setParameter("fileContent", this.fileContent);
          oAction.setParameter("mimeType", this.mimeType);
          oAction.setParameter("fileExtension", this.fileExtension);

          // // * Invoke the service call
          oAction.execute();

          // // * On success: notify user & clean up
          MessageToast.show("Upload Success");
          this.dialog.close();
          this.dialog.destroy();
        } catch (error) {
          // ! Upload failed: log error & inform user
          console.error("Upload failed:", error);
          MessageToast.show("Upload Failed");
        }
      },

      onFileChange: function (oEvent) {
        // ? Retrieve selected File objects
        const aFiles = oEvent.getParameter("files");
        if (!aFiles || aFiles.length === 0) {
          MessageToast.show(this._getText("noFileSelected"));
          this.resetFileData();
          return;
        }

        const oFile = aFiles[0];
        this.fileName = oFile.name;
        this.mimeType = oFile.type;

        // * Derive extension from file name
        const aNameParts = oFile.name.split(".");
        this.fileExtension =
          aNameParts.length > 1 ? aNameParts.pop().toLowerCase() : "";

        // * Use FileReader to load as DataURL (base64)
        const oReader = new FileReader();
        oReader.onload = function (e) {
          const sDataUrl = e.target.result;
          this.fileContent = sDataUrl.split(",")[1];
          MessageToast.show("File loaded successfully: " + oFile.name);
        }.bind(this);

        oReader.onerror = function (error) {
          // ! File read error: log & reset data
          console.error("File read error:", error);
          MessageToast.show("Error reading file: " + oFile.name);
          this.resetFileData();
        }.bind(this);

        oReader.readAsDataURL(oFile);
      },

      onSaveAndPostButtonPress: function () {
        const oList = this.byId('orderList');
        const aSelectedItems = oList.getSelectedItems();
        const aSelectedData = [];

        aSelectedItems.forEach(item => {
          const oItemData = {};
          const oHBox = item.getContent()[0];
          const aVBoxes = oHBox.getItems();

          const MaterialDocument = "";
          const PurchaseOrder = this.sPurchaseOrderNumber;
          const PurchaseOrderItem = aVBoxes[0].getItems()[1].getValue();
          const Material = aVBoxes[1].getItems()[1].getValue();
          const MaterialDescription = aVBoxes[2].getItems()[1].getValue();
          const QuantitySuggest = parseFloat(aVBoxes[3].getItems()[1].getValue()).toFixed(3);
          const QuantityReceive = parseFloat(aVBoxes[4].getItems()[1].getValue()).toFixed(3);
          const QuantityUnit = aVBoxes[5].getItems()[1].getValue();
          const Plant = aVBoxes[6].getItems()[1].getValue();
          const StorageLocation = aVBoxes[7].getItems()[1].getValue();
          const ConfirmStatus = true;

          oItemData['MaterialDocument'] = MaterialDocument;
          oItemData['PurchaseOrder'] = PurchaseOrder;
          oItemData['PurchaseOrderItem'] = PurchaseOrderItem;
          oItemData['Material'] = Material;
          oItemData['MaterialDescription'] = MaterialDescription;
          oItemData['QuantitySuggest'] = QuantitySuggest;
          oItemData['QuantityReceive'] = QuantityReceive;
          oItemData['QuantityUnit'] = QuantityUnit;
          oItemData['Plant'] = Plant;
          oItemData['StorageLocation'] = StorageLocation;
          oItemData['ConfirmStatus'] = ConfirmStatus;

          aSelectedData.push(oItemData);
        });

        if (aSelectedData.length === 0) {
          MessageToast.show("Please select items and enter valid quantities");
          return;
        }

        console.log('Data from Selected Items:', aSelectedData);
        this._postToMigoAPI(aSelectedData);
      },

      _postToMigoAPI: function (aBAPIData) {
        const that = this
        const oModel = this.getView().getModel();

        // Try the simple flat structure first
        const body = {
          MaterialDocument: "",
          PurchaseOrder: aBAPIData[0].PurchaseOrder,
          item: [...aBAPIData]
        };

        oModel.bindList("/ZC_RFH_MIGO_DEMO")
          .create(body)
          .created()
          .then(() => {
            MessageToast.show("Data posted successfully");
            that._loadPurchaseOrderData(aBAPIData[0].PurchaseOrder);
            oModel.refresh();
          })
          .catch((oError) => {
            MessageToast.show("Error posting data: " + oError.message);
            that._loadPurchaseOrderData(aBAPIData[0].PurchaseOrder);
            oModel.refresh();
          });
      },

      _attachInputEventDelegates: function () {
        var oDataDetailPage = this.byId('dataDetailPage');
        if (oDataDetailPage) {
          oDataDetailPage.addEventDelegate({
            onkeydown: function (oEvent) {
              if (oEvent.key === 'F3') {
                oEvent.preventDefault();
                this.onNavBack();
              } else if (oEvent.key === 'F8') {
                oEvent.preventDefault();
                this.onSaveAndPostButtonPress();
              }
            }.bind(this),
          });
        }
      },

      _resetAfterSuccessfulPost: function () {
        const oList = this.byId('orderList');

        // Clear all selections
        oList.removeSelections();

        // Reset all confirm buttons and quantity receive fields
        oList.getItems().forEach(function (oItem) {
          const oHBox = oItem.getContent()[0];
          const aVBoxes = oHBox.getItems();

          // Reset Quantity Receive input (index 4)
          const oQuantityReceiveInput = aVBoxes[4].getItems()[1];
          oQuantityReceiveInput.setValue("");

          // Reset Confirm Status button (index 9)
          const oConfirmButton = aVBoxes[9].getItems()[1];
          oConfirmButton.setPressed(false);
          oConfirmButton.setIcon("");
          oConfirmButton.setType("Default");
        });
      },

      _loadPurchaseOrderData: function (sPurchaseOrder) {
        var sPath =
          "/ZR_RF_PO_ITEM_MAIN(P_PurchaseOrderNo='" +
          sPurchaseOrder.trim() +
          "')/Set";

        var oList = this.byId('orderList');
        oList.bindItems({
          path: sPath,
          template: this.byId('orderList').getItems()[0].clone(),
          events: {
            dataReceived: function (oEvent) {
              this.getView().setBusy(false);  //Disable Loading
              if (!oEvent.getParameters().data) {
                MessageToast.show(
                  'No data found for Purchase Order: ' + sPurchaseOrder
                );
              } else {
                // Use setTimeout to ensure the DOM is rendered
                // setTimeout(() => {
                //   var oFirstItem = oList.getItems()[0];
                //   if (oFirstItem) {
                //     // Assuming a standard way to find the input
                //     var oInput = oFirstItem
                //       .getContent()[0]
                //       ?.getItems()[4]
                //       ?.getItems()[1];

                //     if (oInput) {
                //       oInput.focus();
                //     } else {
                //       console.warn('Quantity Receive Input not found');
                //     }
                //   } else {
                //     console.warn('First item not found');
                //   }
                // }, 100);
              }
            }.bind(this),
            dataRequested: function () { },
          },
        });
      },

      _setOrderDetailsTitle: function (sPurchaseOrder) {
        var oTitle = this.byId('orderDetailsTitle');
        if (oTitle) {
          oTitle.setText('Order Details for ' + sPurchaseOrder);
        }
      },

      onOkButtonPress: function (oEvent) {
        const oButton = oEvent.getSource();
        const bPressed = oButton.getPressed();

        // Get the parent list item
        const oList = this.byId('orderList');
        const oListItem = oButton.getParent().getParent().getParent();

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

      onPlantVHRequest: async function (oEvent) {
        const oInput = oEvent.getSource();
        this._currentPlantInput = oInput;

        if (!this._plantVHDialog) {
          this._plantVHDialog = await Fragment.load({
            name: "rfgundemo.view.fragments.PlantVHDialog",
            controller: this
          });
          this.getView().addDependent(this._plantVHDialog);
        }

        this._plantVHDialog.open();
      },

      onPlantVHConfirm: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem && this._currentPlantInput) {
          const sPlantCode = oSelectedItem.getTitle();
          this._currentPlantInput.setValue(sPlantCode);
        }
        oEvent.getSource().close();
      },

      onPlantVHCancel: function (oEvent) {
      },

      onStrLocVHRequest: async function (oEvent) {
        const oInput = oEvent.getSource();
        this._currentStrLocInput = oInput;
        if (!this._strLocVHDialog) {
          this._strLocVHDialog = await Fragment.load({
            name: "rfgundemo.view.fragments.StrLocVHDialog",
            controller: this
          });
          this.getView().addDependent(this._strLocVHDialog);
        }
        this._strLocVHDialog.open();
      },

      onStrLocVHConfirm: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem && this._currentStrLocInput) {
          const sStorageLocationCode = oSelectedItem.getTitle();
          this._currentStrLocInput.setValue(sStorageLocationCode);
        }
        oEvent.getSource().close();
      },

      onStrLocVHCancel: function (oEvent) {
      }
    });
  }
);
