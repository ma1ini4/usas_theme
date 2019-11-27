define(['modules/api',
        'modules/backbone-mozu',
        'underscore',
        'modules/jquery-mozu',
        'hyprlivecontext',
        'hyprlive',
        'modules/message-handler',
        'modules/order/b2cOrders',
        'modules/models-orders',
        "modules/block-ui",
        'modules/models-customer'
], function (api, Backbone, _, $, HyprLiveContext, Hypr, MessageHandler, B2cOrdersApi, OrdersModels, blockUiLoader, CustomerModels) {

    var B2cOrderView = Backbone.MozuView.extend({
       templateName: "modules/order/b2c-to-b2b-order-detail",
       render: function() {
           Backbone.MozuView.prototype.render.apply(this);
           return this;
       }
    });

    var B2cCustomerView = Backbone.MozuView.extend({
       templateName: "modules/order/b2c-to-b2b-customer",
       render: function() {
           Backbone.MozuView.prototype.render.apply(this);
           return this;
       }
    });

    function getParams() {
    	var location = window.location || { search: "" },
    		params = location.search.slice(1).split('&'),
        paramMap = {};

    	_.each(params, function(param, idx) {
    		params[idx] = decodeURIComponent( params[idx] );
        var splitParam = param.split('=');
        if(splitParam.length == 2){
            paramMap[splitParam[0]] = splitParam[1];
        }
    	});
     return paramMap;
    }
  //  var AccountModel = Backbone.MozuModel.extend({});
    var B2cOrderForm = function () {};
    $.extend(B2cOrderForm.prototype, {
        setLoading: function (yes) {
            this.loading = yes;
            this.$parent[yes ? 'addClass' : 'removeClass']('is-loading');
        },
        displayMessage: function (msg) {
            this.setLoading(false);
            this.$parent.find('[data-mz-role="popover-message"]').html('<span class="mz-validationmessage">' + msg + '</span>');
        },
        validate: function (payload) {

            if (!payload.accountName) return this.displayMessage('Organization Name missing'), false;
            if (!payload.billto) return this.displayMessage('Bill To Account ID missing'), false;
            if (!payload.shipto) return this.displayMessage('Ship To Account ID missing'), false;
            if (!payload.pricelist) return this.displayMessage('Pricelist Code missing'), false;
            if (!payload.orderId) return this.displayMessage('Order Id Missing'), false;
            return true;
        },
        b2ccustomerdetails: function() {
            var me = this;
            var params = getParams();
            if(params && params.id) {
              var payload = {
                accountName: this.$parent.find('[data-mz-account-name]').val(),
                billto: this.$parent.find('[data-mz-billto]').val(),
                shipto: this.$parent.find('[data-mz-shipto]').val(),
                pricelist: this.$parent.find('[data-mz-pricelist]').val(),
                orderId: params.id
              };
              if ( me.validate(payload) ) {
                 me.setLoading(true);
                // the new handle message needs to take the redirect.
                B2cOrdersApi.OrderDetail.processCustomer(payload).then(function (response) {
                  console.log('response ',response);
                  if ( response.code === 'success') {
                      me.displayMessage("Processing your order ... ");
                      me.setLoading(true);
                      B2cOrdersApi.OrderDetail.processOrders( { orderId: params.id }).then( function( orderResp){
                        var msg;
                        try {
                          var label =  "b2cToB2bConversionError_"+orderResp.resultCode;
                          msg = Hypr.getLabel(label, orderResp.result);
                        }  catch(e){
                          msg = orderResp.code === 'success' ? "Order has been processed succesfully" : "There was an error processing your order";
                        }
                        me.displayMessage( msg );
                        me.setLoading(false);
                      }, function(err){
                        var errorMsg = err && err.responseJSON && err.responseJSON.result ? err.responseJSON.result : '';
                        if ( err && err.responseJSON && err.responseJSON.resultCode ){
                          try {
                            var label =  "b2cToB2bConversionError_"+err.responseJSON.resultCode;
                            errorMsg = Hypr.getLabel(label, err.responseJSON.result);
                          } catch( e ){
                              console.log('error getting label',e);
                          }
                        }
                         me.displayMessage(errorMsg);
                         me.setLoading(false);
                      });
                     } else{
                        me.displayMessage(response.result);
                        me.setLoading(false);
                     }

                }, function(error) {
                  if ( error.responseJSON.resultCode === '101') { //Account already converted
                    me.setLoading(true);
                    me.displayMessage("Processing your order ... ");
                    B2cOrdersApi.OrderDetail.processOrders( { orderId: params.id }).then( function( orderResp){
                      var msg;
                      try {
                        var label =  "b2cToB2bConversionError_"+orderResp.resultCode;
                        msg = Hypr.getLabel(label, orderResp.result);
                      }  catch(e){
                        msg = orderResp.code === 'success' ? "Order has been processed succesfully" : "There was an error processing your order";
                      }
                      me.displayMessage( msg );
                      me.setLoading(false);
                    }, function(err){
                      console.log(err);
                      var errorMsg = err && err.responseJSON && err.responseJSON.result ? err.responseJSON.result : 'There was an error processing your order';
                      if ( err && err.responseJSON && err.responseJSON.resultCode ){
                        try {
                          var label =  "b2cToB2bConversionError_"+err.responseJSON.resultCode;
                          errorMsg = Hypr.getLabel(label, err.responseJSON.result);
                        } catch( e ){
                           console.log('error getting label',e);
                           errorMsg = 'There was an error processing your order';
                        }
                        me.displayMessage(errorMsg);
                        me.setLoading(false);
                      } else {
                        me.displayMessage("There was an error processing your order (" + errorMsg+")");
                        me.setLoading(false);
                      }
                    });
                  } else {
                    if (error.responseJSON.resultCode === '201') { //the order owner is a B2B Account
                      me.displayMessage('The owner of this order is a B2B Account');
                      me.setLoading(false);
                    } else {
                        var errorMsg;
                        try {
                          var label =  "b2cToB2bConversionError_"+error.responseJSON.resultCode;
                          errorMsg = Hypr.getLabel(label, error.responseJSON.result);
                        } catch( e ){
                           console.log('error getting label',e);
                           errorMsg = 'There was an error processing your order';
                        }
                        me.displayMessage(errorMsg);
                        me.setLoading(false);
                      }
                    }
                 }
               );
             }
           } else {
             me.displayMessage("Order Id missing");
           }
        },
        init: function (el) {
            this.$el = $(el);
            this.loading = false;
            this.$el.on('click', _.bind(this.doFormSubmit, this));
        },
        doFormSubmit: function(e){
            e.preventDefault();
            this.$parent = this.$el.closest(this.formSelector);
            this[this.pageType]();
        }
    });

    $(document).ready(function(event){
     try{
      blockUiLoader.globalLoader();
      var params = getParams();
      if(params && params.id) {
        B2cOrdersApi.OrderDetail.getOrderDetail( { orderId: params.id }).then( function( data ){
         if( data  ){
             var B2cOrderFormModel = new OrdersModels.Order(data.order);
             var b2cOrderView = new B2cOrderView({
                el: $( '#order-status-detail' ),
                model: B2cOrderFormModel,
                messagesEl: $('[data-mz-message-bar]')
             });
             var accModel = new CustomerModels.Customer(data.b2cAccount);
             var accView = new B2cCustomerView({
                el: $( '#b2c-customer' ),
                model: accModel
             });


             window.b2cOrderView = b2cOrderView;
             window.b2cAccountView = accView;

             accView.render();
             b2cOrderView.render();
             $(".mz-order-info").show();
             blockUiLoader.unblockUi();
             $('[data-mz-action="customer-details-submit"]').each(function () {
                 var loginPage = new B2cOrderForm();
                 loginPage.formSelector = 'form[name="mz-b2c-customer-details"]';
                 loginPage.pageType = 'b2ccustomerdetails';
                 loginPage.init(this);
             });
          } else {
            $('.mz-l-container').html("Order Missing");
            blockUiLoader.unblockUi();
          }

      },function(error){
        console.log('error ', error);

         $('[data-mz-message-bar]').html(error.responseJSON.message);
         blockUiLoader.unblockUi();
      });
    } else {
      //  $('[data-mz-message-bar]').html("Order missing");
        $('.mz-l-container').html("Order missing");
        blockUiLoader.unblockUi();
      }
    } catch(error){
      console.log('error ', error);
       $('[data-mz-message-bar]').html(error);
      blockUiLoader.unblockUi();
    }
    });
  });
