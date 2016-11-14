window.debug = window.debug || {};

(function() {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "http://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();
    data_sources.add("base", ["AssociationLZ", localBase]);
    data_sources.add("ld", ["LDLZ" ,remoteBase + "pair/LD/"]);
    data_sources.add("gene", ["GeneLZ", { url: remoteBase + "annotation/genes/", params: {source: 2} }]);
    data_sources.add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {source: 15} }])
    data_sources.add("sig", ["StaticJSON", [{ "x": 0, "y": 4.522 }, { "x": 2881033286, "y": 4.522 }] ])

    // // The old layout:
    // var layout = {
    //     responsive_size: true,
    //     panels: [
    //         {
    //             id: "panel1",
    //             data_layers: [
    //                 {
    //                 positions: {
    //                     fields: ["id", "chr", "position", "ref", "alt", "rsid", "pvalue|scinotation", "pvalue|neglog10", "maf", "ld:state"],
    //                     id_field: "id",
    //                     tooltip: {
    //                         html: "<strong>{{id}}</strong><br>" +
    //                             "<strong>{{rsid}}</strong><br>" +
    //                             "P-value: <strong>{{pvalue|scinotation}}</strong><br>" +
    //                             "MAF: <strong>{{maf}}</strong><br>" +
    //                             "<a href='/variant/{{chr}}-{{position}}-{{ref}}-{{alt}}'>PheWAS</a>"
    //                     }
    //                 }
    //             }
    //         }
    //     ]
    // };

    // // my attempt
    // var layout = {
    //     responsive_size: true,
    //     panels: [
    //         LocusZoom.Layouts.get("panel", "genes")
    //     ]
    // };

    // // almost works
    // var layout = LocusZoom.StandardLayout;

    var layout = {
        "state": {
            "association": {},
            "association.significance": {
                "highlighted": [],
                "selected": [],
                "dimmed": [],
                "hidden": []
            },
            "association.recombrate": {
                "highlighted": [],
                "selected": [],
                "dimmed": [],
                "hidden": []
            },
            "association.associationpvalues": {
                "highlighted": [],
                "selected": [],
                "dimmed": [],
                "hidden": []
            },
            "genes": {},
            "genes.genes": {
                "highlighted": [],
                "selected": [],
                "dimmed": [],
                "hidden": []
            },
            "chr": "11",
            "start": 99403901,
            "end": 99423901
        },
        "width": 800,
        "height": 450,
        "resizable": "responsive",
        "min_region_scale": 20000,
        "max_region_scale": 4000000,
        "dashboard": {
            "components": [{
                "type": "title",
                "title": "LocusZoom",
                "subtitle": "<a href=\"https://statgen.github.io/locuszoom/\" target=\"_blank\">v0.4.8</a>",
                "position": "left",
                "color": "gray"
            }, {
                "type": "dimensions",
                "position": "right",
                "color": "gray"
            }, {
                "type": "region_scale",
                "position": "right",
                "color": "gray"
            }, {
                "type": "download",
                "position": "right",
                "color": "gray"
            }]
        },
        "panels": [{
            "proportional_height": 0.5,
            "id": "association",
            "title": "",
            "width": 800,
            "height": 225,
            "min_width": 400,
            "min_height": 200,
            "proportional_width": 1,
            "margin": {
                "top": 35,
                "right": 50,
                "bottom": 40,
                "left": 50
            },
            "inner_border": "rgba(210, 210, 210, 0.85)",
            "dashboard": {
                "components": [{
                    "type": "remove_panel",
                    "position": "right",
                    "color": "red"
                }, {
                    "type": "move_panel_up",
                    "position": "right",
                    "color": "gray"
                }, {
                    "type": "move_panel_down",
                    "position": "right",
                    "color": "gray"
                }, {
                    "type": "toggle_legend",
                    "position": "right",
                    "color": "green"
                }]
            },
            "axes": {
                "x": {
                    "label_function": "chromosome",
                    "label_offset": 32,
                    "tick_format": "region",
                    "extent": "state",
                    "render": true,
                    "label": null
                },
                "y1": {
                    "label": "-log10 p-value",
                    "label_offset": 28,
                    "render": true,
                    "label_function": null
                },
                "y2": {
                    "label": "Recombination Rate (cM/Mb)",
                    "label_offset": 40,
                    "render": true,
                    "label_function": null
                }
            },
            "legend": {
                "orientation": "vertical",
                "origin": {
                    "x": 55,
                    "y": 40
                },
                "hidden": true,
                "width": 91.66200256347656,
                "height": 138,
                "padding": 5,
                "label_size": 12
            },
            "interaction": {
                "drag_background_to_pan": true,
                "drag_x_ticks_to_scale": true,
                "drag_y1_ticks_to_scale": true,
                "drag_y2_ticks_to_scale": true,
                "scroll_to_zoom": true,
                "x_linked": true,
                "y1_linked": false,
                "y2_linked": false
            },
            "data_layers": [{
                "namespace": {
                    "sig": "sig"
                },
                "id": "significance",
                "type": "line",
                "fields": ["sig:x", "sig:y"],
                "z_index": 0,
                "style": {
                    "stroke": "#D3D3D3",
                    "stroke-width": "3px",
                    "stroke-dasharray": "10px 10px",
                    "fill": "none"
                },
                "x_axis": {
                    "field": "sig:x",
                    "decoupled": true,
                    "axis": 1
                },
                "y_axis": {
                    "axis": 1,
                    "field": "sig:y"
                },
                "interpolate": "linear",
                "hitarea_width": 5
            }, {
                "namespace": {
                    "recomb": "recomb"
                },
                "id": "recombrate",
                "type": "line",
                "fields": ["recomb:position", "recomb:recomb_rate"],
                "z_index": 1,
                "style": {
                    "stroke": "#0000FF",
                    "stroke-width": "1.5px",
                    "fill": "none"
                },
                "x_axis": {
                    "field": "recomb:position",
                    "axis": 1
                },
                "y_axis": {
                    "axis": 2,
                    "field": "recomb:recomb_rate",
                    "floor": 0,
                    "ceiling": 100
                },
                "transition": {
                    "duration": 200
                },
                "interpolate": "linear",
                "hitarea_width": 5
            }, {
                "namespace": {
                    "default": "",
                    "ld": "ld"
                },
                "id": "associationpvalues",
                "type": "scatter",
                "point_shape": {
                    "scale_function": "if",
                    "field": "ld:isrefvar",
                    "parameters": {
                        "field_value": 1,
                        "then": "diamond",
                        "else": "circle"
                    }
                },
                "point_size": {
                    "scale_function": "if",
                    "field": "ld:isrefvar",
                    "parameters": {
                        "field_value": 1,
                        "then": 80,
                        "else": 40
                    }
                },
                "color": [{
                    "scale_function": "if",
                    "field": "ld:isrefvar",
                    "parameters": {
                        "field_value": 1,
                        "then": "#9632b8"
                    }
                }, {
                    "scale_function": "numerical_bin",
                    "field": "ld:state",
                    "parameters": {
                        "breaks": [0, 0.2, 0.4, 0.6, 0.8],
                        "values": ["#357ebd", "#46b8da", "#5cb85c", "#eea236", "#d43f3a"]
                    }
                }, "#B8B8B8"],
                "legend": [{
                    "shape": "diamond",
                    "color": "#9632b8",
                    "size": 40,
                    "label": "LD Ref Var",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "circle",
                    "color": "#d43f3a",
                    "size": 40,
                    "label": "1.0 > r² ≥ 0.8",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "circle",
                    "color": "#eea236",
                    "size": 40,
                    "label": "0.8 > r² ≥ 0.6",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "circle",
                    "color": "#5cb85c",
                    "size": 40,
                    "label": "0.6 > r² ≥ 0.4",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "circle",
                    "color": "#46b8da",
                    "size": 40,
                    "label": "0.4 > r² ≥ 0.2",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "circle",
                    "color": "#357ebd",
                    "size": 40,
                    "label": "0.2 > r² ≥ 0.0",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "circle",
                    "color": "#B8B8B8",
                    "size": 40,
                    "label": "no r² data",
                    "class": "lz-data_layer-scatter"
                }],

                // fields: ["id", "chr", "position", "ref", "alt", "rsid", "pvalue|scinotation", "pvalue|neglog10", "maf", "ld:state"],
                // id_field: "id",
                // tooltip: {
                //     html: "<strong>{{id}}</strong><br>" +
                //         "<strong>{{rsid}}</strong><br>" +
                //         "P-value: <strong>{{pvalue|scinotation}}</strong><br>" +
                //         "MAF: <strong>{{maf}}</strong><br>" +
                //         "<a href='/variant/{{chr}}-{{position}}-{{ref}}-{{alt}}'>PheWAS</a>"
                // },

               "fields": ["variant", "position", "pvalue", "pvalue|scinotation", "pvalue|neglog10", "log_pvalue", "log_pvalue|logtoscinotation", "ref_allele", "ld:state", "ld:isrefvar"],
               "id_field": "variant",
                "tooltip": {
                    "closable": true,
                    "show": {
                        "or": ["highlighted", "selected"]
                    },
                    "hide": {
                        "and": ["unhighlighted", "unselected"]
                    },
                    "html": "<strong>{{variant}}</strong><br>P Value: <strong>{{log_pvalue|logtoscinotation}}</strong><br>Ref. Allele: <strong>{{ref_allele}}</strong><br>"
                },

                "z_index": 2,
                "x_axis": {
                    "field": "position",
                    "axis": 1
                },
                "y_axis": {
                    "axis": 1,
                    "field": "log_pvalue",
                    "floor": 0,
                    "upper_buffer": 0.1,
                    "min_extent": [0, 10]
                },
                "transition": {
                    "duration": 200
                },
                "highlighted": {
                    "onmouseover": "on",
                    "onmouseout": "off"
                },
                "selected": {
                    "onclick": "toggle_exclusive",
                    "onshiftclick": "toggle"
                }
            }],
            "description": null,
            "y_index": 0,
            "origin": {
                "x": 0,
                "y": 0
            },
            "proportional_origin": {
                "x": 0,
                "y": 0
            },
            "background_click": "clear_selections",
            "cliparea": {
                "height": 150,
                "width": 700,
                "origin": {
                    "x": 50,
                    "y": 35
                }
            }
        }, {
            "proportional_height": 0.5,
            "id": "genes",
            "width": 800,
            "height": 225,
            "min_width": 400,
            "min_height": 112.5,
            "proportional_width": 1,
            "margin": {
                "top": 20,
                "right": 50,
                "bottom": 20,
                "left": 50
            },
            "axes": {
                "x": {
                    "render": false
                },
                "y1": {
                    "render": false
                },
                "y2": {
                    "render": false
                }
            },
            "interaction": {
                "drag_background_to_pan": true,
                "scroll_to_zoom": true,
                "x_linked": true,
                "drag_x_ticks_to_scale": false,
                "drag_y1_ticks_to_scale": false,
                "drag_y2_ticks_to_scale": false,
                "y1_linked": false,
                "y2_linked": false
            },
            "dashboard": {
                "components": [{
                    "type": "remove_panel",
                    "position": "right",
                    "color": "red"
                }, {
                    "type": "move_panel_up",
                    "position": "right",
                    "color": "gray"
                }, {
                    "type": "move_panel_down",
                    "position": "right",
                    "color": "gray"
                }, {
                    "type": "resize_to_data",
                    "position": "right",
                    "color": "blue"
                }]
            },
            "data_layers": [{
                "namespace": {
                    "gene": "gene",
                    "constraint": "constraint"
                },
                "id": "genes",
                "type": "genes",
                "fields": ["gene:gene", "constraint:constraint"],
                "id_field": "gene_id",
                "highlighted": {
                    "onmouseover": "on",
                    "onmouseout": "off"
                },
                "selected": {
                    "onclick": "toggle_exclusive",
                    "onshiftclick": "toggle"
                },
                "transition": {
                    "duration": 200
                },
                "tooltip": {
                    "closable": true,
                    "show": {
                        "or": ["highlighted", "selected"]
                    },
                    "hide": {
                        "and": ["unhighlighted", "unselected"]
                    },
                    "html": "<h4><strong><i>{{gene_name}}</i></strong></h4><div style=\"float: left;\">Gene ID: <strong>{{gene_id}}</strong></div><div style=\"float: right;\">Transcript ID: <strong>{{transcript_id}}</strong></div><div style=\"clear: both;\"></div><table><tr><th>Constraint</th><th>Expected variants</th><th>Observed variants</th><th>Const. Metric</th></tr><tr><td>Synonymous</td><td>{{exp_syn}}</td><td>{{n_syn}}</td><td>z = {{syn_z}}</td></tr><tr><td>Missense</td><td>{{exp_mis}}</td><td>{{n_mis}}</td><td>z = {{mis_z}}</td></tr><tr><td>LoF</td><td>{{exp_lof}}</td><td>{{n_lof}}</td><td>pLI = {{pLI}}</td></tr></table><table width=\"100%\"><tr><td><button onclick=\"LocusZoom.getToolTipPlot(this).panel_ids_by_y_index.forEach(function(panel){ if(panel == 'genes'){ return; } var filters = (panel.indexOf('intervals') != -1 ? [['intervals:start','>=','{{start}}'],['intervals:end','<=','{{end}}']] : [['position','>','{{start}}'],['position','<','{{end}}']]); LocusZoom.getToolTipPlot(this).panels[panel].undimElementsByFilters(filters, true); }.bind(this)); LocusZoom.getToolTipPanel(this).data_layers.genes.unselectAllElements();\">Identify data in region</button></td><td style=\"text-align: right;\"><a href=\"http://exac.broadinstitute.org/gene/{{gene_id}}\" target=\"_new\">More data on ExAC</a></td></tr></table>"
                },
                "label_font_size": 12,
                "label_exon_spacing": 4,
                "exon_height": 16,
                "bounding_box_padding": 6,
                "track_vertical_spacing": 10,
                "hover_element": "bounding_box",
                "x_axis": {
                    "axis": 1
                },
                "y_axis": {
                    "axis": 1
                },
                "z_index": 0
            }],
            "title": null,
            "description": null,
            "y_index": 1,
            "origin": {
                "x": 0,
                "y": 225
            },
            "proportional_origin": {
                "x": 0,
                "y": 0.5
            },
            "background_click": "clear_selections",
            "cliparea": {
                "height": 185,
                "width": 700,
                "origin": {
                    "x": 50,
                    "y": 20
                }
            },
            "legend": null
        }],
        "min_width": 400,
        "min_height": 400,
        "responsive_resize": false,
        "aspect_ratio": 1.7777777777777777,
        "panel_boundaries": true
    }

    window.debug.data_sources = data_sources;
    window.debug.layout = layout;
    $(function() {
        // Populate the div with a LocusZoom plot using the default layout
        window.debug.plot = LocusZoom.populate("#lz-1", data_sources, layout);

        // $('#move-left').on('click', function() { move(-0.5); });
        // $('#move-left-fast').on('click', function() { move(-1.5); });
        // $('#move-right').on('click', function() { move(0.5); });
        // $('#move-right-fast').on('click', function() { move(1.5); });
        // $('#zoom-out').on('click', function() { zoom(2); });
        // $('#zoom-in').on('click', function() { zoom(0.5); });
    });

    // function move(direction) {
    //     // 1 means right, -1 means left.
    //     var start = window.plot.state.start;
    //     var end = window.plot.state.end;
    //     var shift = Math.floor((end - start) / 2) * direction;
    //     window.plot.applyState({
    //         chr: window.plot.state.chr,
    //         start: start + shift,
    //         end: end + shift
    //     });
    // }

    // function zoom(length_ratio) {
    //     // 2 means bigger view, 0.5 means zoom in.
    //     var start = window.plot.state.start;
    //     var end = window.plot.state.end;
    //     var center = (end + start) / 2;
    //     start = Math.floor(center + (start - center) * length_ratio);
    //     start = Math.max(0, start);
    //     end = Math.floor(center + (end - center) * length_ratio);
    //     window.plot.applyState({
    //         chr: window.plot.state.chr,
    //         start: start,
    //         end: end,
    //     });
    // }

})();
