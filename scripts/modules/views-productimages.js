define(['modules/jquery-mozu', 'underscore', "modules/backbone-mozu", 'hyprlive', "hyprlivecontext", "elevatezoom"], function($, _, Backbone, Hypr, HyprLiveContext, elevatezoom) {

    var width_thumb = HyprLiveContext.locals.themeSettings.maxProductImageThumbnailSize;
    var width_pdp = HyprLiveContext.locals.themeSettings.productImagePdpMaxWidth;
    var width_zoom = HyprLiveContext.locals.themeSettings.productZoomImageMaxWidth;
    var deviceType = navigator.userAgent.match(/Android|BlackBerry|iPhone|iPod|Opera Mini|IEMobile/i);
    var pageContext = require.mozuData('pagecontext');
    var mobileZoomEnabled = HyprLiveContext.locals.themeSettings.pdpMobileZoomEnabled || false;
    var current_zoom_id_added;

    //using GET request CheckImage function checks whether an image exist or not
    var checkImage = function(imagepath, callback) {
        $.get(imagepath).done(function() {
            callback(true); //return true if image exist
        }).error(function() {
            callback(false);
        });
    };

    var ProductPageImagesView = Backbone.MozuView.extend({
        templateName: 'modules/product/product-images',
        events: {
            'mouseenter [data-mz-productimage-thumb]': 'onMouseEnterChangeThumbImage',
            'mouseleave [data-mz-productimage-thumb]': 'onMouseLeaveResetThumbImage',
            'click [data-mz-productimage-thumb]': 'switchImage'
        },
        initialize: function() {
            var self = this;
            self.model.on("change:productImages", function(model, images){
                self.clearImageCache();
                self.initImages(self.model.get('productImages'));
                self.render();
                if(images.length) {
                    self.selectedImageIx = images[0].sequence;
                    self.updateMainImage();
                }
            });
            // preload images
            self.initImages();
        },
        initImages: function(images){
            var self = this;
            // preload images
            var imageCache = this.imageCache = {},
                cacheKey = Hypr.engine.options.locals.siteContext.generalSettings.cdnCacheBustKey;

            images = images || [];

            if(!images.length) {
                images = this.model.get('content').get('productImages');
            }

            _.each(images, function (img, index) {
                var i = new Image();
                //i.src = img.imageUrl + '?max=' + Hypr.getThemeSetting('productImagesContainerWidth') + '&_mzCb=' + cacheKey;
                i.src = img.imageUrl + '?maxWidth=' + Hypr.getThemeSetting('productImagePdpMaxWidth') + '&_mzCb=' + cacheKey;
                i.zoomsrc = img.imageUrl + '?maxWidth=' + Hypr.getThemeSetting('productZoomImageMaxWidth') + '&_mzCb=' + cacheKey;
                if (img.altText) {
                    i.alt = img.altText;
                    i.title = img.altText;
                }
                if( index === 0 ){
                    self.selectedImageIx = 1;
                    self.selectedMainImageSrc = img.imageUrl + '?maxWidth=' + Hypr.getThemeSetting('productZoomImageMaxWidth') + '&_mzCb=' + cacheKey;
                    self.selectedMainImageAltText = img.altTextl;
                    self.updateMainImage();
                }
                imageCache[img.sequence.toString()] = i;
            });
        },
        onMouseEnterChangeThumbImage: function(_e){
            var img_url = $(_e.currentTarget).find('img').attr('src');
            img_url = img_url.replace('maxWidth='+width_thumb, 'maxWidth='+width_pdp);
            this.mainImage = $('.mz-productimages-mainimage').attr('src');
            checkImage(img_url, function(response) {
                if (response) {
                    $('.mz-productimages-mainimage').attr('src', img_url);
                }
            });
        },
        onMouseLeaveResetThumbImage: function(_e){
            var img_url = $('.mz-productimages-mainimage').data('zoom-image').replace('maxWidth='+width_zoom, 'maxWidth='+width_pdp);
            checkImage(img_url, function(response) {
                if (response) {
                    $('.mz-productimages-mainimage').attr('src', img_url);
                }
            });
        },
        switchImage: function(e) {
            $(e.currentTarget).parents("ul").find("li").removeClass("active");
            $(e.currentTarget).addClass("active");
            var $thumb = $(e.currentTarget).find('img');
            this.selectedImageIx = $(e.currentTarget).data('mz-productimage-thumb');
            this.selectedMainImageSrc = $thumb.attr('src');
            this.selectedMainImageAltText = $thumb.attr('alt');
            this.updateMainImage();
            return false;
        },
        clearImageCache: function(){
            this.imageCache = {};
        },
        updateMainImage: function() {
            var self = this;
            if (!$('#zoom').length) {
                $('.mz-productimages-main').html('<img class="mz-productimages-mainimage" data-mz-productimage-main="" id="zoom" itemprop="image">');
            }

            checkImage(this.selectedMainImageSrc.replace('maxWidth='+width_thumb, 'maxWidth=' + Hypr.getThemeSetting('productImagePdpMaxWidth')), function(response) {
                if (response) {
                    self.$('#zoom')
                        .prop('src', self.selectedMainImageSrc.replace('maxWidth='+width_thumb, 'maxWidth=' + Hypr.getThemeSetting('productImagePdpMaxWidth')))
                        .prop('alt', self.selectedMainImageAltText);

                    $('.zoomContainer').remove();
                    $('#zoom').removeData('elevateZoom').data('zoom-image', self.selectedMainImageSrc.replace('maxWidth='+width_thumb, 'maxWidth=' + Hypr.getThemeSetting('productZoomImageMaxWidth'))).elevateZoom({ zoomType: "inner", cursor: "crosshair", responsive: true });

                }else if(response === false){
                    // ignore image change
                    //$(".mz-productlist-list li[data-mz-product='" + productCode + "'] .mz-productlisting-image a").html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                }
            });
        },
        render: function() {
            Backbone.MozuView.prototype.render.apply(this, arguments);


           // initSlider();
            initslider_mobile();

            //Custom Functions related to slider
            function createPager(carousal) {
                var totalSlides = carousal.getSlideCount();
                var newPager = $(".mz-productimages-pager");
                for (var i = 0; i < totalSlides; i++) {
                    if (i === 0) {
                        newPager.append("<div data-mz-productimage-thumb=" + (i + 1) + " class=\"activepager\"></div>");
                    } else {
                        newPager.append("<div data-mz-productimage-thumb=" + (i + 1) + " class=\"\"></div>");
                    }
                }
                newPager.find('div').click(function() {
                    var indx = $(".mz-productimages-pager div").index($(this));
                    slider_mobile.goToSlide(indx);
                    $(".mz-productimages-pager div").removeClass("activepager").eq(indx).addClass("activepager");
                });
            }
            if ($('#productmobile-Carousel').length) {
                createPager(slider_mobile);
            }

            $.removeData($('img'), 'elevateZoom');
            $('.zoomContainer').remove();
          //  $(".mz-productimages-pager div").removeClass("activepager").eq(0).addClass("activepager");
            //this trigger updateSwatchImage if needed
            /*this.model.trigger( 'updateSwatchImage' );



            var mobileZoomEnabled = HyprLiveContext.locals.themeSettings.pdpMobileZoomEnabled || false;
            var enableZoom = ( deviceType || pageContext.isMobile ) ? mobileZoomEnabled : true;
            var zoomSelector = '#zoom';

            $.removeData($('img'), 'elevateZoom');
            $('.zoomContainer').remove();
            $(".mz-productimages-pager div").removeClass("activepager").eq(0).addClass("activepager");

            if( enableZoom ){
                if ( pageContext.isMobile ) {
                    zoomSelector = '#zoom_1';
                }

                $.removeData($('img'), 'elevateZoom');
                $('.zoomContainer').remove();
                $  ( zoomSelector ).bind( 'touchstart', function(){
                    $( zoomSelector  ).unbind( 'touchmove' );
                });

                setTimeout( function() {
                    $( zoomSelector ).elevateZoom(
                        {
                            zoomType: "inner",
                            cursor: "crosshair",
                            responsive: true
                        }
                    );
                }, 10);
            }*/
            this.updateMainImage();
        }
    });

    var slider;
    var slider_mobile;


    function initSlider() {
        slider = $('#productpager-Carousel').bxSlider({
            slideWidth: 100,
            minSlides: 4,
            maxSlides: 4,
            moveSlides: 1,
            slideMargin: 22,
            nextText: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
            prevText: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            infiniteLoop: false,
            hideControlOnEnd: false,
            pager: false
        });
        window.slider = slider;
    }

    function initslider_mobile() {
      if ($('#productmobile-Carousel.slick-initialized').length > 0) {
          $('#productmobile-Carousel').slick('unslick');
      }

      slider_mobile = $('#productmobile-Carousel').slick({
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          infinite: false,
          dots: true
      });
    }


    return {
        ProductPageImagesView: ProductPageImagesView
    };

});
