define([
    'modules/jquery-mozu',
    "doubletaptogo"
], function($, doubletaptogo) {
    //Sub Dropdown Menu
    function calculatingSubPosition() {
        var leftReference = $(".ml-header-content").offset().left,
            rightReference = leftReference + $(".ml-header-content").outerWidth(),
            colWidth = $(document).width() > 991 ? 235 : 175,
            navHeight = $('.mz-sitenav-list').height();
        $(".mz-sitenav-sub-container").css({ "top": navHeight, "right": "auto" }).addClass("calculating-position").removeClass("calculated-position").each(function() {
            var currentElemnt = $(this),
                leftPosition = -10,
                rightPosition = 0,
                currentDropWidth = 0;
            if ( currentElemnt.find(".sub-level-col").length>=4 && $(document).width() <= 1025) {
                currentElemnt.find(".sub-level-image").hide();
            }
            else {
                currentElemnt.find(".sub-level-image").show();
            }
            currentDropWidth = (colWidth * currentElemnt.find(".sub-level-col").length) + 35 + currentElemnt.find(".sub-level-image").outerWidth()||0;
            if (currentDropWidth < $(".container:eq(0)").outerWidth()) {
                leftPosition = currentElemnt.parents(".mz-sitenav-item-inner").offset().left - 20 - leftReference;
                rightPosition = "auto";
                if (leftPosition + currentDropWidth + leftReference >= rightReference) {
                    leftPosition = "auto";
                    rightPosition = 0;
                }
            }
            currentElemnt.css({ "left": leftPosition, "right": rightPosition });
        }).removeClass("calculating-position").addClass("calculated-position");
    }
    function outlineMobileNavOnCollapse() {
      var burgerMenuLink = $('.mz-utilitynav .mz-utilitynav-link'),
          navContainer = $('.mz-utilitynav'),
          searchContainer = $('.ml-header-search-wrapper'),
          burgerIcon = burgerMenuLink[0].children[0],
          closeIcon = burgerMenuLink[0].children[1],
          cartIcon = $('.usas-icon-cart');
      if (!burgerMenuLink.hasClass('collapsed')) {
        navContainer.toggleClass('expanded');
        searchContainer.toggleClass('expanded');
        $(burgerIcon).hide();
        $(closeIcon).show();
      } else if (burgerMenuLink.hasClass('collapsed')){
        setTimeout(function () {
          navContainer.toggleClass('expanded');
          searchContainer.toggleClass('expanded');
          $(burgerIcon).show();
          $(closeIcon).hide();
        }, 150);
      }
    }
    function removeMobileNavStyles() {
      var burgerMenuLink = $('.mz-utilitynav .mz-utilitynav-link'),
          navContainer = $('.mz-utilitynav'),
          searchContainer = $('.ml-header-search-wrapper'),
          burgerIcon = burgerMenuLink[0].children[0],
          closeIcon = burgerMenuLink[0].children[1];
      if ($(window).width() >= 767) {
        burgerMenuLink.addClass('collapsed').attr('aria-expanded', 'false');
        $('#ml-nav').removeClass('collapse in').addClass('collapse').attr('aria-expanded', 'false');
        navContainer.removeClass('expanded');
        searchContainer.removeClass('expanded');
        $(burgerIcon).show();
        $(closeIcon).hide();
      }
    }
    var username = $('#my-account').text();
    function truncEmail(){
      if (username.indexOf('@') !== -1) {
        var truncToAt = username.split("@")[0].trim();
        $('#my-account').text(truncToAt);
        $('#my-account-mobile').text(truncToAt);
      }
    }
    function truncLongUsername(el, blockWidth){
      var maxBlockWidth = blockWidth - 1;

      setTimeout(function() {
        if (el.width() >= maxBlockWidth) {
          el.width(blockWidth).addClass('truncated-username');
        } else if (el.width() < maxBlockWidth){
          el.width('auto').removeClass('truncated-username');
        }
      }, 500);
    }
    function truncateUsername(){
      var myAccount = $('#my-account'),
          myAccountMobile = $('#my-account-mobile');
      if (($(window).width() < 1199) && ($(window).width() > 1024)) {
        truncEmail();
        truncLongUsername(myAccount, 100);

      } else if (($(window).width() < 1024) && ($(window).width() > 767)) {
        truncEmail();
        truncLongUsername(myAccount, 47);

      } else if ($(window).width() < 767) {
        var mobileMaxWidth = ($(window).width() - $('.ml-header-logo-wrapper').width() - 100);
        truncEmail();
        console.log(mobileMaxWidth, $(myAccountMobile).width());
        truncLongUsername(myAccountMobile, mobileMaxWidth);

      } else if ($(window).width() > 1199) {
        $(myAccount).text(username);
        $(myAccount).width('auto').removeClass('truncated-username');
      }
    }
    $(document).ready(function() {
        try {
            $('.sub-nav-section li:has(.sub-dropdown-menu)').doubletaptogo();
        } catch (e0) {
            //console.log('Error in loading: ' + e0);
        }
        $('.mz-utilitynav .mz-utilitynav-link').click(function() {
          // outlineMobileNavOnCollapse();
          setTimeout(function () {
            outlineMobileNavOnCollapse();
          }, 50);
        });
        truncateUsername();
    });
    $(window).resize(function() {
        calculatingSubPosition();
        removeMobileNavStyles();
        truncateUsername();
    });
    $('.sub-level-col.col-sm-3').each(function(index, el) {
        var html = $(el).html().trim();
        if (html === "")
            $(el).remove();
    });
    $('.sub-level-image.col-sm-3').each(function(index, el){
         var html = $(el).find('img').attr('src');
         if (html === "" || html === '#')
            $(el).remove();
    });
    calculatingSubPosition();
    //Footer Back to Top
    if ($(".back-to-top").length) {
        $(".back-to-top").click(function() {
            $("html, body").animate({ scrollTop: 0 }, 500);
        });
    }
});
