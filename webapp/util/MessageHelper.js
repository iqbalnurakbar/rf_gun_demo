sap.ui.define([
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "sap/ui/core/Messaging",
    "sap/m/MessageToast"
], function (Message, MessageType, Messaging, MessageToast) {
    "use strict";

    return {

        init: function (oView) {
            Messaging.removeAllMessages();
            oView.setModel(Messaging.getMessageModel(), "message");
        },

        addMessage: function (sMessage, sType, sAdditionalText, sDescription) {
            const oMessage = new Message({
                message: sMessage,
                type: sType || MessageType.Information,
                additionalText: sAdditionalText || "",
                description: sDescription || ""
            });

            Messaging.addMessages(oMessage);
        },

        convertMessageFromBackend: function () {
            const aMessages = this.getMessages();
            for (const oMessage of aMessages) {
                if (oMessage.code != null) {
                    oMessage.description = oMessage.message || "";
                    oMessage.additionalText = (oMessage.type == "Error") ? "Document is not Posted with BAPI" : "Document Posted with BAPI";
                    oMessage.message = oMessage.type;
                }
            }
        },


        clearAll: function () {
            Messaging.removeAllMessages();
        },

        getMessages: function () {
            const aMessages = Messaging.getMessageModel().getData();
            return aMessages;
        },

        getMessageCount: function () {
            const aMessages = Messaging.getMessageModel().getData();
            return aMessages.length || "";
        },

        hasErrors: function () {
            const aMessages = Messaging.getMessageModel().getData();
            return aMessages.some(function (msg) {
                return msg.type === MessageType.Error;
            });
        },

        hasWarnings: function () {
            const aMessages = Messaging.getMessageModel().getData();
            return aMessages.some(function (msg) {
                return msg.type === MessageType.Warning;
            });
        },

        hasSuccess: function () {
            const aMessages = Messaging.getMessageModel().getData();
            return aMessages.some(function (msg) {
                return msg.type === MessageType.Success;
            });
        },

        getButtonType: function () {
            if (this.hasErrors()) return "Negative";
            if (this.hasWarnings()) return "Critical";
            if (this.hasSuccess()) return "Success";
            return "Neutral";
        },

        getButtonIcon: function () {
            if (this.hasErrors()) return "sap-icon://error";
            if (this.hasWarnings()) return "sap-icon://alert";
            if (this.hasSuccess()) return "sap-icon://sys-enter-2";
            return "sap-icon://information";
        }
    };
});