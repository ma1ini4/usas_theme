require(["modules/jquery-mozu", "hyprlive"], function ($, Hypr) {

    
    $(document).ready(function(){
        
        $('#product-request-demo').on('click', function (e) {
            e.preventDefault();
            
            var requestType = "demo";
            var demoEmail = Hypr.getThemeSetting('requestDemoEmail');

            sendRequest(requestType, demoEmail);
        });
        
        $('#product-request-sample').on('click', function (e) {
            e.preventDefault();
            
            var requestType = "sample";
            var sampleEmail = Hypr.getThemeSetting('requestSampleEmail');
            
            sendRequest(requestType, sampleEmail);
        });
    });

    function sendRequest(type, email){
        $('input[data-custom-attribute="demo-sample"]').val(type);
        $('input[data-custom-attribute="form-email"]').val(email);


        $('input[name="submit-email-form"]').click();

        // $('#demo-sample-container .secondary-btn').hide();

        // $('#demo-sample-container').html('<p class="tab-content-request-text">You have successfully requested a ' + type + '!</p>');
    }
});