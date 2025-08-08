sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "rfgundemo/util/Utility",
    "rfgundemo/util/ValidationHelper",
    "sap/ui/core/Fragment",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "rfgundemo/util/MessageHelper",
    "sap/ui/model/json/JSONModel",
  ],
  function (
    Controller,
    MessageToast,
    History,
    Filter,
    FilterOperator,
    Utility,
    ValidationHelper,
    Fragment,
    MessagePopover,
    MessageItem,
    Messaging,
    Message,
    MessageType,
    MessageHelper,
    JSONModel
  ) {
    "use strict";

    return Controller.extend("rfgundemo.controller.DataDetail", {

      /**
       * Called when the controller is initialized.
       * Attaches route matched handler, sets up debounced carousel navigation, and keyboard shortcuts.
       */
      onInit: function () {
        this._initializeProperties();
        this._initializeViewModel();
        this._initializeHelpers();
        this._attachRouteHandler();
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
          oRouter.navTo("RouteMainScreen", {}, true); // If no history, navigate to default screen
        }
      },

      onButtonDownloadPress: function (oEvent) {
        // Get current item data
        const oPOItemCurrent = this.oViewModel.getProperty("/POItemCurrent");

        // Validate data
        if (!oPOItemCurrent.filename) {
          MessageToast.show("No attachment file");
          return;
        }

        // Create and execute download action
        const oModel = this.getView().getModel();
        const oAction = oModel.bindContext(
          "/ZR_RFH_MIGO_DEMO/com.sap.gateway.srvd_a2x.zui_rf_po_item.v0001.downloadFile(...)"
        );

        oAction.setParameter("purchase_order", oPOItemCurrent.PurchaseOrderNo);
        oAction.setParameter("purchase_order_item", oPOItemCurrent.PurchaseOrderItemNo);

        oAction
          .execute()
          .then(() => {
            const oResult = oAction.getBoundContext().getObject();

            if (!oResult.fileContent) {
              MessageToast.show("No download data received");
              return;
            }

            // Process and download file in one chain
            const cleanBase64 = oResult.fileContent
              .replace(/\s/g, "")
              .replace(/-/g, "+")
              .replace(/_/g, "/");

            const binaryData = new Uint8Array(
              Array.from(atob(cleanBase64), c => c.charCodeAt(0))
            );

            const blob = new Blob([binaryData], { type: oResult.mimeType });
            const url = URL.createObjectURL(blob);

            // Create and trigger download
            Object.assign(document.createElement("a"), {
              href: url,
              download: oResult.fileName,
              style: { display: "none" }
            }).click();

            // Cleanup
            URL.revokeObjectURL(url);
            MessageToast.show("Download initiated for " + oResult.fileName);
          })
          .catch(oError => {
            MessageToast.show("Download failed");
          });
      },
      onCancelPress: function (oEvent) {
        // Get the dialog that triggered the event
        var oDialog = oEvent.getSource().getParent().getParent();
        oDialog.close();
      },

      onFileChange: function (oEvent) {
        // Get the FileUploader parameters
        const aFiles = oEvent.getParameter("files");
        // Get the file data
        const oFile = aFiles[0];
        // Get file name
        const sFilename = oFile.name;
        // Get file MIME type
        const sMIMEType = oFile.type;
        // Get file extension
        const sFileExtension = sFilename.split('.').pop().toLowerCase();
        // Get file content (base64)
        const oReader = new FileReader();
        oReader.onload = (parameter) => {
          const sDataUrl = parameter.target.result;
          const sFileContent = sDataUrl.split(",")[1];
          // All file data is now available
          this._uploadFile(sFileContent, sFilename, sMIMEType, sFileExtension);
        };
        oReader.onerror = (error) => {
          console.error("Error reading file:", error);
        };
        // Start reading the file
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

        var sValue = oInput.getValue();

        // Allow numbers and ONE decimal point
        var sValidatedValue = sValue.replace(/[^0-9.]/g, "");

        // Ensure only one decimal point
        var aParts = sValidatedValue.split(".");
        if (aParts.length > 2) {
          sValidatedValue = aParts[0] + "." + aParts.slice(1).join("");
        }

        // Set back only numeric value

        oInput.setValue(sValidatedValue);
      },

      /**
       * Handler for saving and posting selected data.
       * Gathers data from carousel (phone) or table (non-phone) and submits to backend API.
       */
      onSaveAndPostButtonPress: function () {
        // Get all POItem
        const aPOItems = this.oViewModel.getProperty("/POItem");

        // Filter items where ConfirmStatus is true
        const aConfirmedItems = aPOItems.filter(function (oItem) {
          return oItem.ConfirmStatus === true;
        });

        // Store confirmed items in the view model for confirmation page
        this.oViewModel.setProperty("/POItemConfirmation", aConfirmedItems);

        // Show confirmation page/dialog
        this._showConfirmationDialog();
      },

      _showConfirmationDialog: function () {
        if (!this._confirmationDialog) {
          Fragment.load({
            name: "rfgundemo.view.fragments.ConfirmationDialog",
            controller: this
          }).then((oDialog) => {
            this._confirmationDialog = oDialog;
            this.getView().addDependent(this._confirmationDialog);
            this._confirmationDialog.open();
          }).catch((error) => {
            console.error("Error loading confirmation dialog:", error);
            MessageToast.show("Error loading confirmation dialog");
          });
        } else {
          this._confirmationDialog.open();
        }
      },

      onButtonConfirmationCancelPress: function () {
        this._confirmationDialog.close();
      },

      onButtonConfirmationProceedPress: function () {
        // Close confirmation dialog
        this._confirmationDialog.close();
        // Post to BAPI
        this._postToGoodsMovementBAPI();
      },

      /**
       * Toggles OK button state and updates table selection.
       * @param {sap.ui.base.Event} oEvent - The button press event
       */
      onOkButtonPress: function () {
        // Force focus change to  ensure input value is updated in the JSON model
        const oItemNoInput = this.bIsPhone ? this.getView().byId("idConfirmMobileToggleButton") : this.getView().byId("idOKToggleButton");
        oItemNoInput.focus();

        // Get all current opened PO Item
        const oPOItem = this.oViewModel.getProperty("/POItemCurrent");

        // Check Quantity Receive
        if (!oPOItem.QuantityReceive || oPOItem.QuantityReceive === "" || oPOItem.QuantityReceive <= 0) {
          this.oViewModel.setProperty("/POItemCurrent/QuantityReceiveValidation", "Error");
          this.oViewModel.setProperty("/POItemCurrent/ConfirmStatus", false);
          MessageHelper.addMessage(
            "Error",
            MessageType.Error,
            "Quantity Receive",
            ""
          );
        } else {
          this.oViewModel.setProperty("/POItemCurrent/QuantityReceiveValidation", "None");
        }

        // Check Plant
        if (!oPOItem.Plant || oPOItem.Plant === "") {
          const oPlantField = this.byId("idPlantInput");
          oPlantField.setValueState("Error");
          this.oViewModel.setProperty("/POItemCurrent/ConfirmStatus", false);
          MessageHelper.addMessage(
            "Error",
            MessageType.Error,
            "Plant",
            ""
          );
        }

        // Check Storage Location
        if (!oPOItem.StorageLocation || oPOItem.StorageLocation === "") {
          this.oViewModel.setProperty("/POItemCurrent/StorageLocationValidation", "Error");
          this.oViewModel.setProperty("/POItemCurrent/ConfirmStatus", false);
          MessageHelper.addMessage(
            "Error",
            MessageType.Error,
            "Storage",
            ""
          );
        } else {
          this.oViewModel.setProperty("/POItemCurrent/StorageLocationValidation", "None");
        }
      },

      onPlantVHRequest: function (oEvent) {
        const oInput = oEvent.getSource();
        this._currentPlantInput = oInput;

        if (!this._plantVHDialog) {
          // Fragment.load returns a Promise - handle it properly
          Fragment.load({
            name: "rfgundemo.view.fragments.PlantVHDialog",
            controller: this,
          }).then((oDialog) => {
            this._plantVHDialog = oDialog;
            this.getView().addDependent(this._plantVHDialog);
            this._plantVHDialog.open();
          });
        } else {
          // Dialog already exists, just open it
          this._plantVHDialog.open();
        }
      },

      onPlantVHConfirm: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem && this._currentPlantInput) {
          const sPlantCode = oSelectedItem.getTitle();
          this._currentPlantInput.setValue(sPlantCode);
        }
        oEvent.getSource().close();
      },

      onStrLocVHRequest: function (oEvent) {
        const oInput = oEvent.getSource();
        this._currentStrLocInput = oInput;

        if (!this._strLocVHDialog) {
          // Fragment.load returns a Promise - handle it properly
          Fragment.load({
            name: "rfgundemo.view.fragments.StrLocVHDialog",
            controller: this,
          }).then((oDialog) => {
            this._strLocVHDialog = oDialog;
            this.getView().addDependent(this._strLocVHDialog);
            this._strLocVHDialog.open();
          });
        } else {
          // Dialog already exists, just open it
          this._strLocVHDialog.open();
        }
      },

      onStrLocVHConfirm: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        if (oSelectedItem && this._currentStrLocInput) {
          const sStorageLocationCode = oSelectedItem.getTitle();
          this._currentStrLocInput.setValue(sStorageLocationCode);
        }
        oEvent.getSource().close();
      },

      // MessagePopover Methods
      onShowMessagePopover: function (oEvent) {
        if (!this._oMessagePopover) {
          this._createMessagePopover();
        }
        this._oMessagePopover.toggle(oEvent.getSource());
      },

      // Navigation Methods - Optimized for performance
      onPreviousItem: function () {
        this._navigateToItem(-1);
      },

      onNextItem: function () {
        this._navigateToItem(1);
      },

      // // Helper methods for button formatting
      // Helper methods for button formatting
      getMessageCount: function () {
        return MessageHelper.getMessageCount();
      },

      getButtonType: function () {
        return MessageHelper.getButtonType();
      },

      getButtonIcon: function () {
        return MessageHelper.getButtonIcon();
      },

      // =====================================================
      // PRIVATE METHODS
      // =====================================================

      /**
       * Initialize controller properties
       * @private
       */
      _initializeProperties: function () {
        this.bIsPhone = Utility.isPhoneDevice();
      },

      /**
       * Initialize view model with default values
       * @private
       */
      _initializeViewModel: function () {
        this.oViewModel = new JSONModel({
          currentIndex: 0,        // ✅ Fixed: Start with 0 (will be +1 in display)
          totalItems: 0,
          canGoPrevious: false,
          canGoNext: false,
          isLoading: false,
          POItem: [],
          POItemCurrent: {}
        });

        this.getView().setModel(this.oViewModel, "view");
      },

      /**
       * Attach route matched handler
       * @private
       */
      _attachRouteHandler: function () {
        const oRouter = this.getOwnerComponent().getRouter();

        oRouter.attachRouteMatched((oEvent) => {
          const oArgs = oEvent.getParameter("arguments");

          if (oArgs.purchaseOrderNumber) {
            const sNewPONumber = oArgs.purchaseOrderNumber;

            // Only reload if PO number changed
            if (this.sPurchaseOrderNumber !== sNewPONumber) {
              this.sPurchaseOrderNumber = sNewPONumber;
              this._loadPurchaseOrderData();
              this._setOrderDetailsTitle();
            }
          }
        });
      },

      /**
       * Initialize helper utilities
       * @private
       */
      _initializeHelpers: function () {
        // Register keyboard shortcut support
        this._attachInputEventDelegates();

        // Initialize MessageHelper
        MessageHelper.init(this.getView());
      },

      _loadTotalCount: async function () {
        const oModel = this.getView().getModel();

        const oBinding = oModel.bindList(
          "/ZR_RF_PO_ITEM_MAIN",
          undefined,
          undefined,
          [
            new Filter(
              "PurchaseOrderNo",
              FilterOperator.EQ,
              this.sPurchaseOrderNumber
            ),
          ],
          {
            $count: true,
          }
        );

        try {
          // Minimal request to get count only
          await oBinding.requestContexts(0, 0);
          this._totalItems = oBinding.getCount() || 0;
          this.oViewModel.setProperty("/totalItems", this._totalItems);
          this._updateNavigationState();
        } catch (error) {
          console.error("Error loading count:", error);
          this._totalItems = 0;
        }
      },

      _updateNavigationState: function () {
        const iIndex = this.oViewModel.getProperty("/currentIndex");
        const iTotalItems = this.oViewModel.getProperty("/totalItems");
        this.oViewModel.setProperty("/canGoPrevious", iIndex > 0);
        this.oViewModel.setProperty(
          "/canGoNext",
          iIndex < iTotalItems - 1
        );
      },

      /**
       * Private method to navigate to a specific item
       * @param {number} iDirection - Direction to navigate: -1 for previous, +1 for next
       * @private
       */
      _navigateToItem: function (iDirection) {
        // Check if navigation is possible based on direction
        const sCanNavigateProperty = iDirection === 1 ? "/canGoNext" : "/canGoPrevious";
        const bCanNavigate = this.oViewModel.getProperty(sCanNavigateProperty);

        if (bCanNavigate) {
          // Get all PO Items from ViewModel
          const aPOItem = this.oViewModel.getProperty("/POItem");
          // Get current index from ViewModel
          const iCurrentIndex = this.oViewModel.getProperty("/currentIndex");
          // Calculate new index
          const iNewIndex = iCurrentIndex + iDirection;

          // Update item data
          this.oViewModel.setProperty("/POItemCurrent", aPOItem[iNewIndex]);
          // Update current index
          this.oViewModel.setProperty("/currentIndex", iNewIndex);
          // Update navigation state
          this._updateNavigationState();
        }
      },

      _createMessagePopover: function () {
        this._oMessagePopover = new MessagePopover({
          items: {
            path: "message>/",
            template: new MessageItem({
              title: "{message>message}",
              subtitle: "{message>additionalText}",
              type: "{message>type}",
              description: "{message>description}",
            }),
          },
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
        this._keydownHandler = (oEvent) => {
          const bIsPhone = Utility.isPhoneDevice();

          // Using ASCII code for function keys
          switch (oEvent.keyCode) {
            case 114: // F3
              oEvent.preventDefault();
              oEvent.stopPropagation();
              this.onNavBack();
              break;

            case 116: // F5
              oEvent.preventDefault();
              oEvent.stopPropagation();
              if (bIsPhone) {
                this.onNextItem();
              }
              break;

            case 117: // F6
              oEvent.preventDefault();
              oEvent.stopPropagation();
              if (bIsPhone) {
                this.onPreviousItem();
              }
              break;

            case 118: // F7 ✅ More reliable than "F7"
              oEvent.preventDefault();
              oEvent.stopPropagation();
              oEvent.stopImmediatePropagation();
              console.log("F7 keyCode 118 detected"); // Debug
              this.onOkButtonPress();
              break;

            case 119: // F8
              oEvent.preventDefault();
              oEvent.stopPropagation();
              this.onSaveAndPostButtonPress();
              break;
          }
        };

        document.addEventListener('keydown', this._keydownHandler, true);
      },

      /**
       * Loads purchase order data into the carousel or table.
       * @private
       */
      _loadPurchaseOrderData: async function () {
        const oModel = this.getView().getModel();
        this.oViewModel.setProperty("/isLoading", true);
        try {
          // Create new binding for single item - prevents memory leaks
          const oBinding = oModel.bindList(
            "/ZR_RF_PO_ITEM_MAIN",
            undefined,
            undefined,
            [
              new Filter(
                "PurchaseOrderNo",
                FilterOperator.EQ,
                this.sPurchaseOrderNumber
              ),
            ]
          );
          const aContexts = await oBinding.requestContexts();
          if (aContexts && aContexts.length > 0) {
            const aData = aContexts.map(function (oContext) {
              const oItem = oContext.getObject();
              // oItem.QuantityReceive = null;
              // oItem.ConfirmStatus = null;
              // oItem.QuantityReceiveValidation = "None";
              // oItem.PlantValidation = "None";
              // oItem.StorageLocationValidation = "None";
              return oItem;
            });
            this.oViewModel.setProperty("/POItem", aData);
            this.oViewModel.setProperty("/POItemCurrent", aData[0]);
            this.oViewModel.setProperty("/currentIndex", 0);
            this.oViewModel.setProperty("/totalItems", aContexts.length);
            this._updateNavigationState();
          }
          oBinding.destroy();
        } catch (error) {
          console.error("Error loading item at index", index, error);
          MessageToast.show("Error loading item");
        } finally {
          this.oViewModel.setProperty("/isLoading", false);
        }
      },

      /**
       * Focuses first QuantityReceived field in table.
       * @private
       */
      _setFocusOnFirstQuantityReceived: function () {
        var oTable = this.byId("orderTable");
        var oFirstItem = oTable.getItems()[0];
        if (oFirstItem) {
          oFirstItem.getCells()[5].focus();
        }
      },

      /**
       * Focuses first QuantityReceived field in carousel.
       * @private
       */
      _setFocusOnFirstQuantityReceivedInCarousel: function () {
        var aPages = this.byId("orderCarousel").getPages();
        if (!aPages || aPages.length === 0) {
          // Try to load again if the page still not rendered
          setTimeout(
            () => this._setFocusOnFirstQuantityReceivedInCarousel(),
            0
          );
          return;
        }
        var oFirstPage = aPages[0];
        var oInput = oFirstPage.getItems()[2].getItems()[1].getItems()[1];
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
        var oTitle = this.byId("orderDetailsTitle");
        if (oTitle) {
          oTitle.setText("Order Details for " + this.sPurchaseOrderNumber);
        }
      },

      _postToGoodsMovementBAPI: function () {
        var oModel = this.getView().getModel();

        const aBAPIData = this.oViewModel.getProperty("/POItemConfirmation");

        // Your existing body structure works perfectly!
        var body = {
          PurchaseOrder: this.sPurchaseOrderNumber, // Use the stored PO number
          item: [...aBAPIData], // This is already an array of objects
        };

        // Clear previous messages before new API call
        MessageHelper.clearAll();

        // Start loading
        this.oViewModel.setProperty("/isLoading", true);

        try {
          // Call your postBAPI action
          var oAction = oModel.bindContext(
            "/ZR_RFH_MIGO_DEMO/com.sap.gateway.srvd_a2x.zui_rf_po_item.v0001.postBAPI(...)",
            null // Unbound static action
          );

          // Set parameters - pass array directly (no JSON conversion!)
          oAction.setParameter("PurchaseOrder", body.PurchaseOrder);
          oAction.setParameter("item", JSON.stringify(body.item)); // Pass the array directly

          // Execute the action
          oAction
            .execute()
            .then(() => {
              // Refresh the data and stop loading
              this._loadPurchaseOrderData();
              // Show Message
              MessageToast.show("Data posted successfully");
            })
            .catch((oError) => {
              this.getView().setBusy(false);
              if (oError.$reported == false) {
                MessageHelper.addMessage(
                  "Error",
                  MessageType.Error,
                  oError.message,
                  oError.stack
                );
              }
            })
            .finally(() => {
              MessageHelper.convertMessageFromBackend();
            });
        } catch (oError) {
          this.getView().setBusy(false);
        }
      },

      /**
       * Updates toggle button visual state.
       * @param {sap.m.ToggleButton} oToggleButton
       * @private
       */
      _handleToggleButtonState: function (oToggleButton) {
        var bPressed = oToggleButton.getPressed();
        oToggleButton.setType(bPressed ? "Success" : "Emphasized");
      },

      /**
       * Simulates OK button press on currently selected row or carousel page.
       * @private
       */
      _triggerOkButtonPress: function () {
        const bIsPhone = Utility.isPhoneDevice();

        if (bIsPhone) {
          var oCarousel = this.byId("orderCarousel");
          var sActivePageId = oCarousel.getActivePage();
          var oActivePage = oCarousel
            .getPages()
            .find((page) => page.getId() === sActivePageId);

          if (oActivePage) {
            // Simulate OK press on mobile
            oActivePage.getItems().forEach((item) => {
              if (item.getItems) {
                item.getItems().forEach((subItem) => {
                  if (
                    subItem instanceof sap.m.ToggleButton &&
                    subItem.getText() === "OK"
                  ) {
                    subItem.setPressed(!subItem.getPressed());
                    this._handleToggleButtonState(subItem, false);
                  }
                });
              }
            });
          }
        } else {
          var oTable = this.byId("orderTable");
          var oSelectedItems = oTable.getSelectedItems();
          if (oSelectedItems.length > 0) {
            var oFirstSelectedItem = oSelectedItems[0];
            var oOkButtonTable = oFirstSelectedItem
              .getCells()
              .find(
                (cell) =>
                  cell instanceof sap.m.ToggleButton && cell.getText() === "OK"
              );

            if (oOkButtonTable) {
              oOkButtonTable.setPressed(!oOkButtonTable.getPressed());
              this._handleToggleButtonState(oOkButtonTable, false);
            }
          }
        }
      },

      _uploadFile: function (sFileContent, sFilename, sMIMEType, sFileExtension) {
        // Upload logic
        const oModel = this.getView().getModel();
        // Get current data
        const oPOItemCurrent = this.oViewModel.getProperty("/POItemCurrent");
        // Action binding
        const oAction = oModel.bindContext(
          "/ZR_RFH_MIGO_DEMO/com.sap.gateway.srvd_a2x.zui_rf_po_item.v0001.uploadFile(...)"
        );
        // Set parameters
        oAction.setParameter("material_document", "");
        oAction.setParameter("purchase_order", this.sPurchaseOrderNumber);
        oAction.setParameter("purchase_order_item", oPOItemCurrent.PurchaseOrderItemNo);
        oAction.setParameter("fileName", sFilename);
        oAction.setParameter("fileContent", sFileContent);
        oAction.setParameter("mimeType", sMIMEType);
        oAction.setParameter("fileExtension", sFileExtension);
        // Execute upload
        oAction
          .execute()
          .then(() => {
            MessageToast.show(
              "File uploaded successfully for item " + oPOItemCurrent.PurchaseOrderItemNo
            );
          })
          .catch((error) => {
            console.error("Upload failed:", error);
            MessageToast.show("Upload Failed: " + error.message);
          });
      }
    });
  }
);
