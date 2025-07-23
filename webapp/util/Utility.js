/* eslint-disable no-undef */
sap.ui.define([], function () {
  'use strict';

  return {
    debounce: function (fn, delay) {
      var timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    isPhoneDevice: function (oView) {
      const oDeviceModel = oView.getModel('device');
      return oDeviceModel.getProperty('/system/phone');
    }
  };
});
