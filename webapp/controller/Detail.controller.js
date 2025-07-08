sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/routing/History"],
  (Controller, History) => {
    "use strict";

    return Controller.extend("rfgundemo.controller.App", {
      onInit() {},
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
    });
  }
);
