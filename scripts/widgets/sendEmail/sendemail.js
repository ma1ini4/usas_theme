require(["modules/jquery-mozu", "modules/backbone-mozu", "hyprlive", "hyprlivecontext"],
function ($, backbone, Hypr, hyprlivecontext) {
    var isExu = hyprlivecontext.locals.themeSettings.themeSelector === 'exuviance' ? true : false;

    $(document).ready(function () {
        // config if loaded from preload script on .hypr
        var mozuFullConfig = require.mozuData("config");
        var config = require.mozuData("config").config;
        var formId = config.customId || mozuFullConfig.definitionId;

        // body params
        var sourceEmail = config.email_from ? config.email_from : "system@deplabs.com",
            ccEmailAddresses = config.email_cc ? config.email_cc.split(',') : [],
            subjectdata = config.subject ? config.subject : "Empty subject",
            emailTemplate = config.form_email_template ? config.form_email_template : "Empty text",
            successMessage = config.form_success_message ? config.form_success_message : "Mail sent successfully",
            errorMessage = config.form_error_message ? config.form_error_message : "Error sending email",
            msgPopup = (config.msg_popup && config.msg_popup !== 'False') ? true : false,
            msgSelector = config.msg_selector ? config.msg_selector : '',
            replyTo = config.reply_to ? config.reply_to : '';

        // this will look for a `data-custom-attribute` as name and get #id
        // element values and substitute to the form

        updateValues();

        function updateValues(formId) {
            // this will look for a `data-custom-attribute` as name and get #id
            // element values and substitute to the form

            $('#' + formId + ' input[data-custom-attribute]').each(function (idx, el) {
                var checkedElement = $('#' + el.name);
                var foundValue = $('#' + el.name).val();
                if (foundValue && foundValue !== '') {
                    el.value = foundValue;
                } else {
                    // we go deeeeeper
                    // this particular case - find second-level radio buttons
                    checkedElement.find('input[type=radio]').each(function () {
                        if ($(this).prop('checked')) {
                            el.value = $(this).val();
                        }
                    });
                    // TODO: think of more universal usage
                }
                // change name values on keyup/change
                $('#' + el.name).bind('keyup change', function () {
                    el.value = $('#' + el.name).val();
                });
            });
        }

        $('.close').on('click', function () {
            $('.popup-overlay').fadeOut(200);
        });
        $('body').on('click', function () {
            $('.popup-overlay').fadeOut(200);
        });

        function sendEmail(formId) {
            if (formId) {
                if ($('#' + formId).attr('data-sourceEmail') !== '') sourceEmail = $('#' + formId).attr('data-sourceEmail');
                ccEmailAddresses = $('#' + formId).attr('data-ccEmailAddresses').split(',');
                if ($('#' + formId).attr('data-ccEmailAddresses') === "") {
                    ccEmailAddresses = [];
                }
                replyTo = $('#' + formId).attr('data-replyTo').split(',');
                if ($('#' + formId).attr('data-replyTo') === "") {
                    replyTo = [];
                }
                if ($('#' + formId).attr('data-subjectdata') !== '') subjectdata = $('#' + formId).attr('data-subjectdata');
                if ($('#' + formId).attr('data-emailTemplate') !== '') emailTemplate = $('#' + formId).attr('data-emailTemplate');
                if ($('#' + formId).attr('data-successMessage') !== '') successMessage = $('#' + formId).attr('data-successMessage');
                if ($('#' + formId).attr('data-errorMessage') !== '') errorMessage = $('#' + formId).attr('data-errorMessage');
                if ($('#' + formId).attr('data-msgPopup') !== 'False') msgPopup = true;
                if ($('#' + formId).attr('data-msgSelector') !== '') msgSelector = $('#' + formId).attr('data-msgSelector');
            }
            updateValues(formId);
            var replacedTemplate = emailTemplate;
            var replaceSubject = subjectdata;
            if (!formId || formId === null) formId = mozuFullConfig.definitionId;
            var formSerialize = $('#' + formId).serialize(),
                toEmailAddresses = new Array($('#' + formId + ' input[name="form-email"]').val()),
                formArray = $('#' + formId).serializeArray();

            // recoursively replace {%value%} with needed values
            formArray.forEach(function (el, idx) {
                var field = el.name;
                var value = el.value;
                if (value && value !== '') {
                    var regex = new RegExp("{" + field + "}", "gi");
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
                "subjectdata": replaceSubject ? replaceSubject : subjectdata,
                "subjectCharset": "UTF-8",
                "sourceEmail": sourceEmail,
                "replyToAddresses": replyTo
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
                .success(function (response) {
                    var message = response.message;
                    $('#' + formId + ' .response-message').remove();
                    if (response.statusCode == 200) {
                        // console.log(msgSelector, msgPopup);
                        if (msgPopup && msgPopup !== 'False') {
                            if (isExu && window.location.pathname.indexOf('contact-us') !== -1) {
                                var thxHtml = '<div class="thank-you-text"><p>Thank you for your message! We will be contacting you as soon as possible. </p><p>Please note: Changes to your online order cannot be made while it is in progress. It might take a few days for us to reply to your email. </p><p>If you have an urgent request please call customer service at (800) 225-9411 Monday through Friday, 9am-6pm EST.</p></div>';
                                var formContainer = $('#' + formId).parent();
                                $('#' + formId).remove();
                                formContainer.append(thxHtml);
                            } else {
                                $('.email-message').html(message);
                                $('.popup-overlay').fadeIn(200);
                            }
                        } else {
                            $(msgSelector).html(message);
                        }
                    } else {
                        if (msgPopup && msgPopup !== 'False') {
                            $('.email-message').html(errorMessage);
                            $('.popup-overlay').fadeIn(200);
                        } else {
                            $(msgSelector).html(errorMessage);
                        }
                    }
                });
        }
        $('body').on('click', '#demo-sample input[name="submit-email-form"]', function (e) {
            var customId = $(this).closest('form').attr('id');
            e.preventDefault();
            sendEmail('demo-sample');
        });
        $('body').on('click', '#signup-submit', function (e) {
            var customId = $(this).closest('form').attr('id');
            if (validateEmail($('#signup-email').val())) {
                e.preventDefault();
                sendEmail('signup-form');
            } else {
                return;
            }
        });
    });
    function validateEmail(email) {
        if (!(backbone.Validation.patterns.email.test(email))) {
            return false;
        } else {
            return true;
        }
    }
});
