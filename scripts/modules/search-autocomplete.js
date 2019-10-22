define(['shim!vendor/typeahead.js/typeahead.bundle[modules/jquery-mozu=jQuery]>jQuery', 'hyprlive', 'modules/api', 'hyprlivecontext', 'modules/block-ui'],
    function ($, Hypr, api, HyprLiveContext, blockUiLoader) {

    // bundled typeahead saves a lot of space but exports bloodhound to the root object, let's lose it
    var Bloodhound = window.Bloodhound.noConflict();

    // bloodhound wants to make its own AJAX requests, and since it's got such good caching and tokenizing algorithms, i'm happy to help it
    // so instead of using the SDK to place the request, we just use it to get the URL configs and the required API headers

    // create bloodhound instances for each type of suggestion

    var Search = function() {
        return {
            qs : '%QUERY',
            eqs : function() {
                var self = this;
                return window.encodeURIComponent(self.qs);
            },
            suggestPriorSearchTerms: Hypr.getThemeSetting('suggestPriorSearchTerms'),
            getApiUrl : function (groups) {
                var self = this;
                return api.getActionConfig('suggest', 'get', { query: self.qs, groups: groups }).url;
            },
            ajaxConfig : {
                headers: api.getRequestHeaders()
            },
            nonWordRe : /\W+/,
            makeSuggestionGroupFilter : function (name) {
                return function (res) {
                    var suggestionGroups = res.suggestionGroups,
                        thisGroup;
                    for (var i = suggestionGroups.length - 1; i >= 0; i--) {
                        if (suggestionGroups[i].name === name) {
                            thisGroup = suggestionGroups[i];
                            break;
                        }
                    }
                    return thisGroup.suggestions;
                };
            },

            makeTemplateFn : function (name) {
                var tpt = Hypr.getTemplate(name);
                return function (obj) {
                    return tpt.render(obj);
                };
            },

            setDataSetConfigs : function() {
                var self = this;
                self.dataSetConfigs = [
                    {
                        name: 'pages',
                        displayKey: function (datum) {
                            return datum.suggestion.productCode;
                        },
                        templates: {
                            suggestion: self.makeTemplateFn('modules/search/autocomplete-page-result')
                        },
                        source: self.AutocompleteManager.datasets.pages.ttAdapter()
                    }
                ];
            },

            datasets: function() {
                var self = this;
                return {
                    pages: new Bloodhound({
                        datumTokenizer: function (datum) {
                            return datum.suggestion.term.split(self.nonWordRe);
                        },
                        queryTokenizer: Bloodhound.tokenizers.whitespace,
                        remote: {
                            url: self.getApiUrl('pages'),
                            wildcard: self.eqs(),
                            filter: self.makeSuggestionGroupFilter("Pages"),
                            rateLimitWait: 400,
                            ajax: self.ajaxConfig
                        }
                    }),
					categories: new Bloodhound({
		                datumTokenizer: function(datum) {
		                    return datum.suggestion.categories.split(self.nonWordRe);
		                },
		                queryTokenizer: Bloodhound.tokenizers.whitespace,
		                remote: {
		                    url: self.getApiUrl('categories'),
		                    wildcard: self.eqs(),
		                    filter: self.makeSuggestionGroupFilter("Categories"),
		                    rateLimitWait: 100,
		                    ajax: self.ajaxConfig
		                }
		            })
                };
            },

            datasetsTerms: function() {
                var self = this;
                return new Bloodhound({
                    datumTokenizer: function (datum) {
                        return datum.suggestion.term.split(self.nonWordRe);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    remote: {
                        url: self.getApiUrl('terms'),
                        wildcard: self.eqs(),
                        filter: self.makeSuggestionGroupFilter("Terms"),
                        rateLimitWait: 100,
                        ajax: self.ajaxConfig
                    }
                });
            },

            initialize: function() {
                var self = this;
                self.AutocompleteManager = {
                    datasets: self.datasets()
                };

                $.each(self.AutocompleteManager.datasets, function (name, set) {
                    set.initialize();
                });

                self.setDataSetConfigs();

                if (self.suggestPriorSearchTerms) {
                    self.AutocompleteManager.datasets.terms = self.datasetsTerms();
                    self.AutocompleteManager.datasets.terms.initialize();
                    self.dataSetConfigs.push({
                        name: 'terms',
                        displayKey: function (datum) {
                            return datum.suggestion.term;
                        },
                        source: self.AutocompleteManager.datasets.terms.ttAdapter()
                    });
                }
            }
        };
    };
    
    function handleSearchResults(item, searchVal) {
        console.log(item);
        var productData = $(item).find('.primary-btn.quick-view-btn').data('mzProductData');
        var variation;
        if (productData.variations.length !== 0) {
            variation = productData.variations.find(function (obj) {
                return (obj.productCode === searchVal) ? obj : null;
            });
        }
        
        if ((productData && productData.productCode === searchVal) || (variation && productData.variations.length !== 0 && variation.productCode === searchVal)) {
        
            if (variation) {
                $.cookie('searchProductOptions', JSON.stringify(variation), {
                    path: '/'
                });
            }
            window.location.pathname = productData.url;
            console.log(productData.url);
            return true;
        } else {
            return false;
        }
    }

    $(document).ready(function () {
        var $fields = $('[data-mz-role="searchquery"]').each(function(field){
            var search = new Search();
            search.initialize();

            var $field = search.AutocompleteManager.$typeaheadField = $(this);

            search.AutocompleteManager.typeaheadInstance = $field.typeahead({
                minLength: 3
            }, search.dataSetConfigs).data('ttTypeahead');
            // user hits enter key while menu item is selected;
            $field.on('typeahead:selected', function (e, data, set) {
                if (data.suggestion.productCode) window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/p/" + data.suggestion.productCode;
            });
        });
   		$('#searchbox').on('submit', function(e){
            var searchVal = $('#search-field').val().trim();
            if(searchVal === ""){
                window.alert(Hypr.getLabel('blankSearchResult'));
                e.preventDefault();
            }else if(searchVal.length < 3){
                window.alert(Hypr.getLabel('searchLessCharacters'));
                e.preventDefault();
            }
            var newString = searchVal.replace(/[^\d\-]+/g, '');
            var regEx = new RegExp(/[\d\d\d\d-\d\d\d\d]/g);
            if (newString.indexOf('-') !== -1) {
                e.preventDefault();
                // console.log('is item number');
                blockUiLoader.globalLoader();
                $.ajax({
                    url: '/search?categoryId=133&query=' + newString,
                    type: 'GET',
                    beforeSend: function(req){
                        req.setRequestHeader('Accept', 'text/html,application/xhtml+xml,application/x');
                    },  
                    success: function (data) {
                        var items = $(data).find('#product-list-ul .mz-productlist-item');
                        // var newString = searchVal.replace(/[^\d\-]+/g, '');
                        // var regEx = new RegExp(/[\d\d\d\d-\d\d\d\d]/g);

                        console.log(items.length);
                        if (items.length !== 0 && regEx.test(newString)) {
                            var hasValidResults = [];
                            
                            items.each(function(id){
                                hasValidResults.push(handleSearchResults(this, newString));                                

                                console.log(hasValidResults, id, items.length, newString, searchVal);
                                if (hasValidResults.indexOf(true) === -1 && id === items.length - 1) {
                                    $('#search-field').val(searchVal.replace('-', ''));
                                    $('#searchbox').submit();
                                }
                                
                            });

                        } else {
                            console.log(newString, searchVal, items);
                            $('#search-field').val(searchVal.replace('-', ''));
                            $('#searchbox').submit();
                        }
                    },
                    always: function() {
                        blockUiLoader.unblockUi();
                    }
                });
            }
  		});
    });
    return Search;
});
