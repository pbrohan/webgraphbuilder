import * as leaflet from 'leaflet';
import colours from "../colours.js";
import graph_tools from "../common/graph_tools";
import { resizeSVG} from "../common/utils";
import { set_palette} from "../common/palette";
import { add_grid, get_grid} from "../common/grid";
import { createDataLookup } from "../maps/maps";
import { getMapDataAttributes} from "../maps/config";
import { map_choose_scale_function,
         match_geojson_to_datalookup,
         validate_rows,
         validate_data_level } from "../maps/common_maps";

const VerticalLegend = graph_tools.VerticalLegend;

function make_interactive_map_if_data(map){
    const state = get_interactive_map_page_state();
    reset_map(map)
    // If user has entered data in the table, update the map
    if (state[0].length > 0) {
        return draw_interactive_map(map, ...state);
    }
}

async function draw_interactive_map(
    map,
    data,
    la_level,
    data_year,
    colour,
    colour_pair
) {
    if (validate_rows(data) == -1) {
        reset_map(map)
        return -1
    }
    const dataLookup = createDataLookup(data);
    const data_level = validate_data_level(dataLookup, la_level);
    if (data_level == -1) {
        reset_map(map)
        return -1
    }
    const { file, nameid, ecodeid } = getMapDataAttributes(data_level, data_year)
    const response = await fetch(file);
    const la_geo = await response.json();
    const dataFeatures = match_geojson_to_datalookup(la_geo, dataLookup, ecodeid);
    if (dataFeatures == -1) {
        reset_map(map)
        return -1
    }
    const scale = map_choose_scale_function(colour, colour_pair, data);
    if (scale == -1) {
        reset_map(map)
        return -1
    }
    var info = leaflet.control();
    var geojson;
    geojson = leaflet.geoJson(dataFeatures, {style: leaflet_style(scale),
                                   onEachFeature: onEachFeature,
                                    smoothFactor: 0.5}).addTo(map)

    // Highlighing functions
    function highlightFeature(e){
        var layer = e.target;

        layer.setStyle({
            weight: 0.6,
            color: '#000',
            dasyArray: '',
            fillOpacity: 0.7
        });

        layer.bringToFront();
        info.update(layer.feature.properties);

    }
    function resetHighlight(e) {
        geojson.resetStyle(e.target);
        info.update();
    }
    function zoomToFeature(e){
        map.fitBounds(e.target.getBounds());

    }
    function onEachFeature(feature, layer){
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    }

    var legend = leaflet.control({position: "bottomright"});
    legend.onAdd = function(map) {
        var div = leaflet.DomUtil.create('div', 'interactive_map_info interactive_map_legend');
        div.append(VerticalLegend(scale))
        return div
    }
    legend.addTo(map)
    // Resize legend based on size
    let legend_svg = document.querySelector(".interactive_map_info > svg");
    resizeSVG(legend_svg, 50);
    legend_svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    // Make tooltip
    info.onAdd = function(map) {
        this._div = leaflet.DomUtil.create('div', 'interactive_map_info');
        this.update();
        return this._div;
    }
    info.update = function(props) {
    this._div.innerHTML = `<span class = "govuk-body"><b>${props ? props[nameid] : "Hover over an LA"}</b> ` +
        (props && props[ecodeid] in dataLookup ? dataLookup[props[ecodeid]].data : "") + 
        "</span>";
    }
    info.addTo(map);
}

function leaflet_style(scale) {
    return function(feature) {
        let fill;
        if ("data" in feature) {
            fill = scale(feature.data.data)
        } else {
            fill = "white"
        }
        return {fillColor: fill,
            weight: 0.2,
            opactity: 1,
            color: "black",
            dashArray: "0",
            fillOpacity: 0.7}
    }
}

function reset_map(map) {
    map.eachLayer(function(layer) {
        if (layer instanceof leaflet.GeoJSON) {
            map.removeLayer(layer)
        }
    })
    document.querySelector('.interactive_map_legend')?.remove();
    document.querySelector('.interactive_map_info')?.remove();
}

function get_interactive_map_page_state() {
    const data = get_grid().getData();
    const la_level = document.getElementById("geo-level").value;
    const data_year = document.getElementById("map-year").value;
    const org_list = document.getElementById("org_list");
    const colour_selected = document.querySelector(
        ".palette-cell__selected > .palette-text"
    );
    let colour;
    let colour_pair = [0,0,0];
    if (colour_selected) {
        if (
            Object.keys(colours[org_list.value].light).includes(
                colour_selected.textContent
            )
        ) {
            colour = colours[org_list.value].light[colour_selected.textContent];
            colour_pair = colours[org_list.value].pairs_light[colour_selected.textContent];
        } else {
            colour = colours[org_list.value].primary;
        }
    } else {
        colour = colours[org_list.value].primary;
    }

    return [data, la_level, data_year, colour, colour_pair];
}

export function initInteractiveMapPage() {
    function curry_interactive_map() {
        make_interactive_map_if_data(map)
    }
    const org_list = document.getElementById("org_list");
    set_palette(org_list, curry_interactive_map);
    org_list.addEventListener("change", (event) => {
    set_palette(event.target, curry_interactive_map);
    });
    const map_settings = document.getElementById("map-settings");
    const ordinal_status = document.getElementById("ordinal-settings");

    map_settings.addEventListener("change", (event) => {
        make_interactive_map_if_data(map);
    })
    ordinal_status.addEventListener("change", (event) => {
        make_interactive_map_if_data(map)
    })

    add_grid(document.getElementById('grid'), curry_interactive_map,[
        {
          header: "Ecode",
          name: "ecode",
          editor: "text",
        },
        {
          header: "Data",
          name: "data",
          editor: "text",
        },
      ])

    // Make map
    const map = leaflet.map('map').setView([53.422, -1.8], 6);
    var tiles = leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
}