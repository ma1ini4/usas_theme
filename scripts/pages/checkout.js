require(["modules/jquery-mozu",
    "underscore", "hyprlive",
    'modules/api',
    "modules/backbone-mozu",
    "modules/models-checkout",
    "modules/views-messages",
    "modules/cart-monitor",
    'hyprlivecontext',
    'modules/editable-view',
    'modules/preserve-element-through-render',
    'modules/xpress-paypal',
    'modules/amazonpay',
    'modules/applepay'
    ],
    function ($, _, Hypr, api, Backbone, CheckoutModels, messageViewFactory, CartMonitor, HyprLiveContext, EditableView, preserveElements, PayPal, AmazonPay, ApplePay) {
        
    var ThresholdMessageView = Backbone.MozuView.extend({
      templateName: 'modules/checkout/checkout-discount-threshold-messages'
    });

    var CheckoutStepView = EditableView.extend({
        edit: function () {
            this.model.edit();
        },
        cancel: function(){
            this.model.cancelStep();
        },
        amazonShippingAndBilling: function() {
            //isLoading(true);
            window.location = "/checkout/"+window.order.id+"?isAwsCheckout=true&access_token="+window.order.get("fulfillmentInfo").get("data").addressAuthorizationToken+"&view="+AmazonPay.viewName;
        },
        next: function () {
            // wait for blur validation to complete
            var me = this;
            me.editing.savedCard = false;
            _.defer(function () {
                me.model.next();
            });
        },
        choose: function () {
            var me = this;
            me.model.choose.apply(me.model, arguments);
        },
        constructor: function () {
            var me = this;
            EditableView.apply(this, arguments);
            me.resize();
            setTimeout(function () {
                me.$('.mz-panel-wrap').css({ 'overflow-y': 'hidden'});
            }, 250);
            me.listenTo(me.model,'stepstatuschange', me.render, me);
            me.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    me.handleEnterKey(e);
                    return false;
                }
            });

            me.messageView = new ThresholdMessageView({
              el: $('#mz-discount-threshold-messages'),
              model: window.order
            });
        },
        initStepView: function() {
            this.model.initStep();
        },
        handleEnterKey: function (e) {
            this.model.next();
        },
        render: function () {
            this.$el.removeClass('is-new is-incomplete is-complete is-invalid').addClass('is-' + this.model.stepStatus());
            EditableView.prototype.render.apply(this, arguments);
            this.resize();
        },
        resize: _.debounce(function () {
            this.$('.mz-panel-wrap').animate({'height': this.$('.mz-inner-panel').outerHeight() });
        },200)
    });

    var OrderSummaryView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/checkout-order-summary',

        initialize: function () {
            var me = this;
            var customer = me.model.get('customer');
            if (customer.get('accountType') === "B2B") {
                me.model.set('isB2B', true);
                me.model.get('fulfillmentInfo').set('isB2B', true);
                me.model.get('fulfillmentInfo').get('fulfillmentContact').set('isB2B', true);
            }

            this.listenTo(this.model.get('billingInfo'), 'orderPayment', this.onOrderCreditChanged, this);
        },

        editCart: function () {
            window.location =  (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + "/cart";
        },

        onOrderCreditChanged: function (order, scope) {
            this.render();
        },

        // override loading button changing at inappropriate times
        handleLoadingChange: function () { }
    });

    var ShippingAddressView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-shipping-address',
        autoUpdate: [
            'firstName',
            'lastNameOrSurname',
            'address.address1',
            'address.address2',
            'address.address3',
            'address.cityOrTown',
            'address.countryCode',
            'address.stateOrProvince',
            'address.postalOrZipCode',
            'address.addressType',
            'phoneNumbers.home',
            'phoneNumbers.work',
            'contactId',
            'email'
        ],
        renderOnChange: [
            'address.countryCode',
            'contactId'
        ],
        requiredBehaviors: [1003],
        initialize: function() {
            var me = this;

            $('body').on('keypress change', '[name="firstname"]', _.debounce(function (e) {
                me.render();
            }, 777));
            $('body').on('keypress change', '[name="lastname"]', _.debounce(function (e) {
                me.render();
            }, 777));
        },
        next: function() {
            var me = this;
            var updateAttrs = [{
                'fullyQualifiedName': 'tenant~shippingLabelAttention',
                'values': [me.$el.find('[name="shippingLabelAttention"]').val()]
            },{
                'fullyQualifiedName': 'tenant~shippingLabelComment',
                'values': [me.$el.find('[name="shippingLabelComment"]').val()]
            }];
            console.log(updateAttrs);
            window.order.apiUpdateAttributes(updateAttrs).then(function(res) {
                me.model.set('shippingLabelAttention', me.$el.find('[name="shippingLabelAttention"]').val());
                me.model.set('shippingLabelComment', me.$el.find('[name="shippingLabelComment"]').val());
                
                CheckoutStepView.prototype.next.apply(me, arguments);
            }, function(err) {
                if(err.message === "Validation Error: Attribute tenant~shippingLabelAttention is invalid") {
                    window.order.messages.reset();
                    me.$el.find('[data-mz-validationmessage-for="shippingLabelAttention"]').text(Hypr.getLabel('requiredFieldMissing'));
                }
            });
        },
        beginAddContact: function () {
            this.model.set('contactId', 'new');
            var billingAddress = this.model.get('address');
            var addressDefaults = billingAddress.defaults;
            billingAddress.set('countryCode', addressDefaults.countryCode);
            billingAddress.set('addressType', addressDefaults.addressType);
            billingAddress.set('candidateValidatedAddresses', addressDefaults.candidateValidatedAddresses);
        },
        addNewAddress: function(e) {
            var me = this;
            var organization = me.model.get('address.address3');

            me.beginAddContact();
            me.model.set('address.address3', organization);
            me.model.set('address.address4', null);
            if (organization) {
                me.model.set('disableOrganization', true);
            }
            // me.disableB2bUserInputs(true, organization ? ['address.address3'] : organization);
        },
        additionalEvents: {
            "input [name='shippingphone']": "allowDigit",
            "input [name='workphone']": "allowDigit"
        },
        allowDigit:function(e){
            e.target.value= e.target.value.replace(/[^\d]/g,'');
        }
    });

    var ShippingInfoView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-shipping-method',
        renderOnChange: [
            'availableShippingMethods',
            'shippingMethodCode'
        ],
        initStepView: function() {
            console.log("initi step view");
            var me  = this;
            var isShippingAddressValid = me.model.get("fulfillmentContact").isValid();
            if(isShippingAddressValid)
            {
                var order = me.model.getOrder();
                /*if(this.model.get('availableShippingMethods').length){
                    var availableMethod = this.model.get('availableShippingMethods'),
                    lowestValue = _.min(availableMethod, function(ob) { return ob.price; });
                    this.model.set("shippingMethodCode", lowestValue.shippingMethodCode);
                }*/
                me.model.unset("shippingMethodCode");
                order.apiModel.update({ fulfillmentInfo: me.model.toJSON() })
                .then(function (o) {
                    console.log("unset the shipping method");
                });

            }
            this.model.initStep();
        },
        additionalEvents: {
            "change [data-mz-shipping-method]": "updateShippingMethod"
        },
        updateShippingMethod: function (e) {
            window.checkoutViews.parentView.model.get("fulfillmentInfo").set('prevoiusSelectedMethod', this.$('[data-mz-shipping-method]:checked').val());
            this.model.updateShippingMethod(this.$('[data-mz-shipping-method]:checked').val());
        }
    });

    var poCustomFields = function() {

        var fieldDefs = [];

        var isEnabled = HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder &&
            HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.isEnabled;

            if (isEnabled) {
                var siteSettingsCustomFields = HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.customFields;
                siteSettingsCustomFields.forEach(function(field) {
                    if (field.isEnabled) {
                        fieldDefs.push('purchaseOrder.pOCustomField-' + field.code);
                    }
                }, this);
            }

        return fieldDefs;
    };

    var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
    var pageContext = require.mozuData('pagecontext');
    var BillingInfoView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-payment-info',
        autoUpdate: [
            'savedPaymentMethodId',
            'paymentType',
            'card.paymentOrCardType',
            'card.cardNumberPartOrMask',
            'card.nameOnCard',
            'card.expireMonth',
            'card.expireYear',
            'card.cvv',
            'card.isCardInfoSaved',
            'check.nameOnCheck',
            'check.routingNumber',
            'check.checkNumber',
            'isSameBillingShippingAddress',
            'billingContact.firstName',
            'billingContact.lastNameOrSurname',
            'billingContact.address.address1',
            'billingContact.address.address2',
            'billingContact.address.address3',
            'billingContact.address.cityOrTown',
            'billingContact.address.countryCode',
            'billingContact.address.stateOrProvince',
            'billingContact.address.postalOrZipCode',
            'billingContact.phoneNumbers.home',
            'billingContact.phoneNumbers.work',
            'billingContact.email',
            'creditAmountToApply',
            'digitalCreditCode',
            'purchaseOrder.purchaseOrderNumber',
            'purchaseOrder.paymentTerm',
            'giftCardNumber',
            'giftCardSecurityCode'
        ].concat(poCustomFields()),
        renderOnChange: [
            'billingContact.address.countryCode',
            'paymentType',
            'isSameBillingShippingAddress',
            'usingSavedCard',
            'savedPaymentMethodId'
        ],
        additionalEvents: {
            "blur #mz-payment-credit-card-number": "changeCardType",
            "change [data-mz-digital-credit-enable]": "enableDigitalCredit",
            "change [data-mz-digital-credit-amount]": "applyDigitalCredit",
            "change [data-mz-gift-card-amount]": "applyGiftCard",
            "change [data-mz-gift-card-enable]": "enableGiftCard",
            "change [data-mz-digital-add-remainder-to-customer]": "addRemainderToCustomer",
            "change [name='paymentType']": "resetPaymentData",
            "input  [name='security-code'],[name='credit-card-number'],[name='shippingphone'],[name='workphone']": "allowDigit",
            "change [data-mz-purchase-order-payment-term]": "updatePurchaseOrderPaymentTerm"
        },
        changeCardType:function(e){
            window.checkoutModel = this.model;
            var number = e.target.value;
            var cardType='';
            // visa
            var re = new RegExp("^4");
            if (number.match(re) !== null){
                cardType = "VISA";
            }

            // Mastercard
            // Updated for Mastercard 2017 BINs expansion
             if (/^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/.test(number))
                cardType = "MC";

            // AMEX
            re = new RegExp("^3[47]");
            if (number.match(re) !== null)
                cardType = "AMEX";

            // Discover
            re = new RegExp("^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)");
            if (number.match(re) !== null)
                cardType = "DISCOVER";

            $('.mz-card-type-images').find('span').removeClass('active');
            if(cardType){
                this.model.set('card.paymentOrCardType',cardType);
                $("#mz-payment-credit-card-type").val(cardType);
                $('.mz-card-type-images').find('span[data-mz-card-type-image="'+cardType+'"]').addClass('active');
            }
            else{
                this.model.set('card.paymentOrCardType',null);
            }
        },
        initialize: function () {
            // this.addPOCustomFieldAutoUpdate();
            this.listenTo(this.model, 'change:giftCardNumber', this.onEnterGiftCardInfo, this);
            this.listenTo(this.model, 'change:giftCardSecurityCode', this.onEnterGiftCardInfo, this);
            this.listenTo(this.model, 'change:digitalCreditCode', this.onEnterDigitalCreditCode, this);
            this.listenTo(this.model, 'orderPayment', function (order, scope) {
                    this.render();
            }, this);
            this.listenTo(this.model, 'billingContactUpdate', function (order, scope) {
                    this.render();
            }, this);
            this.listenTo(this.model, 'change:savedPaymentMethodId', function (order, scope) {
                $('[data-mz-saved-cvv]').val('').change();
                this.render();
            }, this);
            this.codeEntered = !!this.model.get('digitalCreditCode');
        },
        allowDigit:function(e){
            e.target.value= e.target.value.replace(/[^\d]/g,'');
        },
        resetPaymentData: function (e) {
            if (e.target !== $('[data-mz-saved-credit-card]')[0]) {
                $("[name='savedPaymentMethods']").val('0');
            }
            this.editing.savedCard = true;
            this.model.clear();
            this.model.resetAddressDefaults();
            if(HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.isEnabled) {
                this.model.resetPOInfo();
            }
        },
        updatePurchaseOrderPaymentTerm: function(e) {
            this.model.setPurchaseOrderPaymentTerm(e.target.value);
        },
        render: function() {
            preserveElements(this, ['.v-button', '.p-button','#amazonButtonPaymentSection', '.apple-pay-button'], function() {
                CheckoutStepView.prototype.render.apply(this, arguments);
            });
            var status = this.model.stepStatus();
            if ($("#AmazonPayButton").length > 0 && $("#amazonButtonPaymentSection").length > 0)
                $("#AmazonPayButton").removeAttr("style").appendTo("#amazonButtonPaymentSection");

            if (visaCheckoutSettings.isEnabled && !this.visaCheckoutInitialized && this.$('.v-button').length > 0) {
                window.onVisaCheckoutReady = _.bind(this.initVisaCheckout, this);
                require([pageContext.visaCheckoutJavaScriptSdkUrl]);
                this.visaCheckoutInitialized = true;
            }
            var me = this;
            var customer = me.model.parent.get('customer');

            if (customer.get('accountType') == "B2B") {
                var sameAddress =  me.model.get('isSameBillingShippingAddress'),
                    paymentType = me.model.get('paymentType'),
                    userEmail = require.mozuData('user').email;

                // me.$('.mz-contact-selector-b2b-note').removeClass('hidden');
                me.$('#billing-email').val(userEmail);
                me.$('[data-mz-value="isSameBillingShippingAddress"]').parent().hide();

                if (!sameAddress && paymentType === 'Check') {
                    me.model.set('isSameBillingShippingAddress', true);
                    me.render();
                }
            }

            if (this.$(".apple-pay-button").length > 0)
                ApplePay.init();

            if (this.$(".p-button").length > 0)
                PayPal.loadScript();                
        },
        validateAddress: function (validationObj) {
            var me = this;
            var modelIsValid = [];
            for (var key in validationObj) {
                var value = 'billingContact.address.' + key;
                var keyValue = validationObj[key];
                var input = me.$el.find('[data-mz-value="' + value + '"]');

                if (key === 'stateOrProvince') {
                    input = me.$el.find('select[data-mz-value="' + value + '"]');

                    if (input.find('option:selected').val() && input.find('option:selected').val().length) {
                        modelIsValid.push(true);
                        input.next('[data-mz-validationmessage-for="' + value + '"]').text('');
                    } else {
                        modelIsValid.push(false);
                        input.next('[data-mz-validationmessage-for="' + value + '"]').text(keyValue.msg);
                    }
                }
                if (key === 'postalOrZipCode') {
                    input = me.$el.find('[name="postal-code"][data-mz-value="' + value + '"]');
                    if ((keyValue[1].pattern).test(input.val())) {
                        modelIsValid.push(true);
                        input.next('[data-mz-validationmessage-for="' + value + '"]').text('');
                    } else {
                        modelIsValid.push(false);
                        input.next('[data-mz-validationmessage-for="' + value + '"]').text(keyValue[1].msg);
                    }
                }
                if (keyValue.required) {
                    if (input.val() && input.val().length > 0) {
                        modelIsValid.push(true);
                        input.next('[data-mz-validationmessage-for="' + value + '"]').text('');
                    } else {
                        modelIsValid.push(false);
                        input.next('[data-mz-validationmessage-for="' + value + '"]').text(keyValue.msg);
                    }
                }
            }
            return modelIsValid.indexOf(false) !== -1 ? false : true;
        },
        validatePhoneNumber: function(validationObj) {
            var me = this;
            var modelIsValid = [];
            for (var key in validationObj) {
                var value = 'billingContact.phoneNumbers.' + key;
                var keyValue = validationObj[key];
                var input = me.$el.find('[data-mz-value="' + value + '"]');

                if (keyValue[0].required) {
                    if (input.val() && input.val().length >= keyValue[1].minLength && input.val().length <= keyValue[1].maxLength) {
                        modelIsValid.push(true);
                        input.next('[data-mz-validationmessage-for="' + value + '"]').text('');
                    } else {
                        modelIsValid.push(false);
                        input.next('[data-mz-validationmessage-for="' + value + '"]').text(keyValue[1].msg);
                    }
                }
            }
            return modelIsValid.indexOf(false) !== -1 ? false : true;
        },
        next: function() {
            var me = this;
            var user = require.mozuData('user');
            var apiData = require.mozuData('apicontext');
            var billingEmail = me.model.get('billingContact.email');
            var billingAddressIsValid = true,
                billingPhoneNumberIsValid = true;

            if (!me.model.get('isSameBillingShippingAddress')) {
                billingAddressIsValid = me.validateAddress(me.model.get('billingContact').get('address').validation);
                billingPhoneNumberIsValid = me.validatePhoneNumber(me.model.get('billingContact').get('phoneNumbers').validation);
            }

            if (!billingAddressIsValid || !billingPhoneNumberIsValid) {
                return false;
            }
            if(billingEmail !== user.email) {
                $.ajax({
                    url: '/api/commerce/customer/accounts/' + user.accountId,
                    headers: apiData.headers,
                    method: 'GET',
                    success: function (data) {
                        if (data.accountType === "B2B") {
                            $.ajax({
                                url: '/api/commerce/customer/b2baccounts/' + user.accountId + '/users',
                                headers: apiData.headers,
                                method: 'GET',
                                success: function(b2bUsers) {
                                    var currentB2bUser = b2bUsers.items.find(function(b2buser) {
                                        return b2buser.emailAddress === user.email;
                                    });
    
                                    currentB2bUser.emailAddress = billingEmail;
                                    // currentB2bUser.userName = billingEmail;
    
                                    $.ajax({
                                        url: '/api/commerce/customer/b2baccounts/' + user.accountId + '/user/' + currentB2bUser.userId,
                                        headers: apiData.headers,
                                        method: 'PUT',
                                        data: currentB2bUser
                                    });
                                }
                            });
                        }
                    }
                });
            }

            CheckoutStepView.prototype.next.apply(this, arguments);
            
        },
        updateAcceptsMarketing: function(e) {
            this.model.getOrder().set('acceptsMarketing', $(e.currentTarget).prop('checked'));
        },
        updatePaymentType: function(e) {
            var newType = $(e.currentTarget).val();
            this.model.set('usingSavedCard', e.currentTarget.hasAttribute('data-mz-saved-credit-card'));
            this.model.set('paymentType', newType);
        },
        edit: function () {
            this.model.edit();
            this.beginEditingCard();
        },
        beginEditingCard: function () {
            var me = this;
            me.model.getAccessToken();
            if (!this.model.isExternalCheckoutFlowComplete()) {
                this.editing.savedCard = true;
                this.render();
            } else {
                this.cancelExternalCheckout();
            }
        },
        beginEditingExternalPayment: function () {
            var me = this;
            if (this.model.isExternalCheckoutFlowComplete()) {
                this.doModelAction('cancelExternalCheckout').then(function () {
                    me.editing.savedCard = true;
                    me.render();
                });
            }
        },
        beginEditingBillingAddress: function() {
            this.editing.savedBillingAddress = true;            
            this.render();
        },
        beginApplyCredit: function () {
            this.model.beginApplyCredit();
            this.render();
        },
        cancelApplyCredit: function () {
            this.model.closeApplyCredit();
            this.render();
        },
        cancelExternalCheckout: function () {
            var me = this;
            this.doModelAction('cancelExternalCheckout').then(function () {
                me.editing.savedCard = false;
                me.render();
            });
        },
        finishApplyCredit: function () {
            var self = this;
            this.model.finishApplyCredit().then(function() {
                self.render();
            });
        },
        removeCredit: function (e) {
            var self = this,
                id = $(e.currentTarget).data('mzCreditId');
            this.model.removeCredit(id).then(function () {
                self.render();
            });
        },
        getDigitalCredit: function (e) {
            var self = this;
            this.$el.addClass('is-loading');
            this.model.getDigitalCredit().ensure(function () {
                self.$el.removeClass('is-loading');
            });
        },
        getGatewayGiftCard: function (e) {
            var self = this;
            this.$el.addClass('is-loading');
            this.model.getGatewayGiftCard().ensure(function() {
                 self.$el.removeClass('is-loading');
             });
        },
        stripNonNumericAndParseFloat: function (val) {
            if (!val) return 0;
            var result = parseFloat(val.replace(/[^\d\.]/g, ''));
            return isNaN(result) ? 0 : result;
        },
        applyDigitalCredit: function(e) {
            var val = $(e.currentTarget).prop('value'),
                creditCode = $(e.currentTarget).attr('data-mz-credit-code-target');  //target
            if (!creditCode) {
                //window.console.log('checkout.applyDigitalCredit could not find target.');
                return;
            }
            var amtToApply = this.stripNonNumericAndParseFloat(val);

            this.model.applyDigitalCredit(creditCode, amtToApply, true);
            this.render();
        },
        applyGiftCard: function(e) {
            var self = this,
                val = $(e.currentTarget).prop('value'),
                giftCardId = $(e.currentTarget).attr('data-mz-gift-card-target');
            if (!giftCardId) {
              return;
            }
            var amtToApply = this.stripNonNumericAndParseFloat(val);
            this.$el.addClass('is-loading');
            return this.model.applyGiftCard(giftCardId, amtToApply, true).then(function(){
                self.$el.removeClass('is-loading');
                this.render();
            }, function(error){
                self.$el.removeClass('is-loading');
            });
        },
        onEnterGiftCardInfo: function(model) {
            if (model.get('giftCardNumber') && model.get('giftCardSecurityCode')){
              this.$el.find('input#gift-card-security-code').siblings('button').prop('disabled', false);
            } else {
              this.$el.find('input#gift-card-security-code').siblings('button').prop('disabled', true);
            }
          },
        onEnterDigitalCreditCode: function(model, code) {
            if (code && !this.codeEntered) {
                this.codeEntered = true;
                this.$el.find('input#digital-credit-code').siblings('button').prop('disabled', false);
            }
            if (!code && this.codeEntered) {
                this.codeEntered = false;
                this.$el.find('input#digital-credit-code').siblings('button').prop('disabled', true);
            }
        },
        enableDigitalCredit: function(e) {
            var creditCode = $(e.currentTarget).attr('data-mz-credit-code-source'),
                isEnabled = $(e.currentTarget).prop('checked') === true,
                targetCreditAmtEl = this.$el.find("input[data-mz-credit-code-target='" + creditCode + "']"),
                me = this;

            if (isEnabled) {
                targetCreditAmtEl.prop('disabled', false);
                me.model.applyDigitalCredit(creditCode, null, true);
            } else {
                targetCreditAmtEl.prop('disabled', true);
                me.model.applyDigitalCredit(creditCode, 0, false);
                me.render();
            }
        },
        enableGiftCard: function(e){
            var isEnabled = $(e.currentTarget).prop('checked') === true,
                giftCardId = $(e.currentTarget).attr('data-mz-payment-id'),
                targetAmtEl = this.$el.find("input[data-mz-gift-card-target='" + giftCardId + "']"),
                me = this;

            if (isEnabled) {
              targetAmtEl.prop('disabled', false);
              me.model.applyGiftCard(giftCardId, null, true);
            } else {
              targetAmtEl.prop('disabled', true);
              me.model.applyGiftCard(giftCardId, 0, false);
            }
        },
        addRemainderToCustomer: function (e) {
            var creditCode = $(e.currentTarget).attr('data-mz-credit-code-to-tie-to-customer'),
                isEnabled = $(e.currentTarget).prop('checked') === true;
            this.model.addRemainingCreditToCustomerAccount(creditCode, isEnabled);
        },
        handleEnterKey: function (e) {
            var source = $(e.currentTarget).attr('data-mz-value');
            if (!source) return;
            switch (source) {
                case "creditAmountApplied":
                    return this.applyDigitalCredit(e);
                case "digitalCreditCode":
                    return this.getDigitalCredit(e);
                case "giftCardNumber":
                    if (this.model.get('giftCardNumber') && this.model.get('giftCardSecurityCode')){
                        return this.getGatewayGiftCard(e);
                    } else {
                        //TODO: trigger error message
                    }
                    break;
                case "giftCardSecurityCode":
                    if (this.model.get('giftCardNumber') && this.model.get('giftCardSecurityCode')){
                        return this.getGatewayGiftCard(e);
                    } else {
                        //TODO: trigger error message
                    }
                    break;
            }
        },
        /* begin visa checkout */
        initVisaCheckout: function () {
            var me = this;
            var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
            var apiKey = visaCheckoutSettings.apiKey || '0H1JJQFW9MUVTXPU5EFD13fucnCWg42uLzRQMIPHHNEuQLyYk';
            var clientId = visaCheckoutSettings.clientId || 'mozu_test1';
            var orderModel = this.model.getOrder();


            if (!window.V) {
                //window.console.warn( 'visa checkout has not been initilized properly');
                return false;
            }
            // on success, attach the encoded payment data to the window
            // then call the sdk's api method for digital wallets, via models-checkout's helper
            window.V.on("payment.success", function(payment) {
                //window.console.log({ success: payment });
                me.editing.savedCard = false;
                me.model.parent.processDigitalWallet('VisaCheckout', payment);
            });



            window.V.init({
                apikey: apiKey,
                clientId: clientId,
                paymentRequest: {
                    currencyCode: orderModel.get('currencyCode'),
                    subtotal: "" + orderModel.get('subtotal')
                }
            });
        }
        /* end visa checkout */
    });

    var CouponView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/coupon-code-field',
        handleLoadingChange: function (isLoading) {
            // override adding the isLoading class so the apply button
            // doesn't go loading whenever other parts of the order change
        },
        initialize: function () {
            var me = this;
            this.listenTo(this.model, 'change:couponCode', this.onEnterCouponCode, this);
            this.codeEntered = !!this.model.get('couponCode');
            this.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    if (me.codeEntered) {
                        me.handleEnterKey();
                    }
                    return false;
                }
            });

            me.messageView = new ThresholdMessageView({
              el: $('#mz-discount-threshold-messages'),
              model: window.order
            });
        },
        onEnterCouponCode: function (model, code) {
            if (code && !this.codeEntered) {
                this.codeEntered = true;
                this.$el.find('button').prop('disabled', false);
            }
            if (!code && this.codeEntered) {
                this.codeEntered = false;
                this.$el.find('button').prop('disabled', true);
            }
        },
        autoUpdate: [
            'couponCode'
        ],
        addCoupon: function (e) {
            // add the default behavior for loadingchanges
            // but scoped to this button alone
            var self = this;
            this.$el.addClass('is-loading');
            this.model.addCoupon().ensure(function() {
                self.$el.removeClass('is-loading');
                self.model.unset('couponCode');
                window.checkoutViews.couponCode.render();
            }).then(function(res){
                // if(res && res.status == "error"){
                //     window.checkoutViews.couponCode.model.trigger('error', {
                //         message: Hypr.getLabel('promoCodeError', res.code)
                //     });
                // }else{
                //     window.checkoutViews.parentView.model.get("fulfillmentInfo").unset("shippingMethodCode");
                //     window.checkoutViews.parentView.model.apiModel.update({ fulfillmentInfo: window.checkoutViews.parentView.model.get("fulfillmentInfo").toJSON() })
                //     .then(function (o) {
                //         console.log("unset the shipping method");
                //         window.checkoutViews.parentView.model.apiModel.getShippingMethodsFromContact().then(function(res){
                //             console.log(res);
                //             window.checkoutViews.parentView.model.get("fulfillmentInfo").unset("shippingMethodCode");
                //             window.checkoutViews.steps.shippingInfo.model.refreshShippingMethods(res);
                //         });
                //     });
                // }
            });
        },
        handleEnterKey: function () {
            this.addCoupon();
        }
    });

    var CommentsView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/comments-field',
        autoUpdate: ['shopperNotes.comments']
    });

    var attributeFields = function(){
        var me = this;

        var fields = [];

        var storefrontOrderAttributes = require.mozuData('pagecontext').storefrontOrderAttributes;
        if(storefrontOrderAttributes && storefrontOrderAttributes.length > 0) {

            storefrontOrderAttributes.forEach(function(attributeDef){
                fields.push('orderAttribute-' + attributeDef.attributeFQN);
            }, this);

        }

        return fields;
    };

    var ReviewOrderView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/step-review',
        autoUpdate: [
            'createAccount',
            'agreeToTerms',
            'emailAddress',
            'password',
            'confirmPassword'
        ].concat(attributeFields()),
        renderOnChange: [
            'createAccount',
            'isReady'
        ],
        additionalEvents : {
            'click [data-mz-action="submit"]': 'submit'
        },
        initialize: function () {
            var me = this;
            this.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    me.handleEnterKey();
                    return false;
                }
            });
            var user = require.mozuData('user');
            if (user.isAnonymous) {
                me.model.set('createAccount', true);
            }

            this.model.on('passwordinvalid', function(message) {
                me.$('[data-mz-validationmessage-for="password"]').text(message);
            });
            this.model.on('userexists', function (user) {
                me.$('[data-mz-validationmessage-for="emailAddress"]').html(Hypr.getLabel("customerAlreadyExists", user, encodeURIComponent(window.location.pathname)));
            });
        },
        render: function() {
          var me = this;
          var user = require.mozuData('user');
          if (user.isAnonymous && me.model.get('createAccount')) {
              var billingEmail = me.model.get('billingInfo').get('billingContact').get('email');
              if ( billingEmail ) {
                me.model.set('emailAddress', billingEmail);
             }
          }
          Backbone.MozuView.prototype.render.apply(this);
        },
        submit: function () {
            console.log(this.model);
            var self = this;
            _.defer(function () {
                self.model.submit();
            });
        },
        handleEnterKey: function () {
            this.submit();
        }
    });

    var ParentView = function(conf) {
      var gutter = parseInt(Hypr.getThemeSetting('gutterWidth'), 10);
      if (isNaN(gutter)) gutter = 15;
      var mask;
      conf.model.on('beforerefresh', function() {
         killMask();
         conf.el.css('opacity',0.5);
         var pos = conf.el.position();
         mask = $('<div></div>', {
           'class': 'mz-checkout-mask'
         }).css({
           width: conf.el.outerWidth() + (gutter * 2),
           height: conf.el.outerHeight() + (gutter * 2),
           top: pos.top - gutter,
           left: pos.left - gutter
         }).insertAfter(conf.el);
      });
      function killMask() {
        conf.el.css('opacity',1);
        if (mask) mask.remove();
      }
      conf.model.on('refresh', killMask);
      conf.model.on('error', killMask);
      return conf;
    };



    $(document).ready(function () {
        var $checkoutView = $('#checkout-form'),
            checkoutData = require.mozuData('checkout');

        AmazonPay.init(true);

        checkoutData.isAmazonPayEnable = AmazonPay.isEnabled;

        var checkoutModel = window.order = new CheckoutModels.CheckoutPage(checkoutData),
            checkoutViews = {
                parentView: new ParentView({
                  el: $checkoutView,
                  model: checkoutModel
                }),
                steps: {
                    shippingAddress: new ShippingAddressView({
                        el: $('#step-shipping-address'),
                        model: checkoutModel.get('fulfillmentInfo').get('fulfillmentContact')
                    }),
                    shippingInfo: new ShippingInfoView({
                        el: $('#step-shipping-method'),
                        model: checkoutModel.get('fulfillmentInfo')
                    }),
                    paymentInfo: new BillingInfoView({
                        el: $('#step-payment-info'),
                        model: checkoutModel.get('billingInfo')
                    })
                },
                orderSummary: new OrderSummaryView({
                    el: $('#order-summary'),
                    model: checkoutModel
                }),
                couponCode: new CouponView({
                    el: $('#coupon-code-field'),
                    model: checkoutModel
                }),
                comments: Hypr.getThemeSetting('showCheckoutCommentsField') && new CommentsView({
                    el: $('#comments-field'),
                    model: checkoutModel
                }),

                reviewPanel: new ReviewOrderView({
                    el: $('#step-review'),
                    model: checkoutModel
                }),
                messageView: messageViewFactory({
                    el: $checkoutView.find('[data-mz-message-bar]'),
                    model: checkoutModel.messages
                })
            };

        window.checkoutViews = checkoutViews;

        checkoutViews.orderSummary.render();

        checkoutModel.on('complete', function() {
            CartMonitor.setCount(0);
            if (window.amazon)
                window.amazon.Login.logout();
            window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + "/checkout/" + checkoutModel.get('id') + "/confirmation";
        });
        $('body').on('keydown keyup focus blur', '[type="tel"]', function (e) {
            //  maskTel(e);
            e.target.value = e.target.value.replace(/(\d{3})\)?(\d{3})\-?(\d{4})/, '($1) $2-$3');
        });
        var $reviewPanel = $('#step-review');
        checkoutModel.on('change:isReady',function (model, isReady) {
            if (isReady) {
                setTimeout(function () { window.scrollTo(0, $reviewPanel.offset().top); }, 750);
            }
        });

        _.invoke(checkoutViews.steps, 'initStepView');

        $checkoutView.noFlickerFadeIn();
        if (AmazonPay.isEnabled)
            AmazonPay.addCheckoutButton(window.order.id, false);
    });

});
