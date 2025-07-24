sap.ui.define([
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator'
], function (JSONModel, Filter, FilterOperator) {
    'use strict';

    /**
     * CarouselHelper - Handles indexing-based navigation for mobile forms
     */
    return {

        /**
         * Initialize the carousel helper
         * @param {sap.ui.core.mvc.Controller} oController - The controller instance
         * @param {string} sEntitySet - OData entity set name
         * @param {string} sFilterProperty - Property name for filtering
         */
        init: function (oController, sEntitySet, sFilterProperty) {
            this._oController = oController;
            this._sEntitySet = sEntitySet;
            this._sFilterProperty = sFilterProperty;
            this._currentIndex = 0;

            // Create view model for indexing
            this._oViewModel = new JSONModel({
                currentIndex: 1,
                total: 0,
                canGoPrevious: false,
                canGoNext: false,
                currentItem: {}
            });

            // Set the model on the view
            this._oController.getView().setModel(this._oViewModel, "view");
        },

        /**
         * Load items with indexing support
         * @param {string} sFilterValue - Value to filter by
         * @returns {Promise} Promise that resolves when loading is complete
         */
        loadItems: function (sFilterValue) {
            var that = this;
            this._sFilterValue = sFilterValue;

            return this._loadItemCount().then(function () {
                if (that._oViewModel.getProperty("/total") > 0) {
                    return that._loadSingleItem(0); // Load first item
                }
            });
        },

        /**
         * Get total count of items
         * @private
         * @returns {Promise<number>} Promise that resolves with item count
         */
        _loadItemCount: function () {
            var that = this;
            const oModel = this._oController.getView().getModel();

            const aFilters = [
                new Filter(this._sFilterProperty, FilterOperator.EQ, this._sFilterValue)
            ];

            const oBinding = oModel.bindList("/" + this._sEntitySet, undefined, undefined, aFilters);

            return oBinding.requestContexts().then(function (aContexts) {
                that._oViewModel.setProperty("/total", aContexts.length);
                return aContexts.length;
            });
        },

        /**
         * Load single item by index using OData $skip and $top
         * @private
         * @param {number} index - Zero-based index of item to load
         * @returns {Promise} Promise that resolves when item is loaded
         */
        _loadSingleItem: function (index) {
            var that = this;
            const oModel = this._oController.getView().getModel();

            const aFilters = [
                new Filter(this._sFilterProperty, FilterOperator.EQ, this._sFilterValue)
            ];

            const oBinding = oModel.bindList("/" + this._sEntitySet, undefined, undefined, aFilters);

            return oBinding.requestContexts(index, 1).then(function (aContexts) {
                const item = aContexts[0]?.getObject() || {};

                // Initialize empty fields if needed
                if (!item.QuantityReceive) {
                    item.QuantityReceive = "";
                }

                // Update view model with current item
                that._oViewModel.setProperty("/currentItem", item);
                that._currentIndex = index;
                that._oViewModel.setProperty("/currentIndex", index + 1);
                that._updateNavState();

                return item;
            });
        },

        /**
         * Update navigation button states
         * @private
         */
        _updateNavState: function () {
            const total = this._oViewModel.getProperty("/total");
            this._oViewModel.setProperty("/canGoPrevious", this._currentIndex > 0);
            this._oViewModel.setProperty("/canGoNext", this._currentIndex < total - 1);
        },

        /**
         * Navigate to next item
         * @returns {Promise} Promise that resolves when navigation is complete
         */
        goToNext: function () {
            if (this._currentIndex < this._oViewModel.getProperty("/total") - 1) {
                return this._loadSingleItem(this._currentIndex + 1);
            }
            return Promise.resolve();
        },

        /**
         * Navigate to previous item
         * @returns {Promise} Promise that resolves when navigation is complete
         */
        goToPrevious: function () {
            if (this._currentIndex > 0) {
                return this._loadSingleItem(this._currentIndex - 1);
            }
            return Promise.resolve();
        },

        /**
         * Get current item data
         * @returns {object} Current item object
         */
        getCurrentItem: function () {
            return this._oViewModel.getProperty("/currentItem");
        },

        /**
         * Update a property of the current item
         * @param {string} sProperty - Property name to update
         * @param {any} vValue - New value
         */
        updateCurrentItem: function (sProperty, vValue) {
            this._oViewModel.setProperty("/currentItem/" + sProperty, vValue);
        },

        /**
         * Get current index (1-based)
         * @returns {number} Current index
         */
        getCurrentIndex: function () {
            return this._oViewModel.getProperty("/currentIndex");
        },

        /**
         * Get total count
         * @returns {number} Total count
         */
        getTotal: function () {
            return this._oViewModel.getProperty("/total");
        },

        /**
         * Check if can go to previous item
         * @returns {boolean} True if can go previous
         */
        canGoPrevious: function () {
            return this._oViewModel.getProperty("/canGoPrevious");
        },

        /**
         * Check if can go to next item
         * @returns {boolean} True if can go next
         */
        canGoNext: function () {
            return this._oViewModel.getProperty("/canGoNext");
        },

        /**
         * Jump to specific item by index (0-based)
         * @param {number} index - Zero-based index to jump to
         * @returns {Promise} Promise that resolves when navigation is complete
         */
        jumpToItem: function (index) {
            const total = this._oViewModel.getProperty("/total");
            if (index >= 0 && index < total) {
                return this._loadSingleItem(index);
            }
            return Promise.resolve();
        },

        /**
         * Refresh current item
         * @returns {Promise} Promise that resolves when refresh is complete
         */
        refresh: function () {
            return this._loadSingleItem(this._currentIndex);
        },

        /**
         * Reset to first item
         * @returns {Promise} Promise that resolves when reset is complete
         */
        reset: function () {
            this._currentIndex = 0;
            if (this._oViewModel.getProperty("/total") > 0) {
                return this._loadSingleItem(0);
            }
            return Promise.resolve();
        }
    };
});