sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/m/MessageToast',
    'sap/ui/core/routing/History',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'rfgundemo/util/Utility',
    'rfgundemo/util/ValidationHelper',
    'rfgundemo/util/CarouselHelper',
    'sap/ui/core/Fragment',
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
    'sap/ui/core/Messaging',
    'sap/ui/core/message/Message',
    'sap/ui/core/message/MessageType',
    'rfgundemo/util/MessageHelper'
  ],
  function (
    Controller,
    MessageToast,
    History,
    Filter,
    FilterOperator,
    Utility,
    ValidationHelper,
    CarouselHelper,
    Fragment,
    MessagePopover,
    MessageItem,
    Messaging,
    Message,
    MessageType,
    MessageHelper
  ) {
    'use strict';

    return Controller.extend('rfgundemo.controller.DataDetail', {

      /**
       * Called when the controller is initialized.
       * Attaches route matched handler, sets up CarouselHelper, and keyboard shortcuts.
       */
      onInit: function () {
        var that = this;
        var oRouter = this.getOwnerComponent().getRouter();
        this.sPurchaseOrderNumber = '';
        that.getView().setBusy(true);

        // Initialize CarouselHelper for mobile navigation
        CarouselHelper.init(this, "ZR_RF_PO_ITEM_MAIN", "PurchaseOrderNo");
        this._oCarouselHelper = CarouselHelper;

        // When the route is matched, load data based on purchase order number
        oRouter.attachRouteMatched(function (oEvent) {
          var oArgs = oEvent.getParameter('arguments');
          if (oArgs && oArgs.purchaseOrderNumber) {
            that.sPurchaseOrderNumber = oArgs.purchaseOrderNumber;

            // Add small delay to ensure view is ready
            setTimeout(function () {
              that._loadPurchaseOrderData();
              that._setOrderDetailsTitle();
            }, 100);
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
        var oHistory = History.getInstance();
        var sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          var oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteView1", {}, true);
        }
      },

      /**
       * Loads purchase order data into table or mobile form
       */
      _loadPurchaseOrderData: function () {
        var that = this;
        const bIsPhone = Utility.isPhoneDevice(this.getView());

        if (bIsPhone) {
          // For phone: Use CarouselHelper for indexing navigation
          this._oCarouselHelper.loadItems(this.sPurchaseOrderNumber)
            .then(function () {
              that.getView().setBusy(false);
              // Set focus on quantity receive field
              setTimeout(function () {
                that._setFocusOnQuantityReceive();
              }, 200);
            })
            .catch(function (error) {
              that.getView().setBusy(false);
              MessageToast.show("Error loading data: " + error.message);
            });
        } else {
          // For desktop: Load table data with error handling
          this._loadTableData();
        }
      },

      /**
       * Load data for desktop table with proper error handling
       */
      _loadTableData: function () {
        var that = this;

        var aFilters = [
          new Filter('PurchaseOrderNo', FilterOperator.EQ, this.sPurchaseOrderNumber)
        ];

        // Check if table exists before trying to get binding
        var oTable = this.byId('orderTable');
        if (!oTable) {
          // Table not ready yet, try again after a short delay
          setTimeout(function () {
            that._loadTableData();
          }, 100);
          return;
        }

        var oBinding = oTable.getBinding('items');
        if (!oBinding) {
          // Binding not ready yet, try again after a short delay
          setTimeout(function () {
            that._loadTableData();
          }, 100);
          return;
        }

        oTable.attachEventOnce('updateFinished', function () {
          that.getView().setBusy(false);
          that._setFocusOnFirstQuantityReceived();
        });

        oBinding.filter(aFilters);
      },

      /**
       * Navigate to next item (mobile only)
       */
      onNext: function () {
        var that = this;
        this.getView().setBusy(true);

        this._oCarouselHelper.goToNext()
          .then(function () {
            that.getView().setBusy(false);
            setTimeout(function () {
              that._setFocusOnQuantityReceive();
            }, 200);
          })
          .catch(function (error) {
            that.getView().setBusy(false);
            MessageToast.show("Error navigating: " + error.message);
          });
      },

      /**
       * Navigate to previous item (mobile only)
       */
      onPrevious: function () {
        var that = this;
        this.getView().setBusy(true);

        this._oCarouselHelper.goToPrevious()
          .then(function () {
            that.getView().setBusy(false);
            setTimeout(function () {
              that._setFocusOnQuantityReceive();
            }, 200);
          })
          .catch(function (error) {
            that.getView().setBusy(false);
            MessageToast.show("Error navigating: " + error.message);
          });
      },

      /**
       * Set focus on quantity receive field for mobile form
       */
      _setFocusOnQuantityReceive: function () {
        var oInput = this.byId("quantityReceiveInput");
        if (oInput) {
          oInput.focus();
        }
      },

      /**
       * Set focus on first quantity received field in table (desktop)
       */
      _setFocusOnFirstQuantityReceived: function () {
        var oTable = this.byId('orderTable');
        if (oTable) {
          var oFirstItem = oTable.getItems()[0];
          if (oFirstItem) {
            oFirstItem.getCells()[5].focus();
          }
        }
      },

      /**
       * Updates the order detail title based on PO number.
       */
      _setOrderDetailsTitle: function () {
        var oTitle = this.byId("orderDetailsTitle");
        if (oTitle) {
          oTitle.setText("Order Details - PO: " + this.sPurchaseOrderNumber);
        }
      },

      /**
       * Handler for OK button press on table rows or mobile form.
       * @param {sap.ui.base.Event} oEvent - The button press event
       */
      onOkButtonPress: function (oEvent) {
        // Get button object
        const oButton = oEvent.getSource();
        // Get device
        const bIsPhone = Utility.isPhoneDevice(this.getView());

        var oFields = {};
        var oTableItem = null;

        // Check if phone or desktop
        if (bIsPhone) {
          // For phone - get data from mobile form structure
          oFields = {
            quantityReceive: this.byId("quantityReceiveInput"),
            plant: this.byId("plantInput"),
            storageLocation: this.byId("storageLocationInput")
          };
        } else {
          // For desktop - get data from table row
          oTableItem = oButton.getParent(); // Get table row where the button is located
          var aCells = oTableItem.getCells();
          oFields = {
            quantityReceive: aCells[5], // Quantity Receive column
            plant: aCells[7], // Plant column
            storageLocation: aCells[8] // Storage Location column
          };
        }

        // Check if button is being unpressed (deselecting row)
        if (!oButton.getPressed()) {
          // Button was just unpressed - set it to unselected state
          this._handleToggleButtonState(oButton);

          // Update table selection for desktop only
          if (!bIsPhone) {
            var oTable = this.byId('orderTable');
            oTable.setSelectedItem(oTableItem, false); // Deselect row
          }
          return; // Exit early - no validation needed when unpressing
        }

        // Button is being pressed (selecting row) - validate required fields first
        if (!this._validateRequiredFields(oFields)) {
          oButton.setPressed(false); // Force unpress
          this._handleToggleButtonState(oButton); // Update button style
          return;
        }

        // Validation passed - set button to selected state
        this._handleToggleButtonState(oButton);

        // Update table selection to match button state (desktop only)
        if (!bIsPhone) {
          var oTable = this.byId('orderTable');
          oTable.setSelectedItem(oTableItem, true); // Select row
        }
      },

      /**
       * Modified save function to work with both table and mobile form
       */
      onSaveAndPostButtonPress: function () {
        var that = this;
        var aSelectedData = [];
        const bIsPhone = Utility.isPhoneDevice(this.getView());

        if (bIsPhone) {
          // Mobile: Get data from CarouselHelper and form inputs
          const currentItem = this._oCarouselHelper.getCurrentItem();

          // Get the actual input values from the form
          var oQuantityInput = this.byId("quantityReceiveInput");
          var oPlantInput = this.byId("plantInput");
          var oStorageInput = this.byId("storageLocationInput");
          var oConfirmButton = this.byId("confirmButton");

          // Validate required fields
          if (!this._validateMobileForm(oQuantityInput, oPlantInput, oStorageInput)) {
            return;
          }

          var oItemData = {
            'MaterialDocument': '',
            'PurchaseOrder': this.sPurchaseOrderNumber,
            'PurchaseOrderItem': currentItem.PurchaseOrderItemNo,
            'Material': currentItem.Material,
            'MaterialDescription': currentItem.MaterialDescription,
            'QuantitySuggest': parseFloat(currentItem.QuantitySuggest || 0).toFixed(3),
            'QuantityReceive': parseFloat(oQuantityInput.getValue() || 0).toFixed(3),
            'QuantityUnit': currentItem.PurchaseOrderQuantityUnit,
            'Plant': oPlantInput.getValue(),
            'StorageLocation': oStorageInput.getValue(),
            'ConfirmStatus': oConfirmButton.getPressed()
          };

          aSelectedData.push(oItemData);

          // Clear the quantity receive field after adding to array
          oQuantityInput.setValue('');

        } else {
          // Desktop: Get data from table
          var oTable = this.byId('orderTable');
          var aSelectedItems = oTable.getSelectedItems();

          aSelectedItems.forEach(function (oItem) {
            var oItemData = {};
            var aCells = oItem.getCells();
            var bIsOkButtonPressed = aCells[11].getPressed();

            if (!bIsOkButtonPressed) return;

            // Extract values from each selected row
            oItemData['MaterialDocument'] = '';
            oItemData['PurchaseOrder'] = that.sPurchaseOrderNumber;
            oItemData['PurchaseOrderItem'] = aCells[0].getValue();
            oItemData['Material'] = aCells[1].getValue();
            oItemData['MaterialDescription'] = aCells[2].getValue();
            oItemData['QuantitySuggest'] = parseFloat(aCells[4].getValue()).toFixed(3);
            oItemData['QuantityReceive'] = parseFloat(aCells[5].getValue()).toFixed(3);
            oItemData['QuantityUnit'] = aCells[6].getValue();
            oItemData['Plant'] = aCells[7].getValue();
            oItemData['StorageLocation'] = aCells[8].getValue();
            oItemData['ConfirmStatus'] = bIsOkButtonPressed;

            aSelectedData.push(oItemData);
            aCells[5].setValue('');
          });
        }

        // Post data to backend
        this._postDataToBackend(aSelectedData);
      },

      /**
       * Post data to backend
       */
      _postDataToBackend: function (aSelectedData) {
        var that = this;

        if (aSelectedData.length === 0) {
          MessageToast.show('No data to post');
          return;
        }

        try {
          this.getView().setBusy(true);

          var body = {
            PurchaseOrder: this.sPurchaseOrderNumber,
            item: aSelectedData
          };

          var oModel = this.getView().getModel();
          var oAction = oModel.bindContext('/PostReceiptGoods(...)');

          oAction.setParameter('PurchaseOrder', body.PurchaseOrder);
          oAction.setParameter('item', JSON.stringify(body.item));

          oAction.execute()
            .then(function () {
              that.getView().setBusy(false);
              MessageHelper.convertMessageFromBackend();

              const bIsPhone = Utility.isPhoneDevice(that.getView());
              if (bIsPhone) {
                // Refresh current item
                that._oCarouselHelper.refresh();
                MessageToast.show('Data posted successfully');
              } else {
                that.byId("orderTable").getBinding("items").refresh();
              }
            })
            .catch(function (oError) {
              that.getView().setBusy(false);
              if (oError.$reported == true) {
                MessageHelper.convertMessageFromBackend();
              } else {
                MessageHelper.addMessage('Error', MessageType.Error, oError.message, oError.stack);
              }
            });
        } catch (oError) {
          this.getView().setBusy(false);
          MessageToast.show('Error: ' + oError.message);
        }
      },

      /**
       * Validate mobile form fields
       */
      _validateMobileForm: function (oQuantityInput, oPlantInput, oStorageInput) {
        var bQuantityValid = ValidationHelper.validateField(
          oQuantityInput,
          [ValidationHelper.VALIDATION_RULES.REQUIRED],
          "Quantity Receive"
        );

        var bPlantValid = ValidationHelper.validateField(
          oPlantInput,
          [ValidationHelper.VALIDATION_RULES.REQUIRED],
          "Plant"
        );

        var bStorageValid = ValidationHelper.validateField(
          oStorageInput,
          [ValidationHelper.VALIDATION_RULES.REQUIRED],
          "Storage Location"
        );

        return bQuantityValid && bPlantValid && bStorageValid;
      },

      /**
       * Validates required fields before OK button action
       */
      _validateRequiredFields: function (oFields) {
        var bQuantityValid = ValidationHelper.validateField(
          oFields.quantityReceive,
          [ValidationHelper.VALIDATION_RULES.REQUIRED],
          "Quantity Receive"
        );

        var bPlantValid = ValidationHelper.validateField(
          oFields.plant,
          [ValidationHelper.VALIDATION_RULES.REQUIRED],
          "Plant"
        );

        var bStorageValid = ValidationHelper.validateField(
          oFields.storageLocation,
          [ValidationHelper.VALIDATION_RULES.REQUIRED],
          "Storage Location"
        );

        return bQuantityValid && bPlantValid && bStorageValid;
      },

      /**
       * Handles live change for number validation in input fields.
       * @param {sap.ui.base.Event} oEvent - The live change event
       */
      onLiveChangeCheckNumber: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue();

        // Remove non-numeric characters except decimal point
        var sValidatedValue = sValue.replace(/[^0-9.]/g, '');

        // Ensure only one decimal point
        var aParts = sValidatedValue.split(".");
        if (aParts.length > 2) {
          sValidatedValue = aParts[0] + "." + aParts.slice(1).join("");
        }

        // Set back only numeric value
        oInput.setValue(sValidatedValue);
      },

      /**
       * Updates toggle button visual state.
       * @param {sap.m.ToggleButton} oToggleButton
       */
      _handleToggleButtonState: function (oToggleButton) {
        var bPressed = oToggleButton.getPressed();
        oToggleButton.setType(bPressed ? 'Success' : 'Emphasized');
      },

      /**
       * Updated keyboard event handling
       */
      _attachInputEventDelegates: function () {
        var oDataDetailPage = this.byId('dataDetailPage');
        if (oDataDetailPage) {
          oDataDetailPage.addEventDelegate({
            onkeydown: function (oEvent) {
              const bIsPhone = Utility.isPhoneDevice(this.getView());

              switch (oEvent.key) {
                case 'F3': // Back
                  oEvent.preventDefault();
                  this.onNavBack();
                  break;
                case 'F5': // Next (mobile only)
                  if (bIsPhone) {
                    oEvent.preventDefault();
                    this.onNext();
                  }
                  break;
                case 'F6': // Previous (mobile only)
                  if (bIsPhone) {
                    oEvent.preventDefault();
                    this.onPrevious();
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

      /**
       * Handle OK button press for both mobile and desktop
       */
      _triggerOkButtonPress: function () {
        const bIsPhone = Utility.isPhoneDevice(this.getView());

        if (bIsPhone) {
          // Mobile: Toggle the confirm button
          var oConfirmButton = this.byId("confirmButton");
          if (oConfirmButton) {
            oConfirmButton.setPressed(!oConfirmButton.getPressed());
            this._handleToggleButtonState(oConfirmButton);
          }
        } else {
          // Desktop: Find and toggle OK button in selected table row
          var oTable = this.byId('orderTable');
          var oSelectedItems = oTable.getSelectedItems();
          if (oSelectedItems.length > 0) {
            var oFirstSelectedItem = oSelectedItems[0];
            var oOkButtonTable = oFirstSelectedItem
              .getCells()
              .find(cell =>
                cell instanceof sap.m.ToggleButton && cell.getText() === 'OK'
              );

            if (oOkButtonTable) {
              oOkButtonTable.setPressed(!oOkButtonTable.getPressed());
              this._handleToggleButtonState(oOkButtonTable);
            }
          }
        }
      },

      /**
       * Handle plant value help request
       */
      onPlantVHRequest: function (oEvent) {
        // Add your plant value help logic here
        MessageToast.show("Plant value help requested");
      },

      /**
       * Handle storage location value help request
       */
      onStrLocVHRequest: function (oEvent) {
        // Add your storage location value help logic here
        MessageToast.show("Storage location value help requested");
      },

      /**
       * Handle upload button press
       */
      onUpload: function (oEvent) {
        // Add your upload logic here
        MessageToast.show("Upload functionality");
      },

      /**
       * Handle download button press
       */
      onDownload: function (oEvent) {
        // Add your download logic here
        MessageToast.show("Download functionality");
      },

      /**
       * Show message popover with validation messages
       */
      onShowMessagePopover: function (oEvent) {
        var oButton = oEvent.getSource();

        if (!this._oMessagePopover) {
          this._oMessagePopover = new MessagePopover({
            items: {
              path: 'message>/',
              template: new MessageItem({
                title: '{message>message}',
                description: '{message>description}',
                type: '{message>type}',
                counter: '{message>counter}'
              })
            }
          });
          this.getView().addDependent(this._oMessagePopover);
        }

        this._oMessagePopover.openBy(oButton);
      },

      /**
       * Get button icon based on message type
       */
      getButtonIcon: function (aMessages) {
        if (!aMessages || aMessages.length === 0) {
          return "";
        }

        var sIcon = "sap-icon://message-information";
        aMessages.forEach(function (oMessage) {
          if (oMessage.type === MessageType.Error) {
            sIcon = "sap-icon://message-error";
          } else if (oMessage.type === MessageType.Warning && sIcon !== "sap-icon://message-error") {
            sIcon = "sap-icon://message-warning";
          }
        });

        return sIcon;
      },

      /**
       * Get button type based on message severity
       */
      getButtonType: function (aMessages) {
        if (!aMessages || aMessages.length === 0) {
          return "Default";
        }

        var sType = "Default";
        aMessages.forEach(function (oMessage) {
          if (oMessage.type === MessageType.Error) {
            sType = "Negative";
          } else if (oMessage.type === MessageType.Warning && sType !== "Negative") {
            sType = "Critical";
          }
        });

        return sType;
      },

      /**
       * Get message count for display
       */
      getMessageCount: function (aMessages) {
        return aMessages ? aMessages.length.toString() : "0";
      }

    });
  }
);