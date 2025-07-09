sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/routing/History"],
  (Controller, History) => {
    "use strict";

    return Controller.extend("rfgundemo.controller.App", {
      onInit() {
        this._attachInputEventDelegates();
      },
      onPressBack() {
        console.log("HIT NAV BACK");
        const oHistory = History.getInstance();
        const sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("mainview", {}, true);
        }
      },
      _attachInputEventDelegates: function () {
        const oDetailPage = this.byId("dataDetailPage");

        if (oDetailPage) {
          console.log("Hit");
          oDetailPage.addEventDelegate({
            onkeydown: (oEvent) => {
              if (oEvent.key === "F3") {
                this.onPressBack();
                // } else if (oEvent.key === "Enter") {
                //   MessageToast.show("Enter pressed in Plant field");
              }
            },
          });
        }
      },
    });
  }
);
