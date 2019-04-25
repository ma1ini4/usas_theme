define([
    'modules/jquery-mozu'
], function($) {
  var width;

  $(document).ready(function(){
    width = $(window).width();

    hideBlocksOnMobile();
  });
  $(window).resize(function(){
    width = $(window).width();

    hideBlocksOnMobile();
  });


  function hideBlocksOnMobile(){
    var blocks = $('.featured-container .col-sm-6'),
        blocksToShowOnMobile = 4,
        hiddenBlocks = [];

    if (width <= 767) {
      for (var i = blocksToShowOnMobile; i < blocks.length; i++) {
        var block = blocks[i];

        $(block).hide();
        hiddenBlocks.push(block);
        // console.log(hiddenBlocks);
      }
    } else {
      $(blocks).show();
    }

    loadMoreBtn(hiddenBlocks);
  }

  function loadMoreBtn(els){
    var shown = false;
    $('.load-more-btn-group').on('click', function(e){
      if (!shown) {
        shown = true;
        $(els).show();
        toggleBtnContent();
      } else {
        shown = false;
        $(els).hide();
        toggleBtnContent();

        $('html, body').animate({
          scrollTop: $("#featured-products").offset().top
        }, 'slow');
      }
    });
  }
  function toggleBtnContent() {
    $('.load-more-btn-group .showBtn').toggleClass('hidden');
    $('.load-more-btn-group .hideBtn').toggleClass('hidden');
    $('.load-more-btn-group span').toggleClass('up');
  }
});
