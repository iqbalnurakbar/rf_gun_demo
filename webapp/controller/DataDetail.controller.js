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
        var that = this;
        var oRouter = this.getOwnerComponent().getRouter();
        this.sPurchaseOrderNumber = "";
        // this.getView().setBusy(true);

        // Initialize with minimal memory footprint
        this._currentIndex = 0;
        this._totalItems = 0;


        // Lightweight view model - only current item data
        this.oViewModel = new sap.ui.model.json.JSONModel({
          currentIndex: 1,
          totalItems: 0,
          canGoPrevious: false,
          canGoNext: false,
          isLoading: false,
          POItem: {
            PurchaseOrderItemNo: "",
            Material: "",
            MaterialDescription: "",
            QuantitySuggest: "",
            QuantityReceive: "",
            PurchaseOrderQuantityUnit: "",
            Plant: "",
            StorageLocation: "",
            filename: "",
          },
        });

        this.getView().setModel(this.oViewModel, "view");


        // When the route is matched, load data based on purchase order number
        oRouter.attachRouteMatched(function (oEvent) {
          var oArgs = oEvent.getParameter("arguments");
          if (oArgs && oArgs.purchaseOrderNumber) {
            var sNewPONumber = oArgs.purchaseOrderNumber;
            if (that.sPurchaseOrderNumber !== sNewPONumber) {
              that.sPurchaseOrderNumber = sNewPONumber;
              that._loadPurchaseOrderData();
              that._setOrderDetailsTitle();
              // Load first item and get count
              that._initializeData();
            }
          }
        });

        // Register keyboard shortcut support
        this._attachInputEventDelegates();

        // Initialize MessageHelper
        MessageHelper.init(this.getView());
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

      onDownload: function (oEvent) {
        const bIsPhone = Utility.isPhoneDevice(this.getView());
        var oModel = this.getView().getModel();
        var oButton = oEvent.getSource();
        var oRowData;

        if (bIsPhone) {
          // For phone: get data from view model
          oRowData = this.oViewModel.getProperty("/POItem");
          if (!oRowData || !oRowData.PurchaseOrderItemNo) {
            MessageToast.show("No item data available");
            return;
          }
        } else {
          // For desktop: get data from binding context
          var oBindingContext = oButton.getBindingContext();
          if (!oBindingContext) {
            MessageToast.show("No binding context available");
            return;
          }
          oRowData = oBindingContext.getObject();
        }

        if (oRowData.filename === "") {
          MessageToast.show("No attachment file");
          return;
        }

        var fileContent = "";
        var mimeType = "";
        var fileName = "";

        var oAction = oModel.bindContext(
          "/ZR_RFH_MIGO_DEMO/com.sap.gateway.srvd_a2x.zui_rf_po_item.v0001.downloadFile(...)"
        );

        oAction.setParameter("purchase_order", oRowData.PurchaseOrderNo);
        oAction.setParameter(
          "purchase_order_item",
          oRowData.PurchaseOrderItemNo
        );

        oAction
          .execute()
          .then(
            function () {
              // Handle success
              var oActionContext = oAction.getBoundContext();
              var oResult = oActionContext ? oActionContext.getObject() : null;

              // Download process
              fileContent = oResult.fileContent;
              mimeType = oResult.mimeType;
              fileName = oResult.fileName;

              fileContent = fileContent.replace(/\s/g, "");

              // Handle URL-safe base64 if needed
              fileContent = fileContent.replace(/-/g, "+").replace(/_/g, "/");

              var sBase64Content = atob(fileContent);

              var aBinaryData = new Uint8Array(sBase64Content.length);

              for (var i = 0; i < sBase64Content.length; i++) {
                aBinaryData[i] = sBase64Content.charCodeAt(i);
              }

              var oBlob = new Blob([aBinaryData], { type: mimeType });

              // Utilize FileSaver.js or similar if needed, else create download link
              var sFileUrl = URL.createObjectURL(oBlob);

              // Open the downloaded file in a new tab

              var oDownloadLink = document.createElement("a");
              oDownloadLink.href = sFileUrl;
              oDownloadLink.download = fileName;
              oDownloadLink.style.display = "none";

              oDownloadLink.click();
              MessageToast.show("Download has been initiated for " + fileName);
            }.bind(this)
          )
          .catch(function (oError) {
            // Handle error
            console.error("Download action failed:", oError);
          });
      },

      onUpload: function (oEvent) {
        const bIsPhone = Utility.isPhoneDevice(this.getView());
        var oButton = oEvent.getSource();
        var oRowData;

        if (bIsPhone) {
          // For phone: get data from view model
          oRowData = this.oViewModel.getProperty("/POItem");
          if (!oRowData || !oRowData.PurchaseOrderItemNo) {
            MessageToast.show("No item data available");
            return;
          }
        } else {
          // For desktop: get data from binding context
          var oBindingContext = oButton.getBindingContext();
          if (!oBindingContext) {
            MessageToast.show("No binding context available");
            return;
          }
          oRowData = oBindingContext.getObject();
        }

        // Create unique ID based on item
        var sUniqueId = "uploadDialog_" + oRowData.PurchaseOrderItemNo;

        // Store current context for this specific dialog
        this["_uploadContext_" + oRowData.PurchaseOrderItemNo] = bIsPhone ?
          { getObject: () => oRowData } : // Create mock context for phone
          oBindingContext; // Use real context for desktop

        // Check if this specific dialog exists
        if (!this["_uploadDialog_" + oRowData.PurchaseOrderItemNo]) {
          // Create new dialog for this specific item
          this.loadFragment({
            id: sUniqueId, // Unique ID for each dialog
            name: "rfgundemo.view.fragments.UploadFileDialog",
            controller: this,
          }).then((fragment) => {
            // Store dialog with unique property name
            this["_uploadDialog_" + oRowData.PurchaseOrderItemNo] = fragment;
            this.getView().addDependent(fragment);
            fragment.open();
          });
        } else {
          // Open existing dialog for this item
          this["_uploadDialog_" + oRowData.PurchaseOrderItemNo].open();
        }
      },

      onCancelPress: function (oEvent) {
        // Get the dialog that triggered the event
        var oDialog = oEvent.getSource().getParent().getParent();
        oDialog.close();
      },

      onUploadPress: function (oEvent) {
        const bIsPhone = Utility.isPhoneDevice(this.getView());
        // Get the dialog that triggered the event
        var oDialog = oEvent.getSource().getParent().getParent();
        var sDialogId = oDialog.getId();

        // Extract item number from dialog ID
        var sItemNo = sDialogId.split("uploadDialog_")[1].split("--")[0];

        // Get the stored context for this specific item
        var oUploadContext = this["_uploadContext_" + sItemNo];

        if (!oUploadContext) {
          MessageToast.show("No row context available");
          return;
        }

        if (!this.fileContent || !this.fileName) {
          MessageToast.show("Please select a file to upload.");
          return;
        }

        try {
          // Use the stored context data
          var oRowData = oUploadContext.getObject();
          var oItemData = {
            MaterialDocument: "",
            PurchaseOrder: this.sPurchaseOrderNumber,
            PurchaseOrderItem: oRowData.PurchaseOrderItemNo,
            filename: this.fileName,
            filecontent: this.fileContent,
            mimetype: this.mimeType,
            fileextension: this.fileExtension,
          };

          // Upload logic
          const oModel = this.getView().getModel();
          const oAction = oModel.bindContext(
            "/ZR_RFH_MIGO_DEMO/com.sap.gateway.srvd_a2x.zui_rf_po_item.v0001.uploadFile(...)"
          );

          // Set parameters
          oAction.setParameter("material_document", oItemData.MaterialDocument);
          oAction.setParameter("purchase_order", oItemData.PurchaseOrder);
          oAction.setParameter(
            "purchase_order_item",
            oItemData.PurchaseOrderItem
          );
          oAction.setParameter("fileName", oItemData.filename);
          oAction.setParameter("fileContent", oItemData.filecontent);
          oAction.setParameter("mimeType", oItemData.mimetype);
          oAction.setParameter("fileExtension", oItemData.fileextension);

          // Execute upload
          oAction
            .execute()
            .then(() => {
              MessageToast.show(
                "File uploaded successfully for item " + sItemNo
              );
              oDialog.close();
              if (bIsPhone) {
                this.byId("orderCarousel").getBinding("pages").refresh();
              } else {
                this.byId("orderTable").getBinding("items").refresh();
              }
            })
            .catch((error) => {
              console.error("Upload failed:", error);
              MessageToast.show("Upload Failed");
            });
        } catch (error) {
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
        var aSelectedData = []; // Will store all the selected item data
        const bIsPhone = Utility.isPhoneDevice(this.getView());

        if (bIsPhone) {
          // For phones, get the data from the active carousel page
          var oCarousel = this.byId("orderCarousel");
          var sActivePageId = oCarousel.getActivePage();
          var oActivePage = oCarousel
            .getPages()
            .find((page) => page.getId() === sActivePageId);

          if (oActivePage) {
            var oItemData = {};
            var aItems = oActivePage.getItems();

            // Extract field values from carousel layout (nested structure)
            oItemData["MaterialDocument"] = "";
            oItemData["PurchaseOrder"] = this.sPurchaseOrderNumber;
            oItemData["PurchaseOrderItem"] = aItems[0].getItems()[1].getValue();
            oItemData["Material"] = aItems[1]
              .getItems()[0]
              .getItems()[1]
              .getValue();
            oItemData["MaterialDescription"] = aItems[1]
              .getItems()[1]
              .getItems()[1]
              .getValue();
            oItemData["QuantitySuggest"] = parseFloat(
              aItems[2].getItems()[0].getItems()[1].getValue()
            ).toFixed(3);
            oItemData["QuantityReceive"] = parseFloat(
              aItems[2].getItems()[1].getItems()[1].getValue()
            ).toFixed(3);
            oItemData["QuantityUnit"] = aItems[3].getItems()[1].getValue();
            oItemData["Plant"] = aItems[4].getItems()[1].getValue();
            oItemData["StorageLocation"] = aItems[5].getItems()[1].getValue();
            oItemData["ConfirmStatus"] = aItems[7].getItems()[0].getPressed();

            aSelectedData.push(oItemData);

            aItems[2].getItems()[0].getItems()[1].setValue("");
          }
        } else {
          // For tablets/desktops, get selected rows from the table
          var oTable = this.byId("orderTable");
          var aSelectedItems = oTable.getSelectedItems();

          aSelectedItems.forEach(
            function (oItem) {
              var oItemData = {};
              var aCells = oItem.getCells();

              var bIsOkButtonPressed = aCells[11].getPressed();

              // User need to press OK Button
              if (!bIsOkButtonPressed) return;

              // Extract values from each selected row
              oItemData["MaterialDocument"] = "";
              oItemData["PurchaseOrder"] = this.sPurchaseOrderNumber;
              oItemData["PurchaseOrderItem"] = aCells[0].getValue();
              oItemData["Material"] = aCells[1].getValue();
              oItemData["MaterialDescription"] = aCells[2].getValue();
              oItemData["QuantitySuggest"] = parseFloat(
                aCells[4].getValue()
              ).toFixed(3);
              oItemData["QuantityReceive"] = parseFloat(
                aCells[5].getValue()
              ).toFixed(3);
              oItemData["QuantityUnit"] = aCells[6].getValue();
              oItemData["Plant"] = aCells[7].getValue();
              oItemData["StorageLocation"] = aCells[8].getValue();
              oItemData["ConfirmStatus"] = aCells[11].getPressed();

              aSelectedData.push(oItemData);

              aCells[5].setValue("");
            }.bind(this)
          );
        }

        if (aSelectedData.length === 0) {
          // No selection — show message
          MessageToast.show("No item selected!");
          return;
        }

        // Submit data to backend
        this._postToGoodsMovementBAPI(aSelectedData);
      },

      /**
       * Toggles OK button state and updates table selection.
       * @param {sap.ui.base.Event} oEvent - The button press event
       */
      onOkButtonPress: function (oEvent) {
        // Get button object
        const oButton = oEvent.getSource();
        // Get device
        const bIsPhone = Utility.isPhoneDevice(this.getView());
        // Clear previous messages
        MessageHelper.clearAll();

        var oFields = {};
        var oTableItem = null;

        // Check if phone or desktop
        if (bIsPhone) {
          // For phone - get data from carousel page structure
          var oCarousel = this.byId("orderCarousel");
          var sActivePageId = oCarousel.getActivePage();
          var oActivePage = oCarousel
            .getPages()
            .find((page) => page.getId() === sActivePageId);

          if (oActivePage) {
            var aItems = oActivePage.getItems();
            // Get the input fields based on carousel structure from your XML
            oFields = {
              quantityReceive: aItems[2].getItems()[1].getItems()[1], // Quantity Receive input
              plant: aItems[4].getItems()[1], // Plant input
              quantityUnit: aItems[3].getItems()[1],
              storageLocation: aItems[5].getItems()[1], // Storage Location input
            };
          }
        } else {
          // For desktop - get data from table row
          oTableItem = oButton.getParent(); // Get table row where the button is located
          var aCells = oTableItem.getCells();
          oFields = {
            quantityReceive: aCells[5], // Quantity Receive column
            quantityUnit: aCells[6],
            plant: aCells[7], // Plant column
            storageLocation: aCells[8], // Storage Location column
          };
        }

        // Check if button is being unpressed (deselecting row)
        if (!oButton.getPressed()) {
          // Button was just unpressed - set it to unselected state
          this._handleToggleButtonState(oButton);

          // Update table selection for desktop only
          if (!bIsPhone) {
            var oTable = this.byId("orderTable");
            oTable.setSelectedItem(oTableItem, false); // Deselect row
          }
          return; // Exit early - no validation needed when unpressing
        }

        // messageHelper.clearAll(); // Clear previous messages

        // Button is being pressed (selecting row) - validate required fields first
        const oFieldValMsg = this._validateRequiredFields(oFields);
        if (oFieldValMsg) {
          oButton.setPressed(false); // Force unpress
          this._handleToggleButtonState(oButton); // Update button style
          // Create a mapping of field keys to user-friendly names
          const fieldNames = {
            quantityValMsg: "Quantity Receive",
            plantValMsg: "Plant",
            storageValMsg: "Storage Location",
          };
          // Use MessageHelper to add validation messages

          for (const key in oFieldValMsg) {
            if (oFieldValMsg[key] != null) {
              const fieldName = fieldNames[key] || key; // Use user-friendly name or key
              const errorMessage = `${fieldName}: ${oFieldValMsg[key]}`;
              MessageHelper.addMessage(
                "Error",
                MessageType.Error,
                oFieldValMsg[key],
                ""
              );
            }
          }
          return;
        }

        // Validation passed - set button to selected state
        this._handleToggleButtonState(oButton);

        // Update table selection to match button state (desktop only)
        if (!bIsPhone) {
          var oTable = this.byId("orderTable");
          oTable.setSelectedItem(oTableItem, true); // Select row
        }
      },

      /**
       * Focuses the input field when the carousel page changes.
       * @param {sap.ui.base.Event} oEvent
       */
      onCarouselPageChanged: function (oEvent) {
        var aActivePageId = oEvent.getParameter("activePages");
        var oPage = this.byId("orderCarousel").getPages()[aActivePageId];
        var oInput = oPage.getItems()[2].getItems()[1].getItems()[1];

        if (oInput) {
          // Wait for UI to update then set focus
          setTimeout(() => {
            oInput.focus();
          }, 500);
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
      _initializeData: async function () {
        try {
          this.oViewModel.setProperty("/isLoading", true);

          // Get total count first
          await this._loadTotalCount();

          // Load first item if availables
          if (this._totalItems > 0) {
            await this._loadSingleItem(0);
          }
        } catch (error) {
          console.error("Error initializing data:", error);
          sap.m.MessageToast.show("Error loading data");
        } finally {
          this.getView().setBusy(false);
        }
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

      _loadSingleItem: async function (index) {
        if (index < 0 || index >= this._totalItems) {
          return;
        }

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

          // Request only one item at specific index
          const aContexts = await oBinding.requestContexts(index, 1);

          if (aContexts && aContexts.length > 0) {
            const oItemData = aContexts[0].getObject();

            // Set new item data
            this.oViewModel.setProperty("/POItem", oItemData);
            this._currentIndex = index;
            this.oViewModel.setProperty("/currentIndex", index + 1);
            // Update navigation state
            this._updateNavigationState();
          }

          // Destroy binding to free memory
          oBinding.destroy();
        } catch (error) {
          console.error("Error loading item at index", index, error);
          MessageToast.show("Error loading item");
        } finally {
          this.oViewModel.setProperty("/isLoading", false);
        }
      },

      _updateNavigationState: function () {
        this.oViewModel.setProperty("/canGoPrevious", this._currentIndex > 0);
        this.oViewModel.setProperty(
          "/canGoNext",
          this._currentIndex < this._totalItems - 1
        );
      },

      // Navigation Methods - Optimized for performance
      onPreviousItem: function () {
        if (this._currentIndex > 0) {
          this._loadSingleItem(this._currentIndex - 1);
        }
      },

      onNextItem: function () {
        if (this._currentIndex < this._totalItems - 1) {
          this._loadSingleItem(this._currentIndex + 1);
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
        var oDataDetailPage = this.getView();
        if (oDataDetailPage) {
          oDataDetailPage.addEventDelegate({
            onkeydown: function (oEvent) {
              const bIsPhone = Utility.isPhoneDevice(this.getView());

              // Handle different function keys
              switch (oEvent.key) {
                case "F3": // Back
                  oEvent.preventDefault();
                  this.onNavBack();
                  break;
                case "F5": // Next (mobile only)
                  if (bIsPhone) {
                    oEvent.preventDefault();

                    this.onNextItem();
                    // this.debounceGoToNextCarouselPage();
                  }
                  break;
                case "F6": // Previous (mobile only)
                  if (bIsPhone) {
                    oEvent.preventDefault();
                    this.onPreviousItem();
                    // this.debounceGoToPreviousCarouselPage();
                  }
                  break;
                case "F7": // OK
                  oEvent.preventDefault();
                  this._triggerOkButtonPress();
                  break;
                case "F8": // Post
                  oEvent.preventDefault();
                  this.onSaveAndPostButtonPress();
                  break;
              }
            }.bind(this),
          });
        }
      },

      /**
       * Loads purchase order data into the carousel or table.
       * @private
       */
      _loadPurchaseOrderData: function () {
        var that = this;
        const bIsPhone = Utility.isPhoneDevice(this.getView());

        var aFilters = [
          new Filter(
            "PurchaseOrderNo",
            FilterOperator.EQ,
            this.sPurchaseOrderNumber
          ),
        ];

        // Bind data to the correct control bas ed on device type
        if (bIsPhone) {
          // var oCarousel = this.byId("orderCarousel");
          // var oBinding = oCarousel.getBinding("pages");
          // oBinding.attachEventOnce("dataReceived", function () {
          //   that.getView().setBusy(false);
          //   that._setFocusOnFirstQuantityReceivedInCarousel();
          // });
          // oBinding.filter(aFilters);
        } else {
          var oTable = this.byId("orderTable");
          // Set no data to Loading...
          oTable.setNoData("Loading...");
          // Unselect all item row
          oTable.removeSelections(true);
          // Destroy the table
          oTable.destroyItems();
          var oBinding = oTable.getBinding("items");
          oTable.attachEventOnce(
            "updateFinished",
            function () {
              this.getView().setBusy(false); s
              this._setFocusOnFirstQuantityReceived();
            },
            this
          );
          oBinding.filter(aFilters);
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

      _postToGoodsMovementBAPI: function (aBAPIData) {
        var that = this;
        const bIsPhone = Utility.isPhoneDevice(this.getView());
        var oModel = this.getView().getModel();

        // Your existing body structure works perfectly!
        var body = {
          PurchaseOrder: aBAPIData[0].PurchaseOrder,
          item: [...aBAPIData], // This is already an array of objects
        };

        // Clear previous messages before new API call
        MessageHelper.clearAll();

        // Show loading indicator
        this.getView().setBusy(true);

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
            .then(function () {
              that.getView().setBusy(false);
              // Refresh the data
              if (bIsPhone) {
                that.byId("orderCarousel").getBinding("pages").refresh();
                MessageToast.show("Data posted successfully");
              } else {
                that.byId("orderTable").getBinding("items").refresh();
              }
            })
            .catch(function (oError) {
              that.getView().setBusy(false);
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
       * Navigates to the next carousel page if available.
       * @private
       */
      _goToNextCarouselPage: function () {
        var oCarousel = this.byId("orderCarousel");
        var aPages = oCarousel.getPages();
        var sCurrentPageId = oCarousel.getActivePage();
        var iCurrentIndex = aPages.findIndex(
          (page) => page.getId() === sCurrentPageId
        );

        if (iCurrentIndex < aPages.length - 1) {
          var oNextPageId = aPages[iCurrentIndex + 1].getId();
          oCarousel.setActivePage(oNextPageId);
        }
      },

      /**
       * Navigates to the previous carousel page if available.
       * @private
       */
      _goToPreviousCarouselPage: function () {
        var oCarousel = this.byId("orderCarousel");
        var aPages = oCarousel.getPages();
        var sCurrentPageId = oCarousel.getActivePage();
        var iCurrentIndex = aPages.findIndex(
          (page) => page.getId() === sCurrentPageId
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
        oToggleButton.setType(bPressed ? "Success" : "Emphasized");
      },

      /**
       * Simulates OK button press on currently selected row or carousel page.
       * @private
       */
      _triggerOkButtonPress: function () {
        const bIsPhone = Utility.isPhoneDevice(this.getView());

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

      /**
       * Validates required fields before OK button action
       */
      _validateRequiredFields: function (oFields) {
        const sQuantityValid = ValidationHelper.validateField(
          oFields.quantityReceive,
          [
            ValidationHelper.VALIDATION_RULES.REQUIRED,
            oFields.quantityUnit.getValue() == "PC" ||
              oFields.quantityUnit.getValue() == "EA"
              ? ValidationHelper.VALIDATION_RULES.INTEGER
              : ValidationHelper.VALIDATION_RULES.NO_VALIDATION,
          ],
          "Quantity Receive"
        );

        const sPlantValid = ValidationHelper.validateField(
          oFields.plant,
          [ValidationHelper.VALIDATION_RULES.REQUIRED],
          "Plant"
        );

        const sStorageValid = ValidationHelper.validateField(
          oFields.storageLocation,
          [ValidationHelper.VALIDATION_RULES.REQUIRED],
          "Storage Location"
        );

        // Return the message if there is an error and return empty when there is no error
        if (sQuantityValid || sPlantValid || sStorageValid) {
          // Return an object of validation message
          return {
            quantityValMsg: sQuantityValid,
            plantValMsg: sPlantValid,
            storageValMsg: sStorageValid,
          };
        } else {
          // Return null/empty means the validation is passed
          return;
        }
      },
    });
  }
);
