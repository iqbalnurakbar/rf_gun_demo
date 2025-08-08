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

    isPhoneDevice: function () {
      return sap.ui.Device.system.phone;
    }
  };
});
