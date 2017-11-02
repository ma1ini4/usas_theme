require(["modules/jquery-mozu", "hyprlive", "modules/backbone-mozu", "modules/api"], function($, Hypr, Backbone, api) {
    $(document).ready(function() {
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
                $('#print').empty();
                $('#print').append(Hypr.getTemplate('modules/my-account/print-order').render({ model: resp }));
            });
    });
});
