define(['jquery', 'hyprlive', 'modules/api','underscore'],
    function($, Hypr, api, _ ){

        var OrderStatusDetailApi = {
            getOrderStatusDetail: function( params ) {
              var urlParts = window.location.href.split("/");
              var ccOrdesStatusURL = urlParts[0] + "//" + urlParts[2] + '/sapCommerce/orderStatus';
              _.extend(params, {anonymous:false});
              return $.post( ccOrdesStatusURL, params );
            },
            getAnonymousOrderStatusDetail: function( params ) {
              var urlParts = window.location.href.split("/");
              var ccOrdesStatusURL = urlParts[0] + "//" + urlParts[2] + '/sapCommerce/orderStatus';
              _.extend(params, {anonymous:true});
              return $.post( ccOrdesStatusURL, params );
           }
        };

        return {
          OrderStatusDetail: OrderStatusDetailApi
        };
    });
