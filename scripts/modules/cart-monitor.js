/**
 * Watches for changes to the quantity of items in the shopping cart, to update
 * cart count indicators on the storefront.
 */
define(['modules/jquery-mozu', 'modules/api'], function ($, api) {

    var $cartCount,
        user = require.mozuData('user'),
        userId = user.userId,
        $document = $(document),
        CartMonitor = {
            setAmount: function(count) {
                this.$amountEl.text("$"+count);
            },           
            setCount: function(count) {
                this.$el.text(count);
            },
            addToCount: function(count) {
                this.setCount(this.getCount() + count);
            },
            getCount: function() {
                return parseInt(this.$el.text(), 10) || 0;
            },
            update: function() {
                api.get('cartsummary').then(function(summary) {
                    $.cookie('mozucart', JSON.stringify(summary.data), { path: '/' });
                    savedCarts[userId] = summary.data;
                    console.log(summary);
                    $document.ready(function() {
                        CartMonitor.setCount(summary.data.itemCount);
                        CartMonitor.setAmount(summary.data.total);
                    });
                });
            }
        },
        savedCarts,
        savedCart;

    try {
        savedCarts = JSON.parse($.cookie('mozucart'));
    } catch(e) {}

    if (!savedCarts) savedCarts = {};
    savedCart = savedCarts || savedCarts[userId];

    //if (isNaN(savedCount)) {
        CartMonitor.update();
    //}

    $document.ready(function () {
        CartMonitor.$el = $('[data-mz-role="cartcount"]').text(savedCart.itemCount || 0);
        CartMonitor.$amountEl = $('[data-mz-role="cartamount"]').text(savedCart.total || 0);
    });

    return CartMonitor;

});