define(['jquery', 'hyprlive', 'modules/api','underscore'],
  function($, Hypr, api, _ ){
      var OrderDetailApi = {
            getOrderDetail: function( params ) {
              return this.performAction( '/custom/orderDetail', params);
              },
            processCustomer: function( params ) {
              return this.performAction( '/custom/processCustomer', params);
            },
            processOrders: function( params ) {
              return this.performAction( '/custom/processOrders', params);
            },
            /*orderRetry: function( params ) {
              return this.performAction( '/custom/orderRetry', params);
            },*/
            getOrders: function(){
                //get startIndex from url
                var indexRegex = /startIndex=([^&]+)/.exec(window.location.href);
                var startIndex = indexRegex ? indexRegex[1] : 0;
                return this.performAction( '/custom/b2cOrders', {startIndex: startIndex});
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
          OrderDetail: OrderDetailApi
        };
    });
