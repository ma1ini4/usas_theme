require([
    'modules/jquery-mozu',
    'underscore',
    'modules/backbone-mozu',
    'hyprlive',
    'modules/api',
    'hyprlivecontext'
], function($, _, Backbone, HyprLiveContext, Hypr, api){
    var pageContext = require.mozuData('pagecontext');

    $(document).ready(function() {
      console.log(pageContext);
      console.log(123);
    });
});
