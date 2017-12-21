require(["modules/jquery-mozu", "hyprlive", "modules/backbone-mozu", "modules/api"], function($, Hypr, Backbone, api) {
    var PrintOrderView = Backbone.MozuView.extend({
        templateName: 'modules/my-account/print-order',
        events: {
          'click [data-mz-print-order]' : 'printOrder'
        },
        printOrder: function(){
          window.print();
        },
        render: function() {
          Backbone.MozuView.prototype.render.apply(this);
        }
    });

    var printViewModel = Backbone.Model.extend();

    $(document).ready(function(){
        var custid = require.mozuData('user');
        var ordid = location.hash.substring(1);
        var categorydetailsurl = '/api/commerce/orders/' + ordid;
        api.request('GET', categorydetailsurl).then(function(resp) {
            var cmpdet = {
                "name": document.getElementById('companyname').value,
                "add": document.getElementById('companyaddr').value,
                "url": document.getElementById('company-url').value
            };

            resp.cmp = cmpdet;
            document.getElementById("print").style.display = "block";
            var printModel = new printViewModel(resp);
            var printOrderView = new PrintOrderView({
                el: $('#print'),
                model: printModel
            });
            printOrderView.render(); 
        });
    });
});
