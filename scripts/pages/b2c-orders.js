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
], function (api, Backbone, _, $, HyprLiveContext, Hypr, MessageHandler, B2cOrdersApi, OrdersModels, blockUiLoader, CustomerModels ) {

  var OrderCollectionModelView = Backbone.MozuView.extend({
     templateName: "modules/order/b2c-order-list",
     additionalEvents: {
        'click a.mz-order-code' : 'getOrderDetail'
      },
      getOrderDetail: function(event) {
        var orderCode = $(event.currentTarget).data('mzOrderCode').trim();
        if (!require.mozuData('pagecontext').isEditMode) {
            window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + '/templates/b2c-to-b2b-form?id='+orderCode;
        }
      },
     render: function() {
         Backbone.MozuView.prototype.render.apply(this);
         return this;
     }
  });

  $(document).ready(function(event){
   try{
    
    blockUiLoader.globalLoader();
    B2cOrdersApi.OrderDetail.getOrders().then( function( data ){
       if( data  ){
           var OrderCollectionModel = new OrdersModels.OrderCollection(data);
           var orderCollectionView = new OrderCollectionModelView({
              el: $( '#b2c-orders' ),
              model: OrderCollectionModel,
              messagesEl: $('[data-mz-message-bar]')
           });

           window.orderCollectionView = orderCollectionView;

           orderCollectionView.render();

           blockUiLoader.unblockUi();
        } else {

          blockUiLoader.unblockUi();
        }

    },function(error){
      console.log('error ', error);

       $('[data-mz-message-bar]').html(error.responseJSON.message);
       blockUiLoader.unblockUi();
    });

  } catch(error){
    console.log('error ', error);
     $('[data-mz-message-bar]').html(error);
    blockUiLoader.unblockUi();
  }
  });

});
