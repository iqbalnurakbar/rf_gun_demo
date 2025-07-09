sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
  ],
  (Controller, MessageToast, SelectDialog, StandardListItem) => {
    "use strict";

    return Controller.extend("rfgundemo.controller.MainPage", {
      onInit() {
        this._attachInputEventDelegates();
      },


      onPressEnter: function (oEvent) {
        // Get the value of the input field
        var sPONumber = oEvent.getSource().getValue();
        // Check if the input is empty or contains only whitespace
        if (!sPONumber || sPONumber.trim() === "") {
          MessageToast.show("Please enter a Purchase Order Number");
          return;
        }
        // Get the view
        const oView = this.getView();
        // Get the model
        const oModel = oView.getModel();
        // Create the path for the OData request
        const sPath = "/ZR_RF_PO_ITEM_MAIN_BETA(P_PurchaseOrderNo='" + sPONumber.trim() + "')/Set";
        // Create list binding
        const oListBinding = oModel.bindList(sPath);
        // Get the router
        const oRouter = this.getOwnerComponent().getRouter()
        // Show loading indicator
        oView.setBusy(true);
        // Execute the request to fetch contexts
        oListBinding.requestContexts().
          then(
            function (aContexts) {
              // Disable loading indicator
              oView.setBusy(false);
              // Check if data were found
              if (aContexts && aContexts.length > 0) {
                // If data were found, navigate to the detail page with the PO number
                oRouter.navTo("detail", {
                  poNumber: sPONumber.trim()
                });
                // Show a message with the number of items found
                MessageToast.show("Found " + aContexts.length + " items for PO " + sPONumber);
              } else {
                // If no data were found, show a message
                MessageToast.show("No items found for Purchase Order: " + sPONumber);
              }
            }.bind(this)
          ).catch(
            function (oError) {
              // Disable loading indicator
              oView.setBusy(false);
              //Show an error message
              MessageToast.show("Error loading PO items: " + oError.message);
            }
          );
      },

      /**
     * Attaches a keydown event delegate to the main page.
     */
      _attachInputEventDelegates: function () {
        const oMainPage = this.byId("mainPage");

        if (oMainPage) {
          oMainPage.addEventDelegate({
            onkeydown: (oEvent) => {
              if (oEvent.key === "F4") {
                // Get the input field
                const oInput = this.byId("poInput");
                if (oInput) {
                  // Create a simulated event object
                  const oSimulatedEvent = {
                    getSource: () => oInput
                  };

                  // Call onPressEnter with simulated event
                  this.onPressEnter(oSimulatedEvent);
                }
              }
            },
          });
        }
      }
    });
  }
);
