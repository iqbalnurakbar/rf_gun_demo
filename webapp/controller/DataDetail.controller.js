sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/m/MessageToast',
    'sap/ui/core/routing/History',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'rfgundemo/util/Utility',
    "sap/ui/core/Fragment",
    "sap/m/plugins/UploadSetwithTable",
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
    'sap/ui/core/Messaging',
    'sap/ui/core/message/Message',
    'sap/ui/core/message/MessageType'
  ],
  function (
    Controller,
    MessageToast,
    History,
    Filter,
    FilterOperator,
    Utility,
    Fragment,
    UploadSetwithTable,
    MessagePopover,
    MessageItem,
    Messaging,
    Message,
    MessageType) {
    'use strict';

    return Controller.extend('rfgundemo.controller.DataDetail', {
      /**
       * Called when the controller is initialized.
       * Attaches route matched handler, sets up debounced carousel navigation, and keyboard shortcuts.
       */
      onInit: function () {
        var that = this;
        var oRouter = this.getOwnerComponent().getRouter(); // Get the router instance from the component
        this.sPurchaseOrderNumber = ''; // Store the selected purchase order number
        that.getView().setBusy(true); // Show busy indicator while loading data

        // When the route is matched, load data based on purchase order number
        oRouter.attachRouteMatched(function (oEvent) {
          var oArgs = oEvent.getParameter('arguments');
          if (oArgs && oArgs.purchaseOrderNumber) {
            that.sPurchaseOrderNumber = oArgs.purchaseOrderNumber;
            that._loadPurchaseOrderData(); // Load data for given PO
            that._setOrderDetailsTitle(); // Update title in the view
          }
        });

        // Set up functions for navigating carousel pages (mobile only) with a delay to prevent rapid firing
        this.debounceGoToNextCarouselPage = Utility.debounce(
          this._goToNextCarouselPage,
          500
        );
        this.debounceGoToPreviousCarouselPage = Utility.debounce(
          this._goToPreviousCarouselPage,
          500
        );

        // Register keyboard shortcut support
        this._attachInputEventDelegates();

        // Message popover initialization
        this._MessageManager = Messaging;
        this._MessageManager.removeAllMessages();
        this.getView().setModel(this._MessageManager.getMessageModel(), "message");
      },

      /**
       * Navigates back to the previous screen or default route if history is empty.
       */
      onNavBack: function () {
        var oHistory = History.getInstance(); // Get browser history
        var sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1); // Go back one step in browser history
        } else {
          var oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo('RouteMainScreen', {}, true); // If no history, navigate to default screen
        }
      },

      // @ts-ignore
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
          this._addMessage(
            "Please select a file to upload.",
            MessageType.Error,
            "",
            ""
          );
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

      /**
       * Handles the liveChange event for an Input control to ensure that only numeric
       * values are input by the user.
       *
       * This function is triggered every time the input changes. It removes any
       * non-numeric characters from the input and updates the input field with only numeric values.
       *
       * @param {sap.ui.base.Event} oEvent - The event object containing information about the liveChange event.
       */
      onLiveChangeCheckNumber: function (oEvent) {
        var oInput = oEvent.getSource();
        // @ts-ignore
        var sValue = oInput.getValue();

        // Match only numbers
        var sValidatedValue = sValue.replace(/[^0-9]/g, '');

        // Set back only numeric value
        // @ts-ignore
        oInput.setValue(sValidatedValue);
      },

      /**
       * Handler for saving and posting selected data.
       * Gathers data from carousel (phone) or table (non-phone) and submits to backend API.
       */
      onSaveAndPostButtonPress: function () {
        var aSelectedData = []; // Will store all the selected item data
        var oDeviceModel = this.getView().getModel('device');
        var bIsPhone = oDeviceModel.getProperty('/system/phone'); // Check if device is phone

        if (bIsPhone) {
          // For phones, get the data from the active carousel page
          var oCarousel = this.byId('orderCarousel');
          var sActivePageId = oCarousel.getActivePage();
          var oActivePage = oCarousel
            .getPages()
            .find(page => page.getId() === sActivePageId);

          if (oActivePage) {
            var oItemData = {};
            var aItems = oActivePage.getItems();

            // Extract field values from carousel layout (nested structure)
            oItemData['MaterialDocument'] = '';
            oItemData['PurchaseOrder'] = this.sPurchaseOrderNumber;
            oItemData['PurchaseOrderItem'] = aItems[0].getItems()[1].getValue();
            oItemData['Material'] = aItems[1]
              .getItems()[0]
              .getItems()[1]
              .getValue();
            oItemData['MaterialDescription'] = aItems[1]
              .getItems()[1]
              .getItems()[1]
              .getValue();
            oItemData['QuantitySuggest'] = parseFloat(
              aItems[2].getItems()[0].getItems()[1].getValue()
            ).toFixed(3);
            oItemData['QuantityReceive'] = parseFloat(
              aItems[2].getItems()[1].getItems()[1].getValue()
            ).toFixed(3);
            oItemData['QuantityUnit'] = aItems[3].getItems()[1].getValue();
            oItemData['Plant'] = aItems[4].getItems()[1].getValue();
            oItemData['StorageLocation'] = aItems[5].getItems()[1].getValue();
            oItemData['ConfirmStatus'] = aItems[7].getItems()[0].getPressed();

            aSelectedData.push(oItemData);
          }
        } else {
          // For tablets/desktops, get selected rows from the table
          var oTable = this.byId('orderTable');
          var aSelectedItems = oTable.getSelectedItems();

          aSelectedItems.forEach(
            function (oItem) {
              var oItemData = {};
              var aCells = oItem.getCells();

              // Extract values from each selected row
              oItemData['MaterialDocument'] = '';
              oItemData['PurchaseOrder'] = this.sPurchaseOrderNumber;
              oItemData['PurchaseOrderItem'] = aCells[0].getValue();
              oItemData['Material'] = aCells[1].getValue();
              oItemData['MaterialDescription'] = aCells[2].getValue();
              oItemData['QuantitySuggest'] = parseFloat(
                aCells[4].getValue()
              ).toFixed(3);
              oItemData['QuantityReceive'] = parseFloat(
                aCells[5].getValue()
              ).toFixed(3);
              oItemData['QuantityUnit'] = aCells[6].getValue();
              oItemData['Plant'] = aCells[7].getValue();
              oItemData['StorageLocation'] = aCells[8].getValue();
              oItemData['ConfirmStatus'] = aCells[10].getPressed();

              aSelectedData.push(oItemData);
            }.bind(this)
          );
        }

        if (aSelectedData.length === 0) {
          // No selection — show message
          MessageToast.show('Please select items and enter valid quantities');
          return;
        }

        // Submit data to backend
        this._postToGMBAPI(aSelectedData);
      },

      /**
       * Toggles OK button state and updates table selection.
       * @param {sap.ui.base.Event} oEvent - The button press event
       */
      onOkButtonPress: function (oEvent) {
        var oButton = oEvent.getSource(); // The button that was pressed
        this._handleToggleButtonState(oButton); // Change visual state

        var oTable = this.byId('orderTable');
        // @ts-ignore
        var oTableItem = oButton.getParent(); // Get table row where the button is located
        // @ts-ignore
        oTable.setSelectedItem(oTableItem, oButton.getPressed()); // Select or deselect row
      },

      /**
       * Focuses the input field when the carousel page changes.
       * @param {sap.ui.base.Event} oEvent
       */
      onCarouselPageChanged: function (oEvent) {
        // @ts-ignore
        var aActivePageId = oEvent.getParameter('activePages');
        var oPage = this.byId('orderCarousel').getPages()[aActivePageId];
        var oInput = oPage.getItems()[2].getItems()[1].getItems()[1];

        if (oInput) {
          // Wait for UI to update then set focus
          setTimeout(() => {
            oInput.focus();
          }, 200);
        }
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
        oEvent.getSource().close();
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
        oEvent.getSource().close();
      },

      // MessagePopover Methods
      onShowMessagePopover: function (oEvent) {
        if (!this._oMessagePopover) {
          this._createMessagePopover();
        }
        this._oMessagePopover.toggle(oEvent.getSource());
      },



      // Helper methods for button formatting
      getMessageCount: function () {
        var aMessages = this._MessageManager.getMessageModel().getData();
        return aMessages.length || "";
      },

      getButtonType: function () {
        var aMessages = this._MessageManager.getMessageModel().getData();
        var bHasError = aMessages.some(function (msg) { return msg.type === "Error"; });
        var bHasWarning = aMessages.some(function (msg) { return msg.type === "Warning"; });

        if (bHasError) return "Negative";
        if (bHasWarning) return "Critical";
        return "Neutral";
      },

      getButtonIcon: function () {
        var aMessages = this._MessageManager.getMessageModel().getData();
        var bHasError = aMessages.some(function (msg) { return msg.type === "Error"; });
        var bHasWarning = aMessages.some(function (msg) { return msg.type === "Warning"; });

        if (bHasError) return "sap-icon://error";
        if (bHasWarning) return "sap-icon://alert";
        return "sap-icon://information";
      },

      // =====================================================
      // PRIVATE METHODS
      // =====================================================

      _createMessagePopover: function () {
        this._oMessagePopover = new MessagePopover({
          items: {
            path: "message>/",
            template: new MessageItem({
              title: "{message>message}",
              subtitle: "{message>additionalText}",
              type: "{message>type}",
              description: "{message>description}"
            })
          }
        });
        this.getView().addDependent(this._oMessagePopover);
      },
      /**
       * Attaches keyboard shortcuts to the page.
       * F3: Back, F8: Post, F7: OK — all devices
       * F5/F6: Carousel navigation — mobile only
       * @private
       */

      _attachInputEventDelegates: function () {
        var oDataDetailPage = this.byId('dataDetailPage');
        if (oDataDetailPage) {
          oDataDetailPage.addEventDelegate({
            onkeydown: function (oEvent) {
              var oDeviceModel = this.getView().getModel('device');
              var bIsPhone = oDeviceModel.getProperty('/system/phone');

              // Handle different function keys
              switch (oEvent.key) {
                case 'F3': // Back
                  oEvent.preventDefault();
                  this.onNavBack();
                  break;
                case 'F5': // Next (mobile only)
                  if (bIsPhone) {
                    oEvent.preventDefault();
                    this.debounceGoToNextCarouselPage();
                  }
                  break;
                case 'F6': // Previous (mobile only)
                  if (bIsPhone) {
                    oEvent.preventDefault();
                    this.debounceGoToPreviousCarouselPage();
                  }
                  break;
                case 'F7': // OK
                  oEvent.preventDefault();
                  this._triggerOkButtonPress();
                  break;
                case 'F8': // Post
                  oEvent.preventDefault();
                  this.onSaveAndPostButtonPress();
                  break;
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

      /**
       * Loads purchase order data into the carousel or table.
       * @private
       */
      _loadPurchaseOrderData: function () {
        var that = this;
        var oDeviceModel = this.getView().getModel('device');
        var bIsPhone = oDeviceModel.getProperty('/system/phone');
        var aFilters = [
          new Filter(
            'PurchaseOrderNo',
            FilterOperator.EQ,
            this.sPurchaseOrderNumber
          ),
        ];

        // Bind data to the correct control based on device type
        if (bIsPhone) {
          var oCarousel = this.byId('orderCarousel');
          var oBinding = oCarousel.getBinding('pages');
          oBinding.filter(aFilters);
          oBinding.attachEventOnce('dataReceived', function () {
            that.getView().setBusy(false);
            that._setFocusOnFirstQuantityReceivedInCarousel();
          });
        } else {
          var oTable = this.byId('orderTable');
          var oBinding = oTable.getBinding('items');
          oBinding.filter(aFilters);
          oTable.attachEventOnce(
            'updateFinished',
            function () {
              this.getView().setBusy(false);
              this._setFocusOnFirstQuantityReceived();
            },
            this
          );
        }
      },

      /**
       * Focuses first QuantityReceived field in table.
       * @private
       */
      _setFocusOnFirstQuantityReceived: function () {
        var oTable = this.byId('orderTable');
        var oFirstItem = oTable.getItems()[0];
        if (oFirstItem) {
          oFirstItem.getCells()[4].focus();
        }
      },

      /**
       * Focuses first QuantityReceived field in carousel.
       * @private
       */
      _setFocusOnFirstQuantityReceivedInCarousel: function () {
        var oFirstPage = this.byId('orderCarousel').getPages()[0];
        var oInput = oFirstPage?.getItems()[2].getItems()[1].getItems()[1];
        if (oInput) {
          setTimeout(() => {
            oInput.focus();
          }, 200);
        }
      },

      /**
       * Updates the order detail title based on PO number.
       * @private
       */
      _setOrderDetailsTitle: function () {
        var oTitle = this.byId('orderDetailsTitle');
        if (oTitle) {
          oTitle.setText('Order Details for ' + this.sPurchaseOrderNumber);
        }
      },

      /**
       * Posts collected item data to backend MIGO API.
       */
      // _postToGMBAPI: function (aBAPIData) {
      //   var oDeviceModel = this.getView().getModel('device');
      //   var bIsPhone = oDeviceModel.getProperty('/system/phone');
      //   var oModel = this.getView().getModel();
      //   var body = {
      //     PurchaseOrder: aBAPIData[0].PurchaseOrder,
      //     item: [...aBAPIData],
      //   };

      //   // Send data to backend service
      //   oModel
      //     .bindList('/ZC_RFH_MIGO_DEMO')
      //     .create(body)
      //     .created()
      //     .then(() => {
      //       MessageToast.show('Data posted successfully');
      //       if (bIsPhone) {
      //         this.byId('orderCarousel').getBinding('pages').refresh();
      //       } else {
      //         this.byId('orderTable').getBinding('items').refresh();
      //       }
      //     })
      //     .catch(oError => {
      //       MessageToast.show('Error posting data: ' + oError.message);
      //       oModel.refresh();
      //     });
      // },

      // Add the missing _extractStatusCode method first:
      _extractStatusCode: function (oError) {
        // Try different ways to extract status code
        if (oError && oError.status) {
          return parseInt(oError.status);
        }

        if (oError && oError.statusCode) {
          return parseInt(oError.statusCode);
        }

        // Check in error details
        if (oError && oError.error && oError.error.status) {
          return parseInt(oError.error.status);
        }

        // Check in response
        if (oError && oError.response && oError.response.status) {
          return parseInt(oError.response.status);
        }

        // Check if it's in the message
        if (oError && oError.message) {
          var statusMatch = oError.message.match(/(\d{3})/);
          if (statusMatch) {
            return parseInt(statusMatch[1]);
          }
        }

        return 0; // Unknown status
      },

      // Fixed _postToGMBAPI method:
      _postToGMBAPI: function (aBAPIData) {
        var that = this;
        var oDeviceModel = this.getView().getModel('device');
        var bIsPhone = oDeviceModel.getProperty('/system/phone');
        var oModel = this.getView().getModel();
        var body = {
          PurchaseOrder: aBAPIData[0].PurchaseOrder,
          item: [...aBAPIData],
        };

        // Clear previous messages before new API call
        this._MessageManager.removeAllMessages();

        // Show loading indicator
        this.getView().setBusy(true);

        // Send data to backend service
        var oListBinding = oModel.bindList('/ZC_RFH_MIGO_DEMO');
        var oContext = oListBinding.create(body);

        oContext.created()
          .then(function (oCreatedContext) {
            that.getView().setBusy(false);

            // Success - HTTP 200/201
            that._addMessage(
              "Data posted successfully",
              MessageType.Success,
              "HTTP 201 - Created",
              "Purchase Order " + body.PurchaseOrder + " has been processed successfully."
            );

            MessageToast.show('Data posted successfully');

            // Refresh the data - THIS SHOULD BE HERE IN SUCCESS
            if (bIsPhone) {
              that.byId('orderCarousel').getBinding('pages').refresh();
            } else {
              that.byId('orderTable').getBinding('items').refresh();
            }
          })
          .catch(function (oError) {
            that.getView().setBusy(false);

            // Extract HTTP status code and handle different error scenarios
            var iStatusCode = that._extractStatusCode(oError);
            var sErrorMessage = that._getErrorMessage(oError);
            var sHttpStatusText = that._getHttpStatusText(iStatusCode);

            // Add message based on HTTP status code
            switch (iStatusCode) {
              case 400:
                that._addMessage(
                  "Bad Request - Invalid data provided",
                  MessageType.Error,
                  "HTTP 400 - Bad Request",
                  "Please check your input data. " + sErrorMessage
                );
                break;

              case 401:
                that._addMessage(
                  "Authentication required",
                  MessageType.Error,
                  "HTTP 401 - Unauthorized",
                  "Please check your login credentials. " + sErrorMessage
                );
                break;

              case 403:
                that._addMessage(
                  "Access forbidden",
                  MessageType.Error,
                  "HTTP 403 - Forbidden",
                  "You don't have permission to perform this operation. " + sErrorMessage
                );
                break;

              case 404:
                that._addMessage(
                  "Service not found",
                  MessageType.Error,
                  "HTTP 404 - Not Found",
                  "The requested service endpoint was not found. " + sErrorMessage
                );
                break;

              case 422:
                that._addMessage(
                  "Validation failed",
                  MessageType.Warning,
                  "HTTP 422 - Unprocessable Entity",
                  "Data validation failed. Please check your entries. " + sErrorMessage
                );
                break;

              case 500:
                that._addMessage(
                  "Internal server error",
                  MessageType.Error,
                  "HTTP 500 - Internal Server Error",
                  "An error occurred on the server. Please try again later. " + sErrorMessage
                );
                break;

              case 502:
                that._addMessage(
                  "Bad gateway",
                  MessageType.Error,
                  "HTTP 502 - Bad Gateway",
                  "Gateway error occurred. Please try again. " + sErrorMessage
                );
                break;

              case 503:
                that._addMessage(
                  "Service unavailable",
                  MessageType.Warning,
                  "HTTP 503 - Service Unavailable",
                  "Service is temporarily unavailable. Please try again later. " + sErrorMessage
                );
                break;

              default:
                that._addMessage(
                  "Error posting data",
                  MessageType.Error,
                  sHttpStatusText || "HTTP " + iStatusCode,
                  sErrorMessage || "An unexpected error occurred."
                );
            }
            // Only refresh model on error, not the data binding
            oModel.refresh();
          });
      },

      // Helper method to add API messages to MessagePopover
      _addMessage: function (sMessage, sType, sAdditionalText, sDescription) {
        this._MessageManager.addMessages(
          new Message({
            message: sMessage,
            type: sType,
            additionalText: sAdditionalText,
            description: sDescription,
            processor: this.getView().getModel()
          })
        );
      },

      // Helper method to extract error message
      _getErrorMessage: function (oError) {
        if (oError && oError.message) {
          return oError.message;
        }

        if (oError && oError.error && oError.error.message) {
          return oError.error.message;
        }

        if (oError && oError.responseText) {
          try {
            var oParsed = JSON.parse(oError.responseText);
            if (oParsed.error && oParsed.error.message) {
              return oParsed.error.message;
            }
          } catch (e) {
            return oError.responseText;
          }
        }

        return "Unknown error occurred";
      },

      // Helper method to get HTTP status text
      _getHttpStatusText: function (iStatusCode) {
        var mStatusTexts = {
          200: "HTTP 200 - OK",
          201: "HTTP 201 - Created",
          400: "HTTP 400 - Bad Request",
          401: "HTTP 401 - Unauthorized",
          403: "HTTP 403 - Forbidden",
          404: "HTTP 404 - Not Found",
          422: "HTTP 422 - Unprocessable Entity",
          500: "HTTP 500 - Internal Server Error",
          502: "HTTP 502 - Bad Gateway",
          503: "HTTP 503 - Service Unavailable"
        };

        return mStatusTexts[iStatusCode] || "HTTP " + iStatusCode;
      },

      /**
       * Navigates to the next carousel page if available.
       * @private
       */
      _goToNextCarouselPage: function () {
        var oCarousel = this.byId('orderCarousel');
        var aPages = oCarousel.getPages();
        var sCurrentPageId = oCarousel.getActivePage();
        var iCurrentIndex = aPages.findIndex(
          page => page.getId() === sCurrentPageId
        );

        if (iCurrentIndex < aPages.length - 1) {
          var sNextPageId = aPages[iCurrentIndex + 1].getId();
          oCarousel.setActivePage(sNextPageId);
        }
      },

      /**
       * Navigates to the previous carousel page if available.
       * @private
       */
      _goToPreviousCarouselPage: function () {
        var oCarousel = this.byId('orderCarousel');
        var aPages = oCarousel.getPages();
        var sCurrentPageId = oCarousel.getActivePage();
        var iCurrentIndex = aPages.findIndex(
          page => page.getId() === sCurrentPageId
        );

        if (iCurrentIndex > 0) {
          var sPreviousPageId = aPages[iCurrentIndex - 1].getId();
          oCarousel.setActivePage(sPreviousPageId);
        }
      },

      /**
       * Updates toggle button visual state.
       * @param {sap.m.ToggleButton} oToggleButton
       * @private
       */
      _handleToggleButtonState: function (oToggleButton) {
        var bPressed = oToggleButton.getPressed();
        // @ts-ignore
        oToggleButton.setType(bPressed ? 'Success' : 'Emphasized');
      },

      /**
       * Simulates OK button press on currently selected row or carousel page.
       * @private
       */
      _triggerOkButtonPress: function () {
        var oDeviceModel = this.getView().getModel('device');
        var bIsPhone = oDeviceModel.getProperty('/system/phone');

        if (bIsPhone) {
          var oCarousel = this.byId('orderCarousel');
          var sActivePageId = oCarousel.getActivePage();
          var oActivePage = oCarousel
            .getPages()
            .find(page => page.getId() === sActivePageId);

          if (oActivePage) {
            // Simulate OK press on mobile
            oActivePage.getItems().forEach(item => {
              if (item.getItems) {
                item.getItems().forEach(subItem => {
                  if (
                    subItem instanceof sap.m.ToggleButton &&
                    subItem.getText() === 'OK'
                  ) {
                    subItem.setPressed(!subItem.getPressed());
                    this._handleToggleButtonState(subItem);
                  }
                });
              }
            });
          }
        } else {
          var oTable = this.byId('orderTable');
          var oSelectedItems = oTable.getSelectedItems();
          if (oSelectedItems.length > 0) {
            var oFirstSelectedItem = oSelectedItems[0];
            var oOkButtonTable = oFirstSelectedItem
              .getCells()
              .find(
                cell =>
                  cell instanceof sap.m.ToggleButton && cell.getText() === 'OK'
              );

            if (oOkButtonTable) {
              oOkButtonTable.setPressed(!oOkButtonTable.getPressed());
              this._handleToggleButtonState(oOkButtonTable);
            }
          }
        }
      },
    });
  }
);
