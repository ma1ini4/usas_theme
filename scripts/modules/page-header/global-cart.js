define([
    'modules/backbone-mozu',
    'modules/jquery-mozu',
    "modules/api",
    "hyprlive"
], function(Backbone, $, Api, Hypr) {
    var GlobalCartView = Backbone.MozuView.extend({
        templateName: "modules/page-header/global-cart1",
        initialize: function() {
            var me = this;
        },
        render: function() {
            var me = this;
            Backbone.MozuView.prototype.render.apply(this);
        },
        update: function(showGlobalCart) {
            var me = this;
            Api.get("cart").then(function(resp) {
                me.model.attributes = resp.data;
                me.render();
                if (showGlobalCart) {
                    me.$el.show();
                    setTimeout(function() {
                        me.$el.attr('style','');
                    }, 5000);
                }
            });
        }
    });

    var Model = Backbone.MozuModel.extend();
    var globalCartView = new GlobalCartView({
        el: $('#global-cart'),
        model: new Model({})
    });
    globalCartView.render();
    var GlobalCart = {
        update: function(showGlobalCart) {
            globalCartView.update(showGlobalCart);
        }
    };
    return GlobalCart;

});
