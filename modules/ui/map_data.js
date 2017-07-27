import * as d3 from 'd3';
import _ from 'lodash';
import 'proj4';
import { d3keybinding } from '../lib/d3.keybinding.js';
import { t, textDirection } from '../util/locale';
import { svgIcon } from '../svg/index';
import { uiTooltipHtml } from './tooltipHtml';

import { tooltip } from '../util/tooltip';
import { d3combobox } from '../lib/d3.combobox.js';

export function uiMapData(context) {
    var key = t('map_data.key'),
        geoserviceLayerUrl = context.storage('geoserviceLayerUrl') || '',
        geoserviceDownloadAll = true,
        features = context.features().keys(),
        layers = context.layers(),
        fills = ['wireframe', 'partial', 'full'],
        fillDefault = context.storage('area-fill') || 'partial',
        fillSelected = fillDefault;


    function map_data(selection) {
        function getFetcher() {
            var geoserviceLayer = context.layers().layer('geoservice');
            return function(value, cb) {
                var setPreset = geoserviceLayer.preset();
                var v = value.toLowerCase();
                var suggestedTags = [];
                if (setPreset) {
                    _.map(setPreset.fields, function(field) {
                        if (field.keys) {
                            suggestedTags = suggestedTags.concat(_.map(field.keys, function(key) {
                                return { value: key };
                            }));
                        } else if (field.key) {
                            suggestedTags.push({ value: field.key });
                        }
                    });
                }
                cb(suggestedTags.filter(function(d) {
                    return d.value.toLowerCase().indexOf(v) >= 0;
                }));
            };
        }

        function showsFeature(d) {
            return context.features().enabled(d);
        }


        function autoHiddenFeature(d) {
            return context.features().autoHidden(d);
        }


        function clickFeature(d) {
            context.features().toggle(d);
            update();
        }


        function showsFill(d) {
            return fillSelected === d;
        }


        function setFill(d) {
            _.each(fills, function(opt) {
                context.surface().classed('fill-' + opt, Boolean(opt === d));
            });

            fillSelected = d;
            if (d !== 'wireframe') {
                fillDefault = d;
                context.storage('area-fill', d);
            }
            update();
        }


        function showsLayer(which) {
            var layer = layers.layer(which);
            if (layer) {
                return layer.enabled();
            }
            return false;
        }


        function setLayer(which, enabled) {
            var layer = layers.layer(which);
            if (layer) {
                layer.enabled(enabled);
                update();
            }
        }


        function toggleLayer(which) {
            setLayer(which, !showsLayer(which));
        }

        function clickGpx() {
            toggleLayer('gpx');
        }

        function clickMapillaryImages() {
            toggleLayer('mapillary-images');
            if (!showsLayer('mapillary-images')) {
                setLayer('mapillary-signs', false);
            }
        }


        function clickMapillarySigns() {
            toggleLayer('mapillary-signs');
        }


        function drawMapillaryItems(selection) {
            var mapillaryImages = layers.layer('mapillary-images'),
                mapillarySigns = layers.layer('mapillary-signs'),
                supportsMapillaryImages = mapillaryImages && mapillaryImages.supported(),
                supportsMapillarySigns = mapillarySigns && mapillarySigns.supported(),
                showsMapillaryImages = supportsMapillaryImages && mapillaryImages.enabled(),
                showsMapillarySigns = supportsMapillarySigns && mapillarySigns.enabled();

            var mapillaryList = selection
                .selectAll('.layer-list-mapillary')
                .data([0]);

            mapillaryList = mapillaryList.enter()
                .append('ul')
                .attr('class', 'layer-list layer-list-mapillary')
                .merge(mapillaryList);


            var mapillaryImageLayerItem = mapillaryList
                .selectAll('.list-item-mapillary-images')
                .data(supportsMapillaryImages ? [0] : []);

            mapillaryImageLayerItem.exit()
                .remove();

            var enterImages = mapillaryImageLayerItem.enter()
                .append('li')
                .attr('class', 'list-item-mapillary-images');

            var labelImages = enterImages
                .append('label')
                .call(tooltip()
                    .title(t('mapillary_images.tooltip'))
                    .placement('top'));

            labelImages
                .append('input')
                .attr('type', 'checkbox')
                .on('change', clickMapillaryImages);

            labelImages
                .append('span')
                .text(t('mapillary_images.title'));


            var mapillarySignLayerItem = mapillaryList
                .selectAll('.list-item-mapillary-signs')
                .data(supportsMapillarySigns ? [0] : []);

            mapillarySignLayerItem.exit()
                .remove();

            var enterSigns = mapillarySignLayerItem.enter()
                .append('li')
                .attr('class', 'list-item-mapillary-signs');

            var labelSigns = enterSigns
                .append('label')
                .call(tooltip()
                    .title(t('mapillary_signs.tooltip'))
                    .placement('top'));

            labelSigns
                .append('input')
                .attr('type', 'checkbox')
                .on('change', clickMapillarySigns);

            labelSigns
                .append('span')
                .text(t('mapillary_signs.title'));


            // Updates
            mapillaryImageLayerItem = mapillaryImageLayerItem
                .merge(enterImages);

            mapillaryImageLayerItem
                .classed('active', showsMapillaryImages)
                .selectAll('input')
                .property('checked', showsMapillaryImages);


            mapillarySignLayerItem = mapillarySignLayerItem
                .merge(enterSigns);

            mapillarySignLayerItem
                .classed('active', showsMapillarySigns)
                .selectAll('input')
                .property('disabled', !showsMapillaryImages)
                .property('checked', showsMapillarySigns);

            mapillarySignLayerItem
                .selectAll('label')
                .classed('deemphasize', !showsMapillaryImages);
        }

        function drawGeoServiceItem(selection) {
            var geoserviceLayer = layers.layer('geoservice'),
                hasData = geoserviceLayer && geoserviceLayer.hasData(),
                showsGeoService = hasData && geoserviceLayer.enabled();

            var geoserviceLayerItem = selection
                .selectAll('.layer-list-geoservice')
                .data(geoserviceLayer ? [0] : []);

            // Exit
            geoserviceLayerItem.exit()
                .remove();

            // Enter

            var enter = geoserviceLayerItem.enter()
                .append('ul')
                .attr('class', 'layer-list layer-list-geoservice')
                .append('li')
                .classed('list-item-geoservice', true);

            var hoverGeoService = tooltip()
                .title('Enter a GeoService URL')
                .placement('top');
            var labelGeoService = enter
                .append('label')
                .call(hoverGeoService);

            labelGeoService.append('button')
                .attr('class', 'layer-browse')
                .on('click', editGeoService)
                // the magnifying glass doesnt seem appropriate since we dont provide tools to search
                // .call(svgIcon('#icon-search'));

            labelGeoService
                .append('span')
                .attr('class', 'geoservice-button-label')
                .text('Add GeoService Layer');

            var allOpts = enter.append('label')
                .attr('class', 'geoservice-all-opt');
            allOpts.append('input')
                .attr('type', 'radio')
                .attr('name', 'import-visibility')
                .attr('value', 'all')
                .property('checked', 'checked');
            allOpts.append('span').text('Show OSM & Import');
            var osmOpt = enter.append('label')
                .attr('class', 'geoservice-osm-opt');
            osmOpt.append('input')
                .attr('type', 'radio')
                .attr('name', 'import-visibility')
                .attr('value', 'osm');
            osmOpt.append('span').text('Hide Import Layer');
            var importOpt = enter.append('label')
                .attr('class', 'geoservice-import-opt');
            importOpt.append('input')
                .attr('type', 'radio')
                .attr('name', 'import-visibility')
                .attr('value', 'import');
            importOpt.append('span').text('Hide OSM Layer');

            var urlEntry, urlInput, copyrightable, copyLabel, copyapproval, layerSelect, preset, presetList, presetComboBox, approvalPhase, individualApproval, allApproval, metadata_url;

            // I'm going to run this filtering process but only once
            if (window.filterInterval) {
                clearInterval(window.filterInterval);
            }
            window.filterInterval = setInterval(function() {
                if (d3.select('.geoservice-all-opt input').property('checked')) {
                    d3.selectAll('.data-layer .geoservice-import, .data-layer .geoservice-osm').style('visibility', 'visible');
                } else if (d3.select('.geoservice-osm-opt input').property('checked')) {
                    d3.selectAll('.data-layer .geoservice-osm').style('visibility', 'visible');
                    d3.selectAll('.data-layer .geoservice-import').style('visibility', 'hidden');
                } else if (d3.select('.geoservice-import-opt input').property('checked')) {
                    d3.selectAll('.data-layer .geoservice-osm').style('visibility', 'hidden');
                    d3.selectAll('.data-layer .geoservice-import').style('visibility', 'visible');
                }
            }, 300);

            // create GeoService layer edit pane only once
            if (this.pane) {
                return;
            }

            // based on the help pane
            this.pane = d3.selectAll('#content').append('div')
                .attr('class', 'shaded hide geoservice-pane')
                .append('div').attr('class', 'modal fillL col9')
                .append('div').attr('class', 'cf')
                .append('div').attr('class', 'modal-section');

            enter.append('button')
                .attr('class', 'clear-geoservice hide')
                .text('Clear GeoService')
                .on('click', (function() {
                    // clear the UI
                    d3.selectAll('.geoservice-all-opt, .geoservice-osm-opt, .geoservice-import-opt, .clear-geoservice')
                       .style('display', 'none');
                    d3.select('.geoservice-button-label').text('Add GeoService Layer');
                    hoverGeoService.title('Enter a GeoService URL');

                    // clear the map
                    geoserviceLayer.geojson({});
                    window.knownObjectIds = {};
                    window.importedEntities = [];
                    context.flush();
                    populatePane(this.pane);
                }).bind(this));

            function previewGeoService(err, data) {
                if (err) {
                    return console.log(err);
                }
                data = JSON.parse(data);

                /*
                if (data.extent) {
                    var sw = [data.extent.xmin, data.extent.ymin];
                    var ne = [data.extent.xmax, data.extent.ymax];
                    sw = proj4(data.extent.spatialReference.wkid, 'WGS84', sw);
                    ne = proj4(data.extent.spatialReference.wkid, 'WGS84', ne);
                    console.log(sw);
                    console.log(ne);
                }
                */

                if (data.layers && data.layers.length) {
                    // MapServer layer selector
                    layerSelect.html('')
                        .classed('hide', false)
                        .on('change', function() {
                            if (this.value) {
                                urlInput.property('value', this.value);
                                urlInput.on('input')(null, this.value);
                            }
                        })
                        .append('option')
                            .text('select one layer')
                            .attr('value', '')
                            .property('selected', true);

                    _.map(data.layers, function(optLayer) {
                        layerSelect.append('option')
                            .text(optLayer.name)
                            .attr('value', metadata_url.split('/metadata')[0] + '/' + optLayer.id);
                    });
                    return;
                }
                if (!data.fields || !data.fields.length) {
                    return;
                }

                // call for count of import features
                var counter_url = metadata_url.split('/metadata')[0] + '/query?where=1%3D1&returnCountOnly=true&f=json';
                d3.selectAll('.layer-counted').classed('hide', false);
                d3.text(counter_url, function (err, data) {
                    var count = JSON.parse(data).count;
                    d3.selectAll('.layer-counted .global').text(count);
                });
                var bounds = context.map().trimmedExtent().bbox();
                bounds = JSON.stringify({
                    xmin: bounds.minX.toFixed(6) * 1,
                    ymin: bounds.minY.toFixed(6) * 1,
                    xmax: bounds.maxX.toFixed(6) * 1,
                    ymax: bounds.maxY.toFixed(6) * 1,
                    spatialReference: {wkid: 4326}
                });
                counter_url += '&geometry=' + bounds;
                counter_url += '&geometryType=esriGeometryEnvelope';
                counter_url += '&spatialRel=esriSpatialRelIntersects';
                counter_url += '&inSR=4326';
                d3.text(counter_url, function (err, data) {
                    var count = JSON.parse(data).count;
                    d3.selectAll('.layer-counted .local').text(count);
                });

                // handle OSM / ODBL license approval
                window.metadata = metadata_url;
                window.license = data.copyrightText.replace(/\s/g, '');
                if (data.copyrightText && data.copyrightText.trim().length) {
                    if (context.storage('license-' + window.license)) {
                        // user has seen and approved this license before
                        d3.selectAll('.copyright-text')
                            .text('Copyright info (previously approved): ' + data.copyrightText);
                        copyapproval.property('checked', true);
                    } else {
                        // new license
                        d3.selectAll('.copyright-text').text('Copyright info: ' + data.copyrightText);
                        copylabel.classed('hide', false);
                    }
                } else if (context.storage('license-' + metadata_url)) {
                    // user has seen and approved this URL before
                    d3.selectAll('.copyright-text')
                        .text('No copyright info provided. (previously approved)');
                    copyapproval.property('checked', true);
                } else {
                    // new URL, no license
                    d3.selectAll('.copyright-text').text('No copyright info provided.');
                    copylabel.classed('hide', false);
                }

                var geoserviceTable = d3.selectAll('.geoservice-table')
                    .html('<thead class="tag-row"><th>Include?</th><th>GeoService field</th><th>(optional) OSM tag</th></thead>');

                if (data.supportedQueryFormats && data.supportedQueryFormats.toLowerCase().indexOf('geojson') > -1) {
                    geoserviceLayer.format('geojson');
                } else {
                    geoserviceLayer.format('json');
                }

                data.fields.map(function(field) {
                    // don't allow user to change how OBJECTID works
                    if (field.name === 'OBJECTID' || field.alias === 'OBJECTID') {
                        return;
                    }

                    var row = geoserviceTable.append('tr')
                        .attr('class', 'preview');
                    row.append('td').append('input')
                        .attr('class', field.name.replace(/\s/g, '_'))
                        .attr('type', 'checkbox')
                        .property('checked', window.layerChecked[field.name])
                        .on('click', function() {
                            if (d3.event.ctrlKey || d3.event.metaKey) {
                                // control click toggles all
                                var allSet = this.checked;
                                d3.selectAll('.geoservice-table input[type="checkbox"]')
                                    .property('checked', allSet)
                                    .each(function() {
                                        window.layerChecked[this.className] = allSet;
                                    });
                            }
                        })
                        .on('change', function() {
                            window.layerChecked[field.name] = this.checked;
                            var fields = geoserviceLayer.fields();
                            if (this.checked) {
                                fields.push(field.name);
                            } else {
                                var dex = fields.indexOf(field.name);
                                if (dex > -1) {
                                    fields.splice(dex, 1);
                                }
                            }
                            geoserviceLayer.fields(fields);
                        });
                    row.append('td').text(field.alias || field.name);
                    // row.append('td').text(samplefeature.properties[keys[r]] || '');

                    var suggestedKeys = d3combobox().fetcher(getFetcher()).minItems(0);
                    row.append('td').append('input')
                        .attr('type', 'text')
                        .attr('name', field.name)
                        .call(suggestedKeys)
                        .on('change', function() {
                            // properties with this.name renamed to this.value
                            window.layerImports[this.name] = this.value;
                        });
                });
                d3.selectAll('.geoservice-table')
                    .classed('hide', false);
            }

            function populatePane(pane) {
                pane.html('');

                // exit button
                pane.append('button')
                    .attr('tabindex', -1)
                    .on('click', toggle)
                    .call(svgIcon('#icon-close'));

                var content = pane.append('div')
                    .attr('class', 'left-content');

                // title
                content.append('h3')
                    .text('Import from a GeoService by URL');

                var body = content.append('div')
                    .attr('class', 'body');

                // replacing the window.prompt with an in-browser window
                urlEntry = body.append('div')
                    .attr('class', 'topurl');
                urlInput = urlEntry.append('input')
                    .attr('type', 'text')
                    .attr('class', 'geoservice')
                    .attr('placeholder', 'GeoService URL')
                    // .attr('value', context.storage('geoserviceLayerUrl') || '')
                    .on('input', function(e, fixedURL) {
                        // reformat URL ending to /layerID/metadata?f=json
                        metadata_url = fixedURL ? fixedURL : this.value;
                        metadata_url = metadata_url.split('/');
                        if (metadata_url.length < 2 || metadata_url[0].indexOf('http') === -1) {
                            return;
                        }

                        // if it just ends /0, we need to keep /0 around
                        var last = metadata_url.pop();
                        if ((!isNaN(last * 1)) || (last.toLowerCase().indexOf('server') > -1)) {
                            metadata_url.push(last);
                        }
                        metadata_url = (metadata_url.join('/') + '/metadata?f=json').replace(/\/\//g, '/').replace(':/', '://');

                        d3.text(metadata_url, previewGeoService);
                    });

                copyrightable = urlEntry.append('div');
                copyrightable.append('div')
                    .attr('class', 'copyright-text');
                copylabel = copyrightable.append('label')
                    .attr('class', 'hide');
                copyapproval = copylabel.append('input')
                    .attr('type', 'checkbox')
                    .attr('class', 'copyright-approved')
                    .property('checked', false)
                copylabel.append('span')
                    .text('This data is permitted to include on OpenStreetMap under the ODbL license');

                layerSelect = urlEntry.append('div')
                    .append('select')
                    .attr('class', 'layer-select hide');

                // load initial GeoService URL
                /*
                if (context.storage('geoserviceLayerUrl')) {
                    setTimeout(function() {
                        urlInput.on('input')(null, context.storage('geoserviceLayerUrl'));
                    }, 500);
                }
                */

                // known iD presets
                preset = urlEntry.append('div')
                    .attr('class', 'preset');
                preset.append('label')
                    .attr('class', 'preset-prompt')
                    .text('Optional: match features to a OSM preset');
                preset.append('div')
                    .attr('class', 'preset-icon-holder');
                preset.append('span')
                    .attr('class', 'preset-prompt');

                // click to remove a preset
                preset.append('button')
                    .attr('class', 'hide')
                    .attr('style', 'float: none !important')
                    .text('x')
                    .on('click', function() {
                        geoserviceLayer.preset(null);
                    });

                presetList = _.map(context.presets().collection, function(preset) {
                    return { value: preset.id };
                });
                presetComboBox = function(value, cb) {
                    var v = value.toLowerCase();
                    cb(presetList.filter(function(d) {
                        return d.value.indexOf(v) >= 0;
                    }));
                };
                preset.append('input')
                    .attr('type', 'text')
                    .attr('placeholder', 'feature type')
                    .call(d3combobox().fetcher(presetComboBox).minItems(0))
                    .on('change', function() {
                        var v = this.value;
                        var selection = context.presets().collection.filter(function(d) {
                            return d.id === v;
                        })[0];
                        geoserviceLayer.preset(selection);
                    });

                // point-in-polygon option
                var pip = preset.append('div')
                    .attr('class', 'point-in-polygon')
                    .append('label');
                pip.append('input')
                    .attr('type', 'checkbox')
                    .attr('name', 'point-in-polygon')
                    .property('checked', false);
                pip.append('span')
                    .text('Add addresses to buildings');

                // merge lines option
                var ml = preset.append('div')
                    .attr('class', 'merge-lines')
                    .append('label');
                ml.append('input')
                    .attr('type', 'checkbox')
                    .attr('name', 'merge-lines')
                    .property('checked', false);
                ml.append('span')
                    .text('Add data to roads');

                // no overlapping buildings option
                var bld = preset.append('div')
                    .attr('class', 'overlap-buildings')
                    .append('label');
                bld.append('input')
                    .attr('type', 'checkbox')
                    .attr('name', 'overlap-buildings')
                    .property('checked', false);
                bld.append('span')
                    .text('Prevent overlapping buildings');

                // using a point-in-polygon or other preset geo trickery requires us to see everything on the map
                d3.selectAll('.point-in-polygon, .merge-lines, .overlap-buildings').on('click', function() {
                    var globalBlocked = d3.selectAll('.point-in-polygon input').property('checked') || d3.selectAll('.merge-lines input').property('checked') || d3.selectAll('.overlap-buildings input').property('checked');
                    d3.selectAll('button.url.final.global').property('disabled', globalBlocked);
                });

                // radio buttons to decide how data is finalized on OSM
                approvalPhase = urlEntry.append('div')
                    .attr('class', 'import-approval hide');
                approvalPhase.append('h4')
                    .text('Review data before importing?');

                individualApproval = approvalPhase.append('label');
                individualApproval.append('input')
                    .attr('class', 'approval-individual')
                    .attr('type', 'radio')
                    .attr('name', 'approvalProcess')
                    .attr('value', 'individual')
                    .property('checked', true);
                individualApproval.append('span')
                    .text('Manually select import features');

                allApproval = approvalPhase.append('label');
                allApproval.append('input')
                    .attr('class', 'approval-all')
                    .attr('type', 'radio')
                    .attr('name', 'approvalProcess')
                    .attr('value', 'all');
                allApproval.append('span')
                    .text('Import all features by default');

                body.append('table')
                    .attr('border', '1')
                    .attr('class', 'geoservice-table hide') // tag-list
                    .append('img').attr('src', 'img/loader-white.gif');

                // this button adds a new field to data brought in from the GeoService
                // for example you can add addr:state=VA to a city's addresses which otherwise wouldn't have this repeated field

                d3.selectAll('.geoservice-table')
                    .append('hr')
                    .attr('class', 'import-table-switch');

                body.append('div')
                    .attr('class', 'inspector-inner hide')
                    .append('button')
                        .attr('class', 'add-tag')
                        .html('Add key:value to all features')
                        .call(svgIcon('#icon-plus', 'icon light'))
                        .on('click', function() {
                            d3.selectAll('.import-table-switch').classed('import-table-switch', false);
                            var row = d3.selectAll('.geoservice-table').append('tr');
                            var uniqNum = Math.floor(Math.random() * 10000);

                            // the checkbox
                            row.append('td').append('input')
                                .attr('type', 'checkbox')
                                .property('checked', true)
                                .property('disabled', true);

                            // the 'key' field, showing the new OSM tag key
                            var suggestedKeys = d3combobox().fetcher(getFetcher()).minItems(0);

                            var keyField = row.append('td').append('input')
                                .attr('type', 'text')
                                .attr('placeholder', 'new OSM key')
                                .attr('class', 'import-key-' + uniqNum)
                                .call(suggestedKeys)
                                .on('change', function() {
                                    if (this.name) {
                                        window.layerImports['add_' + this.value] = window.layerImports['add_' + this.name];
                                        delete window.layerImports['add_' + this.name];
                                    } else {
                                        window.layerImports['add_' + this.value] = '';
                                    }
                                    this.name = this.value;
                                    d3.selectAll('.osm-key-' + uniqNum).attr('name', this.value);
                                });

                            // the 'value' field setting the new OSM tag default value
                            row.append('td').append('input')
                                .attr('type', 'text')
                                .attr('placeholder', 'new OSM value')
                                .attr('class', 'osm-key-' + uniqNum)
                                .on('change', function() {
                                    // properties with this.name renamed to this.value
                                    window.layerImports['add_' + this.name] = this.value;
                                });
                        });

                pane.append('div')
                    .attr('class', 'layer-counted hide')
                    .html('<span class="global"></span> features; <span class="local"></span> in current view');

                // save button makes changes to existing and new import data
                pane.append('button')
                    .on('click', function() {
                        context.flush();
                        window.knownObjectIds = {};
                        window.importedEntities = [];
                        window.onOSMreload = function() {
                            window.onOSMreload = null;
                            refreshGeoService(context.storage('geoserviceLayerUrl'), geoserviceDownloadAll);
                            toggle();
                        };
                        d3.select('.geoservice-button-label').text('Edit GeoService Layer');
                        hoverGeoService.title('Customize your GeoService import');
                        d3.selectAll('.list-item-geoservice label, .clear-geoservice').style('display', 'block');
                    })
                    .attr('class', 'no-float hide')
                    .call(svgIcon('#icon-save', 'icon light'))
                    .text('Save');

                // actual download buttons, with license check and memory step
                var startLoad = function(geoserviceDownloadAll) {
                    var url = d3.select('input.geoservice').property('value');
                    var blacklists = context.connection().imageryBlacklists();
                    for (var b = 0; b < blacklists.length; b++) {
                        if (url.match(new RegExp(blacklists[b]))) {
                            alert('This data source matches Google or another service which is copyrighted, and not importable on OpenStreetMap.');
                            return;
                        }
                    }

                    if (!copyapproval.property('checked')) {
                        alert('This is your first time using this data source or license. Please confirm that this data can be added to OpenStreetMap');
                        return;
                    }
                    if (window.license || window.metadata) {
                        context.storage('license-' + (window.license || window.metadata), 'approved');
                    }

                    var importFields = Object.keys(window.layerChecked);
                    var importedAtLeastOneField = false;
                    for (var f = 0; f < importFields.length; f++) {
                        if (window.layerChecked[importFields[f]]) {
                            importedAtLeastOneField = true;
                            break;
                        }
                    }
                    if (!importedAtLeastOneField) {
                        alert('You should use a preset or import at least one field from the GeoService');
                        return;
                    }

                    d3.select('.geoservice-button-label')
                        .text('Edit GeoService Layer');
                    hoverGeoService.title('Customize your GeoService import');
                    d3.selectAll('.list-item-geoservice label, .clear-geoservice')
                       .style('display', 'block');
                    d3.selectAll('.layer-counted')
                        .classed('hide', true);
                    setGeoService(d3.select('.topurl input.geoservice').property('value'), geoserviceDownloadAll);
                };
                pane.append('button')
                    .attr('class', 'url final local')
                    .text('Load In View')
                    .on('click', function() { startLoad(false); });
                pane.append('button')
                    .attr('class', 'url final global')
                    .attr('style', 'margin-right: 10px')
                    .text('Load Globally')
                    .on('click', function() { startLoad(true); });
            }
            populatePane(this.pane);
        }

        function toggle() {
            // show and hide GeoService data import pane
            var geoservicePane = layers.layer('geoservice').pane();
            var hideMe = !geoservicePane.classed('hide');
            geoservicePane.classed('hide', hideMe);
        }

        function editGeoService() {
            // window allows user to enter a GeoService layer
            d3.event.preventDefault();
            toggle();
        }

        function setGeoService(template, downloadMax) {
            // remember GeoService URL for future visits
            context.storage('geoserviceLayerUrl', template);

            // un-hide GeoService pane and buttons
            var gsLayer = layers.layer('geoservice');
            gsLayer.pane()
                .classed('hide', false)
                .property('scrollTop', 0)
                .selectAll('.hide').classed('hide', false);

            // hide GeoService URL input
            gsLayer.pane().selectAll('.topurl, .url.final').classed('hide', true);

            // if there is an OSM preset, add it to set tags
            // window.layerImports = {};
            var setPreset = context.layers().layer('geoservice').preset();
            if (setPreset) {
                // set standard tags
                var tags = Object.keys(setPreset.tags);
                for (var t = 0; t < tags.length; t++) {
                    window.layerImports['add_' + tags[t]] = setPreset.tags[tags[t]];
                }

                // suggest additional OSM tags
                var suggestedTags = [];
                _.map(setPreset.fields, function(field) {
                    suggestedTags = suggestedTags.concat(field.keys);
                });
            }

            refreshGeoService(template, downloadMax);
        }

        function refreshGeoService(template, downloadMax) {
            // start loading data onto the map
            var gsLayer = context.layers().layer('geoservice');
            gsLayer.lastBounds = null;
            gsLayer.url(template, downloadMax);
            gsLayer.pane().classed('hide', false);
        }

        function drawGpxItem(selection) {
            var gpx = layers.layer('gpx'),
                hasGpx = gpx && gpx.hasGpx(),
                showsGpx = hasGpx && gpx.enabled();

            var gpxLayerItem = selection
                .selectAll('.layer-list-gpx')
                .data(gpx ? [0] : []);

            // Exit
            gpxLayerItem.exit()
                .remove();

            // Enter
            var enter = gpxLayerItem.enter()
                .append('ul')
                .attr('class', 'layer-list layer-list-gpx')
                .append('li')
                .classed('list-item-gpx', true);

            enter
                .append('button')
                .attr('class', 'list-item-gpx-extent')
                .call(tooltip()
                    .title(t('gpx.zoom'))
                    .placement((textDirection === 'rtl') ? 'right' : 'left'))
                .on('click', function() {
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                    gpx.fitZoom();
                })
                .call(svgIcon('#icon-search'));

            enter
                .append('button')
                .attr('class', 'list-item-gpx-browse')
                .call(tooltip()
                    .title(t('gpx.browse'))
                    .placement((textDirection === 'rtl') ? 'right' : 'left'))
                .on('click', function() {
                    d3.select(document.createElement('input'))
                        .attr('type', 'file')
                        .on('change', function() {
                            gpx.files(d3.event.target.files);
                        })
                        .node().click();
                })
                .call(svgIcon('#icon-geolocate'));

            var labelGpx = enter
                .append('label')
                .call(tooltip().title(t('gpx.drag_drop')).placement('top'));

            labelGpx
                .append('input')
                .attr('type', 'checkbox')
                .on('change', clickGpx);

            labelGpx
                .append('span')
                .text(t('gpx.local_layer'));


            // Update
            gpxLayerItem = gpxLayerItem
                .merge(enter);

            gpxLayerItem
                .classed('active', showsGpx)
                .selectAll('input')
                .property('disabled', !hasGpx)
                .property('checked', showsGpx);

            gpxLayerItem
                .selectAll('label')
                .classed('deemphasize', !hasGpx);
        }


        function drawList(selection, data, type, name, change, active) {
            var items = selection.selectAll('li')
                .data(data);

            // Exit
            items.exit()
                .remove();

            // Enter
            var enter = items.enter()
                .append('li')
                .attr('class', 'layer')
                .call(tooltip()
                    .html(true)
                    .title(function(d) {
                        var tip = t(name + '.' + d + '.tooltip'),
                            key = (d === 'wireframe' ? t('area_fill.wireframe.key') : null);

                        if (name === 'feature' && autoHiddenFeature(d)) {
                            tip += '<div>' + t('map_data.autohidden') + '</div>';
                        }
                        return uiTooltipHtml(tip, key);
                    })
                    .placement('top')
                );

            var label = enter
                .append('label');

            label
                .append('input')
                .attr('type', type)
                .attr('name', name)
                .on('change', change);

            label
                .append('span')
                .text(function(d) { return t(name + '.' + d + '.description'); });

            // Update
            items = items
                .merge(enter);

            items
                .classed('active', active)
                .selectAll('input')
                .property('checked', active)
                .property('indeterminate', function(d) {
                    return (name === 'feature' && autoHiddenFeature(d));
                });
        }


        function update() {
            dataLayerContainer.call(drawMapillaryItems);
            dataLayerContainer.call(drawGeoServiceItem);
            dataLayerContainer.call(drawGpxItem);

            fillList.call(drawList, fills, 'radio', 'area_fill', setFill, showsFill);
            featureList.call(drawList, features, 'checkbox', 'feature', clickFeature, showsFeature);
        }


        function hidePanel() {
            setVisible(false);
        }


        function togglePanel() {
            if (d3.event) d3.event.preventDefault();
            tooltipBehavior.hide(button);
            setVisible(!button.classed('active'));
        }


        function toggleWireframe() {
            if (d3.event) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
            }
            setFill((fillSelected === 'wireframe' ? fillDefault : 'wireframe'));
            context.map().pan([0,0]);  // trigger a redraw
        }


        function setVisible(show) {
            if (show !== shown) {
                button.classed('active', show);
                shown = show;

                if (show) {
                    update();
                    selection.on('mousedown.map_data-inside', function() {
                        return d3.event.stopPropagation();
                    });
                    content.style('display', 'block')
                        .style('right', '-300px')
                        .transition()
                        .duration(200)
                        .style('right', '0px');
                } else {
                    content.style('display', 'block')
                        .style('right', '0px')
                        .transition()
                        .duration(200)
                        .style('right', '-300px')
                        .on('end', function() {
                            d3.select(this).style('display', 'none');
                        });
                    selection.on('mousedown.map_data-inside', null);
                }
            }
        }


        var content = selection
                .append('div')
                .attr('class', 'fillL map-overlay col3 content hide'),
            tooltipBehavior = tooltip()
                .placement((textDirection === 'rtl') ? 'right' : 'left')
                .html(true)
                .title(uiTooltipHtml(t('map_data.description'), key)),
            button = selection
                .append('button')
                .attr('tabindex', -1)
                .on('click', togglePanel)
                .call(svgIcon('#icon-data', 'light'))
                .call(tooltipBehavior),
            shown = false;

        content
            .append('h4')
            .text(t('map_data.title'));


        // data layers
        content
            .append('a')
            .text(t('map_data.data_layers'))
            .attr('href', '#')
            .classed('hide-toggle', true)
            .classed('expanded', true)
            .on('click', function() {
                var exp = d3.select(this).classed('expanded');
                dataLayerContainer.style('display', exp ? 'none' : 'block');
                d3.select(this).classed('expanded', !exp);
                d3.event.preventDefault();
            });

        var dataLayerContainer = content
            .append('div')
            .attr('class', 'data-data-layers')
            .style('display', 'block');


        // area fills
        content
            .append('a')
            .text(t('map_data.fill_area'))
            .attr('href', '#')
            .classed('hide-toggle', true)
            .classed('expanded', false)
            .on('click', function() {
                var exp = d3.select(this).classed('expanded');
                fillContainer.style('display', exp ? 'none' : 'block');
                d3.select(this).classed('expanded', !exp);
                d3.event.preventDefault();
            });

        var fillContainer = content
            .append('div')
            .attr('class', 'data-area-fills')
            .style('display', 'none');

        var fillList = fillContainer
            .append('ul')
            .attr('class', 'layer-list layer-fill-list');


        // feature filters
        content
            .append('a')
            .text(t('map_data.map_features'))
            .attr('href', '#')
            .classed('hide-toggle', true)
            .classed('expanded', false)
            .on('click', function() {
                var exp = d3.select(this).classed('expanded');
                featureContainer.style('display', exp ? 'none' : 'block');
                d3.select(this).classed('expanded', !exp);
                d3.event.preventDefault();
            });

        var featureContainer = content
            .append('div')
            .attr('class', 'data-feature-filters')
            .style('display', 'none');

        var featureList = featureContainer
            .append('ul')
            .attr('class', 'layer-list layer-feature-list');


        context.features()
            .on('change.map_data-update', update);

        setFill(fillDefault);

        var keybinding = d3keybinding('features')
            .on(key, togglePanel)
            .on(t('area_fill.wireframe.key'), toggleWireframe)
            .on([t('background.key'), t('help.key')], hidePanel);

        d3.select(document)
            .call(keybinding);

        context.surface().on('mousedown.map_data-outside', hidePanel);
        context.container().on('mousedown.map_data-outside', hidePanel);
    }


    return map_data;
}
