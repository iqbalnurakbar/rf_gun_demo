/* eslint-disable no-undef */
sap.ui.define([], function () {
    "use strict";

    /**
     * Simple ValidationHelper - Basic field validation only
     */
    return {

        /**
         * Built-in validation rules
         */
        VALIDATION_RULES: {
            REQUIRED: {
                name: "required",
                validate: function (value) {
                    return value !== null && value !== undefined && value.toString().trim() !== "";
                },
                message: "This field is required"
            },

            NUMERIC: {
                name: "numeric",
                validate: function (value) {
                    return !isNaN(value) && value !== "";
                },
                message: "Please enter a valid number"
            },

            POSITIVE_NUMBER: {
                name: "positiveNumber",
                validate: function (value) {
                    const num = parseFloat(value);
                    return !isNaN(num) && num > 0;
                },
                message: "Please enter a positive number"
            },

            MIN_LENGTH: function (minLength) {
                return {
                    name: "minLength",
                    validate: function (value) {
                        return value && value.toString().length >= minLength;
                    },
                    message: `Minimum ${minLength} characters required`
                };
            },

            MAX_LENGTH: function (maxLength) {
                return {
                    name: "maxLength",
                    validate: function (value) {
                        return !value || value.toString().length <= maxLength;
                    },
                    message: `Maximum ${maxLength} characters allowed`
                };
            },

            INTEGER: {
                name: "integer",
                validate: function (value) {
                    if (!value) return true; // Allow empty (combine with REQUIRED if needed)
                    const num = parseFloat(value);
                    return !isNaN(num) && Number.isInteger(num);
                },
                message: "Please enter a whole number (no decimals)"
            },

            REGEX: function (pattern, customMessage) {
                return {
                    name: "regex",
                    validate: function (value) {
                        return !value || pattern.test(value.toString());
                    },
                    message: customMessage || "Invalid format"
                };
            },
            NO_VALIDATION: {
                name: "no_validation",
                validate: function (value) {
                    return true; // Always passes validation
                },
                message: "" // No error message since it never fails
            }
        },

        /**
         * Validates a field
         * 
         * @param {sap.ui.core.Control} field - The UI5 control to validate
         * @param {array|object} rules - Validation rules to apply
         * @param {string} fieldName - Custom field name for error messages (optional)
         * @returns {string} returns errorMessage if there is an error, and returns nothing when the validation passed
         * 
         * @example
         * // Simple required validation
         * ValidationHelper.validateField(oInput, [ValidationHelper.VALIDATION_RULES.REQUIRED]);
         * 
         * // Multiple rules with custom field name
         * ValidationHelper.validateField(
         *   oQuantityInput, 
         *   [ValidationHelper.VALIDATION_RULES.REQUIRED, ValidationHelper.VALIDATION_RULES.POSITIVE_NUMBER],
         *   "Quantity"
         * );
         */
        validateField: function (field, rules, fieldName) {
            if (!field || !field.getValue) {
                console.warn("ValidationHelper: Invalid field provided");
                return false;
            }

            const value = field.getValue();
            const rulesArray = Array.isArray(rules) ? rules : [rules];

            // Clear previous validation state
            this._clearFieldValidation(field);

            // Apply each rule
            for (let rule of rulesArray) {
                if (!rule.validate(value)) {
                    const errorMessage = fieldName ? `${fieldName}: ${rule.message}` : rule.message;
                    this._setFieldError(field, errorMessage);
                    return errorMessage;
                }
            }

            return;
        },

        // Private helper methods
        _setFieldError: function (field, message) {
            if (field.setValueState) {
                field.setValueState('Error');
            }
            if (field.setValueStateText) {
                field.setValueStateText(message);
            }
            if (field.focus) {
                field.focus();
            }
        },

        _clearFieldValidation: function (field) {
            if (field.setValueState) {
                field.setValueState('None');
            }
            if (field.setValueStateText) {
                field.setValueStateText('');
            }
        }
    };
});