define(['jquery', 'hyprlive', 'modules/api','underscore'],
  function($, Hypr, api, _ ){
      var B2BOrderDetailApi = {
        getOrderDetail: function( params ) {
          return this.performAction( '/custom/orderDetail', params);
          },
            getOrders: function(){
              return this.performAction( '/sapCommerce/pendingB2bOrders');
            },
            getOrderSubmitRetry: function(){
              return this.performAction( '/sapCommerce/orderSubmitRetry');
            },
            processOrder:function(params){
              return this.performAction( '/sapCommerce/processB2bOrder', params);
            },
            performAction: function (serviceurl,  params){
              var apiData = require.mozuData('apicontext');
              return $.ajax({
                  url: serviceurl,
                  headers: apiData.headers,
                  method: 'POST',
                  data: params
                });
              }
        };
      return {
          OrderDetail: B2BOrderDetailApi
        };
    });
