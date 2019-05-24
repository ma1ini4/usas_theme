define(["modules/api", 'underscore', "modules/backbone-mozu", "hyprlive"], function(api, _, Backbone, Hypr) {

   var  SapOrderShipment = Backbone.MozuModel.extend({
      idAttribute: 'shipmentCode',
       relations: {
          shipItem:  Backbone.Collection.extend({
                model: Backbone.MozuModel
            })
       }
    }),
    SapOrderStatus = Backbone.MozuModel.extend({
          idAttribute: 'code',
          relations: {
            orderPayment:  Backbone.Collection.extend({
                model: Backbone.MozuModel
            }),
            orderShipment: Backbone.Collection.extend({
                                model: SapOrderShipment
                             })
                           }
      });

      return {
          SapOrderStatus: SapOrderStatus
      };

});
