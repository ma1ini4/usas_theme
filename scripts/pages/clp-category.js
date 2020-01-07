define(['modules/jquery-mozu'], function($) {
    $(document).ready(function() {
        prefixGridRows();
    });
    function prefixGridRows() {
        var width = $(window).width(),
            currentRow = 1,
            currentCol = 0,
            maxCols;
        $('.grid-item').each(function(id) {
            if(width >= 992) {
                maxCols = 3;

                if(currentCol === maxCols) {
                    currentCol = 1;
                    currentRow++;
                } else {
                    currentCol++;
                }

                $(this).attr('style', '-ms-grid-row: ' + currentRow);
            } else if(width < 992 && width >= 480) {
                maxCols = 2;

                if(currentCol === maxCols) {
                    currentCol = 1;
                    currentRow++;
                } else {
                    currentCol++;
                }

                $(this).attr('style', '-ms-grid-row: ' + currentRow);
            } else {
                maxCols = 1;

                if (currentCol === maxCols) {
                    currentCol = 1;
                    currentRow++;
                } else {
                    currentCol++;
                }
                $(this).attr('style', '-ms-grid-row: ' + currentRow);
            }
            if (navigator.appName == 'Microsoft Internet Explorer' || !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/)) || (typeof $.browser !== "undefined" && $.browser.msie == 1)) {
                $(this).css({'padding': 15, 'margin-bottom': 15});
            }
        });
    }
});