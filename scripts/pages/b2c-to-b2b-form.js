define(['modules/api',
        'modules/backbone-mozu',
        'underscore',
        'modules/jquery-mozu',
        'hyprlivecontext',
        'hyprlive',
        'modules/message-handler',
        'modules/order/b2cOrders',
        'modules/models-orders',
        "modules/block-ui"
], function (api, Backbone, _, $, HyprLiveContext, Hypr, MessageHandler, B2cOrdersApi, OrdersModels, blockUiLoader) {

    var B2cOrderView = Backbone.MozuView.extend({
       templateName: "modules/order/b2c-to-b2b-order-detail",
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
                B2cOrdersApi.OrderDetail.updateCustomer(payload).then(function (response) {
                  console.log('response ',response);
                  if ( response.code === 'success') {
                      $('.mz-order-status-form').hide();
                      me.displayMessage("Account has been converted succesfully - "+ response.result);
                  } else {
                    me.displayMessage(response.result);
                  }
                  me.setLoading(false);
                    //window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') +  "/my-anonymous-account?returnUrl="+(HyprLiveContext.locals.siteContext.siteSubdirectory||'')+"/myaccount";
                }, function(error){
                   console.log('error ',error);
                   me.displayMessage(error.responseJSON.message);
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

             window.b2cOrderView = b2cOrderView;

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
