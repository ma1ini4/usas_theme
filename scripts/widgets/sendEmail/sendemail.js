require(["modules/jquery-mozu", "hyprlive"],
	function ($, Hypr) {
        $(document).ready(function () {
            var mozuFullConfig = require.mozuData("config");
            var config = require.mozuData("config").config;
            var formId = config.customId || mozuFullConfig.definitionId;

            // body params
            var sourceEmail = config.email_from ? config.email_from : "system@deplabs.com",
                ccEmailAddresses = config.email_cc ? config.email_cc.split(',') : [],
                subjectdata = config.subject ? config.subject : "Empty subject",
                emailTemplate = config.form_email_template ? config.form_email_template : "Empty text",
                successMessage = config.form_success_message ? config.form_success_message : "Mail sent successfully",
                errorMessage = config.form_error_message ? config.form_error_message : "Error sending email";

            // this will look for a `data-custom-attribute` as name and get #id 
            // element values and substitute to the form
            
            $('#'+formId+' input[data-custom-attribute]').each(function(idx, el) {
                el.value = $('#'+el.name).val();
            });

            $('.close').on('click', function() {
                $('.popup-overlay').fadeOut(200);
            });
            $('body').on('click', function() {
                $('.popup-overlay').fadeOut(200);
            });

            $('input[name="submit-email-form"]').on('click', function(e) {
                e.preventDefault();

                var replacedTemplate = emailTemplate;
                var replaceSubject = subjectdata;
                var formSerialize = $('#'+formId).serialize(),
                    toEmailAddresses = new Array($('#'+formId+' input[name="form-email"]').val()),
                    formArray = $('#'+formId).serializeArray();
                
                // recoursively replace {%value%} with needed values
                formArray.forEach(function(el, idx) {
                    var field = el.name;
                    var value = el.value;
                    if (value && value !== '') {
                        var regex = new RegExp("{"+field+"}", "gi");
                        replacedTemplate = replacedTemplate.replace(regex, value);
                        replaceSubject = replaceSubject.replace(regex, value);
                    }
                });

                // form the data body
                var body = {
                    "bccEmailAddresses": [],
                    "ccEmailAddresses": ccEmailAddresses,
                    "toEmailAddresses": toEmailAddresses,
                    "bodyData": replacedTemplate ? replacedTemplate : emailTemplate,
                    "bodyCharset": "UTF-8",
                    "subjectdata": replaceSubject? replaceSubject : subjectdata,
                    "subjectCharset": "UTF-8",
                    "sourceEmail": sourceEmail,
                    "replyToAddresses": [sourceEmail]
                };

                $.ajax({
                    url: '/email', // TODO: transfer to ARC
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json", // welp, that was the game changer in this request
                        "data": JSON.stringify(body),
                        "successMessage": successMessage,
                        "errorMessage": errorMessage
                    }
                })
                .success(function(response){
                    var message = response.message;
                    if (response.statusCode == 200) {
                        $('.email-message').html(message);
                        $('.popup-overlay').fadeIn(200);
                    } else {
                        $('.email-message').html(message);
                        $('.popup-overlay').fadeIn(200);
                    }
                });
            });
        });
});