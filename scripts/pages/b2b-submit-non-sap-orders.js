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
        'modules/models-customer'
], function (api, Backbone, _, $, HyprLiveContext, Hypr, MessageHandler, B2bOrdersApi, OrdersModels, blockUiLoader, CustomerModels ) {

  var OrderCollectionModelView = Backbone.MozuView.extend({
     templateName: "modules/order/b2b-order-list",
     additionalEvents: {
        'click a.mz-order-code' : 'getOrderDetail',
        'click a.sap-submit-order' : 'submitOrders'
      },
      getOrderDetail: function(event) {
        var orderCode = $(event.currentTarget).data('mzOrderCode').trim();
        if (!require.mozuData('pagecontext').isEditMode) {
            window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + '/templates/b2b-sap-update-form?id='+orderCode;
        }
      },
      submitOrders: function(event){
        event.preventDefault();
        blockUiLoader.globalLoader();
          B2bOrdersApi.OrderDetail.getOrderSubmitRetry().then( function( data ){
            blockUiLoader.unblockUi();
            console.log('Orders updated',data);
            window.location.reload();

          }, function(error){
            console.log('There was an error processing your orders');
            blockUiLoader.unblockUi();
          });

      },
     render: function() {
         Backbone.MozuView.prototype.render.apply(this);
         return this;
     }
  });

  $(document).ready(function(event){
   try{

    blockUiLoader.globalLoader();
    B2bOrdersApi.OrderDetail.getOrders().then( function( data ){
       if( data  ){
           var OrderCollectionModel = new OrdersModels.OrderCollection(data);
           var orderCollectionView = new OrderCollectionModelView({
              el: $( '#b2b-orders' ),
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
