define(['modules/api',
        'modules/backbone-mozu',
        'underscore',
        'modules/jquery-mozu',
        'hyprlivecontext',
        'hyprlive',
        'modules/message-handler',
        'modules/order/b2bOrders',
        'modules/models-orders',
        "modules/block-ui",
        'modules/models-customer',
        'modules/models-b2b-account',
        'modules/views-modal-dialog',
        'modules/models-dialog'
], function (api, Backbone, _, $, HyprLiveContext, Hypr, MessageHandler, B2bOrdersApi, OrdersModels, blockUiLoader, CustomerModels,B2BAccountModels, ModalDialogView, DialogModels ) {

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
    var B2cFormModel = Backbone.MozuModel.extend({
      relations: {
          order: OrdersModels.Order,
          b2cAccount: CustomerModels.Customer,
          b2bAccount: B2BAccountModels.b2bAccount
      }
    });

    var B2cFormView = Backbone.MozuView.extend({
       templateName: "modules/order/b2b-sap-update-form",
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

            if (!payload.sapOrderNumber) return this.displayMessage('Please, enter a valid SAP Order Number'), false;
            if (!payload.orderId) return this.displayMessage('Order Id Missing'), false;
            return true;
        },
        b2bsapupdate: function() {
            var me = this;
            var params = getParams();
            if(params && params.id) {
              var payload = {
                sapOrderNumber: this.$parent.find('[data-mz-sap-order-number]').val(),
                orderId: params.id
              };
                me.displayMessage("");
              if ( me.validate(payload) ) {
                me.setLoading(true);
                // the new handle message needs to take the redirect.
                B2bOrdersApi.OrderDetail.processOrder(payload).then(function (response) {
                   console.log(response);
                   me.displayMessage("Order Updated Succesfully");
                   me.$parent.find('[data-mz-sap-order-number]').attr('disabled', 'disabled');
                   me.$parent.find('[data-mz-action="update-order-submit"]').attr('disabled', 'disabled');
                   me.setLoading(false);
                }, function(error) {
                  var errorMsg = error && error.responseJSON && error.responseJSON.result ? error.responseJSON.result : '';
                   me.displayMessage(errorMsg);
                    me.setLoading(false);
                  });
                // the new handle message needs to take the redirect.
              } else {
                 me.displayMessage('validation failed');
                console.log('validation failed');
              }
            } else {
              console.log('no params');
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
        B2bOrdersApi.OrderDetail.getOrderDetail( { orderId: params.id }).then( function( data ){
         if( data  ){

             var b2cFormModel = new B2cFormModel(data);
             var b2cFormView = new B2cFormView({
                el: $( '#b2c-to-b2b-info' ),
                model: b2cFormModel,
                messagesEl: $('[data-mz-message-bar]')
             });
             window.b2cFormView = b2cFormView;

             b2cFormView.render();
             //b2cOrderView.render();
             $(".mz-order-info").show();
             blockUiLoader.unblockUi();
             $('[data-mz-action="update-order-submit"]').each(function () {
                 var loginPage = new B2cOrderForm();
                 loginPage.formSelector = 'form[name="mz-b2b-sap-update"]';
                 loginPage.pageType = 'b2bsapupdate';
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
