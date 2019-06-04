require(["modules/jquery-mozu", "hyprlive"], function ($, Hypr) {

    $(document).ready(function(){
        
        $('#product-request-demo').on('click', function (e) {
            e.preventDefault();

            var requestType = "demo";

            sendRequest(requestType);
        });
        
        $('#product-request-sample').on('click', function (e) {
            e.preventDefault();

            var requestType = "sample";

            sendRequest(requestType);
        });
    });

    function sendRequest(type){
        $('input[data-custom-attribute="demo-sample"]').val("sample");

        $('input[name="submit-email-form"]').click();

        $('#demo-sample-container .secondary-btn').hide();

        $('#demo-sample-container').html('<p class="tab-content-request-text">You have successfully requested a ' + type + '!</p>');

        console.log('sent successfully');        
    }
});