sap.ui.define([
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "sap/ui/core/Messaging",
    "sap/m/MessageToast",
    'rfgundemo/util/Utility',
], function (Message, MessageType, Messaging, MessageToast, Utility) {
    "use strict";

    const MessageHelper = {
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

        addToastMessage: function (sMessage) {
            MessageToast.show(sMessage)
        },

        convertMessageFromBackend: function () {
            const aMessages = MessageHelper.getMessages();
            const aMessagesToRemove = []; // Store messages to remove
            const aNewMessages = []; // Store new messages to add

            for (const oMessage of aMessages) {
                if (oMessage.code != null) {
                    // Mark this message for removal
                    aMessagesToRemove.push(oMessage);

                    // Create new converted message
                    aNewMessages.push({
                        message: (oMessage.code == 'ZMSGRFGUNDEMO/002' && oMessage.type == 'Error') ? oMessage.type + ' ' + oMessage.message.substring(0, 7) : oMessage.type,
                        type: oMessage.type,
                        additionalText: (oMessage.type == "Error") ? "Document is not Posted with BAPI" : "Document Posted with BAPI",
                        description: oMessage.message || ""
                    });
                }
            }

            // Remove only the backend messages
            if (aMessagesToRemove.length > 0) {
                Messaging.removeMessages(aMessagesToRemove);
            }

            // Add the new converted messages
            return aNewMessages;
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
            if (MessageHelper.hasErrors()) return "Negative";
            if (MessageHelper.hasWarnings()) return "Critical";
            if (MessageHelper.hasSuccess()) return "Success";
            return "Neutral";
        },

        getButtonIcon: function () {
            if (MessageHelper.hasErrors()) return "sap-icon://error";
            if (MessageHelper.hasWarnings()) return "sap-icon://alert";
            if (MessageHelper.hasSuccess()) return "sap-icon://sys-enter-2";
            return "sap-icon://information";
        }
    };

    return MessageHelper;
});