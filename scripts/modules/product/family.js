define([
    'modules/jquery-mozu',
    'underscore',
    "modules/api",
    "modules/backbone-mozu",
    'hyprlivecontext',
    "bxslider",
    'modules/block-ui',
    "hyprlive",
    'modules/models-product'
], function($, _, api, Backbone, HyprLiveContext, bxslider, blockUiLoader, Hypr, ProductModels) {
    var sitecontext = HyprLiveContext.locals.siteContext;
    var cdn = sitecontext.cdnPrefix;
    var siteID = cdn.substring(cdn.lastIndexOf('-') + 1);
    var imagefilepath = cdn + '/cms/' + siteID + '/files';
    var width_fam = HyprLiveContext.locals.themeSettings.familyProductImageMaxWidth;    
    var deviceType = navigator.userAgent.match(/Android|BlackBerry|iPhone|iPod|Opera Mini|IEMobile/i);
   
    //using GET request CheckImage function checks whether an image exist or not
    var checkImage = function(imagepath, callback) {
        $.get(imagepath).done(function() {
            callback(true); //return true if image exist
        }).error(function() {
            callback(false);
        });
    };

    var FamilyItemView = Backbone.MozuView.extend({
        tagName: 'div',
        className: 'mz-familylist-item col-xs-12',
        templateName: 'modules/product/family/family-item',
        additionalEvents: {
            "click [data-mz-product-option-attribute]": "onOptionChangeAttribute",
            "click [data-mz-qty-minus]": "quantityMinus",
            "click [data-mz-qty-plus]": "quantityPlus",
            'mouseenter .color-options': 'onMouseEnterChangeImage',
            'mouseleave .color-options': 'onMouseLeaveResetImage'
        },
        initialize: function() {
            var self = this;
            self.listenTo(self.model, 'change', self.render);
        },
        render: function() {
            Backbone.MozuView.prototype.render.apply(this);
            return this;
        },
        quantityMinus: function(_e) {
            var currentEl = $(_e.currentTarget);
            currentEl.parents('.mz-productdetail-conversion-controls').find('[data-mz-validationmessage-for="quantity"]').text('');            
            var value = parseInt(currentEl.parents('.qty-block').find('.mz-productdetail-qty').val(), 10);
            if (value == 1) {
                 currentEl.parents('.mz-productdetail-conversion-controls').find('[data-mz-validationmessage-for="quantity"]').text("Quantity can't be zero.");
                return;
            }
            value--;
            currentEl.parents('.qty-block').find('.mz-productdetail-qty').val(value);
            if (typeof this.model.get('inventoryInfo').onlineStockAvailable !== "undefined") {
                if (this.model.get('inventoryInfo').onlineStockAvailable >= value)
                    currentEl.parents('.mz-productdetail-conversion-controls').find('[data-mz-validationmessage-for="quantity"]').text("Can't added to cart");
                if (this.model.get('inventoryInfo').onlineStockAvailable < value)
                    currentEl.parents('.mz-productdetail-conversion-controls').find('[data-mz-validationmessage-for="quantity"]').text("*Only " + this.model.get('inventoryInfo').onlineStockAvailable + " left in stock.");
            }
        },
        quantityPlus: function(_e) {
            var currentEl = $(_e.currentTarget);
            currentEl.parents('.mz-productdetail-conversion-controls').find('[data-mz-validationmessage-for="quantity"]').text('');
            var value = parseInt(currentEl.parents('.qty-block').find('.mz-productdetail-qty').val(), 10);
            if (value == 99) {
                currentEl.parents('.mz-productdetail-conversion-controls').find('[data-mz-validationmessage-for="quantity"]').text("Quantity can't be greater than 99.");
                return;
            }
            value++;
            currentEl.parents('.qty-block').find('.mz-productdetail-qty').val(value);
            if (typeof this.model.get('inventoryInfo').onlineStockAvailable !== "undefined" && this.model.get('inventoryInfo').onlineStockAvailable < value) {
                //$("#add-to-cart").addClass("button_disabled");
                currentEl.parents('.mz-productdetail-conversion-controls').find('[data-mz-validationmessage-for="quantity"]').text("Can't added to cart");
                currentEl.parents('.mz-productdetail-conversion-controls').find('[data-mz-validationmessage-for="quantity"]').text("*Only " + this.model.get('inventoryInfo').onlineStockAvailable + " left in stock.");
            }
        },
        onOptionChangeAttribute: function(e) {
            return this.configureAttribute($(e.currentTarget));
        },
        configureAttribute: function($optionEl) {
            var $this = this;
            if (!$optionEl.hasClass("active")) {
                if ($optionEl.attr('disabled') == 'disabled') {
                    return false;
                } else {
                    blockUiLoader.globalLoader();
                    var newValue = $optionEl.data('value'),
                        oldValue,
                        id = $optionEl.data('mz-product-option-attribute'),
                        optionEl = $optionEl[0],
                        isPicked = (optionEl.type !== "checkbox" && optionEl.type !== "radio") || optionEl.checked,
                        option = this.model.get('options').get(id);
                    if (!option) {
                        var byIDVal = JSON.parse(JSON.stringify(this.model.get('options')._byId));
                        for (var key in byIDVal) {
                            if (id === byIDVal[key].attributeFQN) {
                                option = this.model.get('options').get(key);
                            }
                        }
                    }
                    if (option) {
                        if (option.get('attributeDetail').inputType === "YesNo") {
                            option.set("value", isPicked);
                        } else if (isPicked) {
                            oldValue = option.get('value');
                            if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                                option.set('value', newValue);
                            }
                        }
                    }
                    this.model.whenReady(function() { 

                        setTimeout(function() {
                            /*var sp_price = "";
                            if (window.productView.model.attributes.inventoryInfo.onlineStockAvailable && typeof window.productView.model.attributes.inventoryInfo.onlineStockAvailable !== "undefined") {
                                if (typeof window.productView.model.attributes.price.get('salePrice') != 'undefined')
                                    sp_price = window.productView.model.attributes.price.get('salePrice');
                                else
                                    sp_price = window.productView.model.attributes.price.get('price');
                                var price = Hypr.engine.render("{{price|currency}}", { locals: { price: sp_price } });
                                $('.stock-info').show().html("In Stock <span class='stock-price'>" + price + "</span>");

                            }
                            if (window.productView.model.attributes.variationProductCode && typeof window.productView.model.attributes.variationProductCode !== "undefined") {
                                $(".mz-productcodes-productcode").text("Sku # " + window.productView.model.attributes.variationProductCode);
                            }
                            $('.mz-productdetail-price.prize-mobile-view').html($('.mz-l-stack-section.mz-productdetail-conversion .mz-productdetail-price').html());*/
                            //$this.model = checkVariationCode($this.model,familyObject);  
                            $this.render();
                            blockUiLoader.unblockUi();
                            /*for(var i=0; i < window.familyProducts.length; i++){
                                if(window.familyProducts[i].get('productCode') === $this.model.get('productCode')){
                                    window.familyProducts[i] = $this.model;
                                }
                            }*/
                            $this.isColorClicked = false; 
                        }, 1000);
                    });
                }
            }
        },
        onMouseEnterChangeImage: function(_e) {
            if (!deviceType) {            	           	
            	this.mainImage = $(_e.delegateTarget).find('img').attr('src');                
                var colorCode = $(_e.currentTarget).data('mz-swatch-color');
                this.changeImages(_e,colorCode, 'N');
            }
        },
        onMouseLeaveResetImage: function(_e) {
            if (!this.isColorClicked && !deviceType) {
                var colorCode = $(_e.delegateTarget).find('ul.product-color-swatches').find('li.active').data('mz-swatch-color');
                if (typeof colorCode != 'undefined') {
                    this.changeImages(_e,colorCode, 'N');
                } else if (typeof this.mainImage != 'undefined') {
                    $(_e.delegateTarget).find('img').attr('src', this.mainImage);
                } else {
                    $('.mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                }
            }
        },
        selectSwatch: function(e) {
            this.isColorClicked = true;
            var colorCode = $(e.currentTarget).data('mz-swatch-color');
            this.changeImages(e,colorCode, 'Y');

        },
        changeImages: function(_e,colorCode, _updateThumbNails) {
            var self = this;
            var version = 1;
       
            var imagepath = imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + version + '.jpg?maxWidth=';
            var mainImage = imagepath + width_fam;
      
            var _this = this;
            //TODO: following function is checking if images exist on server or not
            checkImage(imagepath, function(response) {
                if (response) {
                   
                   
                    	$(_e.delegateTarget).find('img').attr('src', mainImage);
                        //$('.mz-productimages-mainimage').attr('src', mainImage);
                    
                } else if (typeof self.mainImage === 'undefined') {
                    $('.mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                }
               
            });
        }
        
    });

    var Model = Backbone.MozuModel.extend();

    var familyObject = "",
        showError = require.mozuData('pagecontext').isDebugMode || require.mozuData('pagecontext').isAdminMode || require.mozuData('pagecontext').isEditMode;


    function renderFamily() {
        var self = this;
        try {
	      	var familyData = ProductModels.Product.fromCurrent().get('family'); 
	      	$("#mz-family-container").empty(); 
	      	for(var i=0; i < familyData.models.length; i++){
	      		//var x = this.model.checkVariationCode(familyData.models[i]);
	      		var view = new FamilyItemView({model: familyData.models[i]});
		        var renderedView = view.render().el;
		        $("#mz-family-container").append(renderedView);
	      	}
	      } catch(e){
	      	console.log("something wrong happened with family", e);
	      }
    }
    

    return FamilyItemView;

});
