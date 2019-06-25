require([
    "modules/jquery-mozu",
    "underscore",
    'modules/block-ui',
    "hyprlive",
    "modules/backbone-mozu",
    "hyprlivecontext",
    "modules/api",
    "async",
    'modules/order/sap-order-status',
    'modules/models-order-status'
], function($, _, blockUiLoader, Hypr, Backbone, HyprLiveContext, api, async, OrderStatusApi, OrderStatusModels) {

  var OrderStatusView = Backbone.MozuView.extend({
     templateName: "modules/order/order-status-detail",
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

  $(document).ready(function(event){
        var params = getParams();
        if (params && params.orderNumber) {
          blockUiLoader.globalLoader();
          OrderStatusApi.OrderStatusDetail.getOrderStatusDetail({
            orderNumber: params.orderNumber
          }).then(function (data) {
            console.log(params.orderNumber);
            if (data) {
              var orderStatusModel = new OrderStatusModels.SapOrderStatus(data);
              console.log('CcOrderStatus ', orderStatusModel);
              var ccOrderStatusView = new OrderStatusView({
                el: $('#order-status-detail'),
                model: orderStatusModel,
                messagesEl: $('[data-mz-message-bar]')
              });

              //self.render();

              window.orderStatusView = ccOrderStatusView;

              ccOrderStatusView.render();
              blockUiLoader.unblockUi();
            }
          }, function (error) {

            console.log('error ', error);
            $('[data-mz-message-bar]').html(error.responseJSON.message);
            blockUiLoader.unblockUi();
          });
        }
  });
});
