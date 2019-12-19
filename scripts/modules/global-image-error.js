define([
    'modules/jquery-mozu'
], function($) {

    var handleErrorImage = function( element, imageUrl ){
        if( element.src.indexOf('handled=y') < 0 ) {
            if( imageUrl.indexOf('?') < 0 ) {
                $(element).attr( 'src', imageUrl + '?handled=y');
            }
            else {
                $(element).attr( 'src', imageUrl + '&handled=y');
            }
        }

    };

    $(document).ready(function () {
        window.handleErrorImage = handleErrorImage;
    });

    return handleErrorImage;
});

// Avoid image onerror loop
// i.e. onerror="handleErrorImage( this, 'https://cdn-sb.mozu.com/25200-38292/cms/files/8b96bbed-ba97-4410-86e5-2bb522c463ba' );"
