define([
	"modules/jquery-mozu", 
	"underscore", 
	"modules/backbone-mozu", 
	"hyprlive", 
	"modules/models-price", 
	"modules/api",
    "hyprlivecontext",
    "modules/models-product-options",
    "modules/models-messages"], 
    function($, _, Backbone, Hypr, PriceModels, api, HyprLiveContext, ProductOption, MessageModels) {
    	var ProductContent = Backbone.MozuModel.extend({}), 
	      	
    	FamilyItem = Backbone.MozuModel.extend({
	        mozuType: 'product',
	        idAttribute: 'productCode',
	        handlesMessages: true,        
	        helpers: ['mainImage', 'notDoneConfiguring', 'hasPriceRange', 'supportsInStorePickup', 'isPurchasable','hasVolumePricing'],
	        defaults: {
	            purchasableState: {},
	            quantity: 0
	        },
	        dataTypes: {
	            quantity: Backbone.MozuModel.DataTypes.Int
	        },
	        initApiModel: function(conf) {
	            var me = this;
	            this.apiModel = api.createSync(this.mozuType, _.extend({}, _.result(this, 'defaults') || {}, conf));
	            if (!this.apiModel || !this.apiModel.on) return;
	            this.apiModel.on('action', function() {
	                me.isLoading(true);
	                me.trigger('request');
	            });
	            this.apiModel.on('sync', function(rawJSON) {
	                me.isLoading(false);
	                if (rawJSON) {
	                    me._isSyncing = true;
	                    var updaterawJSON = me.checkVariationCode(rawJSON);
	                    me.set(updaterawJSON);
	                    me._isSyncing = false;
	                }
	                me.trigger('sync', rawJSON);
	            });
	            this.apiModel.on('spawn', function(rawJSON) {
	                me.isLoading(false);
	            });
	            this.apiModel.on('error', function(err) {
	                me.isLoading(false);
	                me.trigger('error', err);
	            });
	            this.on('change', function() {
	                if (!me._isSyncing) {
	                    var changedAttributes = me.changedAttributes();
	                    _.each(changedAttributes, function(v, k, l) {
	                        if (v && typeof v.toJSON === "function")
	                            l[k] = v.toJSON();
	                    });
	                    me.apiModel.prop(changedAttributes);
	                }
	            });
	        },
            /**
             * A helper method for use in templates. True if there are one or more messages in this model's `messages` cllection.
             * Added to the list of {@link MozuModel#helpers } if {@link MozuModel#handlesMessages } is set to `true`.
             * @returns {boolean} True if there are one or more messages in this model's `messages` collection.
             * @method hasMessages
             * @memberof MozuModel.prototype
             */

            initMessages: function() {
                var me = this;
                me.messages = new MessageModels.MessagesCollection();
                me.hasMessages = function() {
                    return me.messages.length > 0;
                };
                me.helpers.push('hasMessages');
                me.on('error', function(err) {
                    if (err.items && err.items.length) {
                        me.messages.reset(err.items);
                    } else {
                        me.messages.reset([err]);
                    }
                    window.productView.render();
                });
                me.on('sync', function(raw) {
                    if (!raw || !raw.messages || raw.messages.length === 0) me.messages.reset();
                });
                _.each(this.relations, function(v, key) {
                    var relInstance = me.get(key);
                    if (relInstance) me.listenTo(relInstance, 'error', function(err) {
                        me.trigger('error', err);
                    });
                });
            },	        
	        validation: {
	            quantity: {
	                min: 0,
	                msg: Hypr.getLabel('enterProductQuantity')
	            }
	        },
	        relations: {
	            content: ProductContent,
	            price: PriceModels.ProductPrice,
	            priceRange: PriceModels.ProductPriceRange,
	            options: Backbone.Collection.extend({
	                model: ProductOption
	            })
	        },
	        getBundledProductProperties: function(opts) {
	            var self = this,
	                loud = !opts || !opts.silent;
	            if (loud) {
	                this.isLoading(true);
	                this.trigger('request');
	            }

	            var bundledProducts = this.get('bundledProducts'),
	                numReqs = bundledProducts.length,
	                deferred = api.defer();
	            _.each(bundledProducts, function(bp) {
	                var op = api.get('product', bp.productCode);
	                op.ensure(function() {
	                    if (--numReqs === 0) {
	                        _.defer(function() {
	                            self.set('bundledProducts', bundledProducts);
	                            if (loud) {
	                                this.trigger('sync', bundledProducts);
	                                this.isLoading(false);
	                            }
	                            deferred.resolve(bundledProducts);
	                        });
	                    }
	                });
	                op.then(function(p) {
	                    _.each(p.prop('properties'), function(prop) {
	                        if (!prop.values || prop.values.length === 0 || prop.values[0].value === '' || prop.values[0].stringValue === '') {
	                            prop.isEmpty = true;
	                        }
	                    });
	                    _.extend(bp, p.data);
	                });
	            });

	            return deferred.promise;
	        },
	        hasPriceRange: function() {
	            return this._hasPriceRange;
	        },
	        hasVolumePricing: function() {
	            return this._hasVolumePricing;
	        },
	        calculateHasPriceRange: function(json) {
	            this._hasPriceRange = json && !!json.priceRange;
	        },
	        initialize: function(conf) {
	            var me = this;
	            setTimeout(function(){
	                me.apiGet().then(function(){
	                    var slug = me.get('content').get('seoFriendlyUrl');

	                    _.bindAll(me, 'calculateHasPriceRange', 'onOptionChange');
	                    me.listenTo(me.get("options"), "optionchange", me.onOptionChange);
	                    me._hasVolumePricing = false;
	                    me._minQty = 0;
	                    if (me.get('volumePriceBands') && me.get('volumePriceBands').length > 0) {
	                        me._hasVolumePricing = true;
	                        me._minQty = _.first(me.get('volumePriceBands')).minQty;
	                        if (me._minQty > 1) {
	                            if (me.get('quantity') <= 1) {
	                                me.set('quantity', me._minQty);
	                            }
	                            me.validation.quantity.msg = Hypr.getLabel('enterProductQuantity', me._minQty);
	                        }
	                    }
	                    me.updateConfiguration = _.debounce(me.updateConfiguration, 300);
	                    me.set({ url: (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + (slug ? "/" + slug : "") +  "/p/" + me.get("productCode")});
	                    me.lastConfiguration = [];
	                    me.calculateHasPriceRange(conf);
	                    me.on('sync', me.calculateHasPriceRange);
	                    me.trigger('ready');
	                    me.set("isReady",true);
	                });
	            },1000);
	        },
	        checkVariationCode: function(rawJSON){
	            var me = this;
	            var variations = rawJSON.variations || me.get("variations");
	            var variationCodes = me.get('variationCodes');
	            var variation_pro = [];
	            var options_arr = [];
	            rawJSON.variations = variation_pro;
	            //me.set('variations', variation_pro);
	            _.each(variations, function(valued) {
	                for (var k = 0; k < variationCodes.length; k++) {
	                    if (valued.productCode === variationCodes[k]) {
	                        variation_pro.push(valued);
	                        //variation_pro = _.uniq(variation_pro);
	                        if (rawJSON.options) {
	                            for (var l = 0; l < valued.options.length; l++) {
	                                options_arr.push(valued.options[l].valueSequence);
	                                options_arr = _.uniq(options_arr); 
	                            }
	                        }
	                    }
	                }
	            });
	            rawJSON.variations = variation_pro;
	            //remove options
	            for(var i=0;i<rawJSON.options.length;i++){
	                var opt_pro= [];
	                var option = rawJSON.options[i];
	                var key = option.attributeFQN;
	                for (var b = 0; b < option.values.length; b++) {
	                    for (var c = 0; c < options_arr.length; c++) {
	                        if (option.values[b].attributeValueId === options_arr[c]) {
	                            opt_pro.push(option.values[b]);     
	                            break;                       
	                        }
	                    }
	                } 
	                rawJSON.options[i].values=opt_pro;
	            }
	            return rawJSON;
	        },
	        mainImage: function() {
	            var productImages = this.get('content.productImages');
	            return productImages && productImages[0];
	        },
	        notDoneConfiguring: function() {
	            return this.get('productUsage') === FamilyItem.Constants.ProductUsage.Configurable && !this.get('variationProductCode');
	        },
	        isPurchasable: function() {
	            var purchaseState = this.get('purchasableState');
	            if (purchaseState.isPurchasable){
	                return true;
	            }
	            if (this._hasVolumePricing && purchaseState.messages && purchaseState.messages.length === 1 && purchaseState.messages[0].validationType === 'MinQtyNotMet') {
	                return true;
	            }
	            return false;
	        },
	        supportsInStorePickup: function() {
	            return _.contains(this.get('fulfillmentTypesSupported'), FamilyItem.Constants.FulfillmentTypes.IN_STORE_PICKUP);
	        },
	        getConfiguredOptions: function(options) {
	            return this.get('options').reduce(function(biscuit, opt) {
	                opt.addConfiguration(biscuit, options);
	                return biscuit;
	            }, []);
	        },


	        addToCart: function () {
	            var me = this;
	            me.messages.reset();
	            var dfd = $.Deferred();
	            this.whenReady(function () {
	                if (!me.validate()) {
	                    var fulfillMethod = me.get('fulfillmentMethod');
	                    if (!fulfillMethod) {
	                        fulfillMethod = (me.get('goodsType') === 'Physical') ? FamilyItem.Constants.FulfillmentMethods.SHIP : FamilyItem.Constants.FulfillmentMethods.DIGITAL;
	                    }
	                    if(typeof me.get('inventoryInfo').onlineStockAvailable !== 'undefined'){
	                    	if(me.get('quantity') === 0){
	                    		//me.validation.quantity.msg = Hypr.getLabel('enterProductQuantity', me._minQty);
	                    		me.trigger('error', { message : Hypr.getLabel('enterProductQuantity')});
	                    		dfd.reject(Hypr.getLabel('enterProductQuantity'));
	                    		return;
	                    	}
		                    me.apiAddToCart({
		                        options: me.getConfiguredOptions(),
		                        fulfillmentMethod: fulfillMethod,
		                        quantity: me.get("quantity")
		                    }).then(function (item) {
		                    	dfd.resolve(item);
		                        me.trigger('addedtocart', item);
		                    },function(e){
		                    	dfd.reject(e);
		                    });
		                }else if(!me.lastConfiguration.length && me.get('quantity') > 0){
		                	me.trigger('error', { message : Hypr.getLabel('selectValidOption')});
		                	dfd.reject(Hypr.getLabel('selectValidOption'));
		                }else if(me.lastConfiguration.length && me.get('quantity') === 0){
		                	me.trigger('error', { message : Hypr.getLabel('enterProductQuantity')});
		                	dfd.reject(Hypr.getLabel('enterProductQuantity'));
		                }else{
		                	/*me.trigger('error', { message : Hypr.getLabel('selectValidOption')});
		                	dfd.reject(Hypr.getLabel('selectValidOption'));*/
		                	dfd.resolve(me);
		                }
	                }
	            });
	            return dfd.promise();
	        },
	        addToWishlist: function() {
	            var me = this;
	            this.whenReady(function() {
	                if (!me.validate()) {
	                    me.apiAddToWishlist({
	                        customerAccountId: require.mozuData('user').accountId,
	                        quantity: me.get("quantity"),
	                        options: me.getConfiguredOptions()
	                    }).then(function(item) {
	                        me.trigger('addedtowishlist', item);
	                    });
	                }
	            });
	        },
	        addToCartForPickup: function(locationCode, locationName, quantity) {
	            var me = this;
	            this.whenReady(function() {
	                return me.apiAddToCartForPickup({
	                    fulfillmentLocationCode: locationCode,
	                    fulfillmentMethod: FamilyItem.Constants.FulfillmentMethods.PICKUP,
	                    fulfillmentLocationName: locationName,
	                    quantity: quantity || 1
	                }).then(function(item) {
	                    me.trigger('addedtocart', item);
	                });
	            });
	        },
	        onOptionChange: function() {
	            this.isLoading(true);
	            this.updateConfiguration();
	        },
	        updateQuantity: function (newQty) {
	            if (this.get('quantity') === newQty) return;
	            this.set('quantity', newQty);
	            if (!this._hasVolumePricing) return;
	            if (newQty < this._minQty) {
	                return this.showBelowQuantityWarning();
	            }
	            this.isLoading(true);
	            this.apiConfigure({ options: this.getConfiguredOptions() }, { useExistingInstances: true });
	        },
	        showBelowQuantityWarning: function () {
	            this.validation.quantity.min = this._minQty;
	            this.validate();
	            this.validation.quantity.min = 1;
	        },
	        handleMixedVolumePricingTransitions: function (data) {
	            if (!data || !data.volumePriceBands || data.volumePriceBands.length === 0) return;
	            if (this._minQty === data.volumePriceBands[0].minQty) return;
	            this._minQty = data.volumePriceBands[0].minQty;
	            this.validation.quantity.msg = Hypr.getLabel('enterProductQuantity', this._minQty);
	            if (this.get('quantity') < this._minQty) {
	                this.updateQuantity(this._minQty);
	            }
	        },
	        updateConfiguration: function() {
	            var me = this,
	              newConfiguration = this.getConfiguredOptions();
	            if (JSON.stringify(this.lastConfiguration) !== JSON.stringify(newConfiguration)) {
	                this.lastConfiguration = newConfiguration;
	                this.apiConfigure({ options: newConfiguration }, { useExistingInstances: true })
	                    .then(function (apiModel) {
	                        //me.checkVariationCode();
	                        if (me._hasVolumePricing) {
	                            me.handleMixedVolumePricingTransitions(apiModel.data);
	                        }
	                     });
	            } else {
	                this.isLoading(false);
	            }
	        },
	        parse: function(prodJSON) {
	            if (prodJSON && prodJSON.productCode && !prodJSON.variationProductCode) {
	                this.unset('variationProductCode');
	            }
	            return prodJSON;
	        },
	        toJSON: function(options) {
	            var j = Backbone.MozuModel.prototype.toJSON.apply(this, arguments);
	            if (!options || !options.helpers) {
	                j.options = this.getConfiguredOptions({ unabridged: true });
	            }
	            if (options && options.helpers) {
	                if (typeof j.mfgPartNumber == "string") j.mfgPartNumber = [j.mfgPartNumber];
	                if (typeof j.upc == "string") j.upc = [j.upc];
	                if (j.bundledProducts && j.bundledProducts.length === 0) delete j.bundledProducts;
	            }
	            return j;
	        }
	    }, {
	        Constants: {
	            FulfillmentMethods: {
	                SHIP: "Ship",
	                PICKUP: "Pickup",
	                DIGITAL: "Digital"
	            },
	            // for catalog instead of commerce
	            FulfillmentTypes: {
	                IN_STORE_PICKUP: "InStorePickup"
	            },
	            ProductUsage: {
	                Configurable: 'Configurable'
	            }
	        }   
	    });
		return FamilyItem;
    });