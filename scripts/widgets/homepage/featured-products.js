define([
    'modules/jquery-mozu'
], function($) {
  var width;
  var hiddenBlocks = [];
  var shown = false;

  $(document).ready(function(){
    width = $(window).width();

    var blocks = $('.featured-container .col-sm-6'),
        blocksToShowOnMobile = 4;

    if (width <= 767) {
      for (var i = blocksToShowOnMobile; i < blocks.length; i++) {
        var block = blocks[i];

        $(block).hide();
        hiddenBlocks.push(block);
      }
    } else {
      $(blocks).show();
    }

    $('body').on('click', '.load-more-btn-group', function (e) {

      if (!shown) {
        $(hiddenBlocks).show(300);
        toggleBtnContent();
        shown = true;
      } else {
        $(hiddenBlocks).hide(300);
        toggleBtnContent();
        shown = false;

        $('html, body').animate({
          scrollTop: $("#featured-products").offset().top
        }, 300);
      }
    });
  });

  $(window).resize(function(){
    width = $(window).width();
  });

  function toggleBtnContent() {
    $('.load-more-btn-group .showBtn').toggleClass('hidden');
    $('.load-more-btn-group .hideBtn').toggleClass('hidden');
    $('.load-more-btn-group .usas-icon-chevron-left').toggleClass('up');
  }
});
