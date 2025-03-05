import { leaflet, colours, data_check, msgBox } from "/bundle.js";
import { get_data_level } from "../common/utils.js"
import { set_palette } from "../common/palette.js";
import { add_grid, get_grid, get_table_range } from "../common/grid.js";
import { createDataLookup } from "./maps.js";
import { createTable } from "../common/errorbox.js";
import { getMapDataAttributes } from "./config.js";
const check_duplicate_rows = data_check.check_duplicate_rows;
const DuplicateRow = data_check.DuplicateRow;
const EcodeParseError = data_check.EcodeParseError;

function make_interactive_map_if_data(map, legend){
    const state = get_interactive_map_page_state();
    reset_map(map, legend)
    // If user has entered data in the table, update the map
    if (state[0].length > 0) {
        return draw_interactive_map(map, legend, ...state);
    }
}

async function draw_interactive_map(
    map,
    legend,
    data,
    la_level,
    data_year,
    colour
) {
    if (validate_rows(data) == -1) {
        reset_map(map, legend)
        return -1
    }
    const dataLookup = createDataLookup(data);
    const data_level = validate_data_level(dataLookup, la_level);
    if (data_level == -1) {
        reset_map(map, legend)
        return -1
    }
    const { file, nameid, ecodeid } = getMapDataAttributes(data_level, data_year)
    const response = await fetch(file);
    const la_geo = await response.json();
    const dataFeatures = match_geojson_to_datalookup(la_geo, dataLookup, ecodeid);
    if (dataFeatures == -1) {
        reset_map(map, legend)
        return -1
    }
    console.log("boop");
    leaflet.geoJson(dataFeatures).addTo(map)
}

function leaflet_style() {
    return {fillColor: "blue",
            weight: 1,
            opactity: 1,
            color: "black",
            dashArray: "0",
            fillOpacity: 0.7
    }
}

function match_geojson_to_datalookup(geojson, dataLookup, ecodeid) {
    const usedKeys = new Set();
    const dataFeatures = geojson.features.flatMap((feature) => {
        const matchedData = dataLookup[feature.properties[ecodeid]];
        if (matchedData) {
            usedKeys.add(feature.properties[ecodeid]);
            return { ... feature, data: { ...matchedData } };
        } else {
            return feature
        }
    });

    const unmatchedEcodes = Object.keys(dataLookup).filter(
        (key) => !usedKeys.has(key)
    );
    if (unmatchedEcodes.length > 0) {
        const lst = document.createElement("ul");
        for (let r in unmatchedEcodes) {
            const el = document.createElement("li");
            el.textContent = unmatchedEcodes[r];
            lst.appendChild(el);
        }
        const errorbox = document.createElement("div");
        const text = document.createElement("p");
        text.textContent = "You have entered unrecognised Ecode(s)";
        errorbox.appendChild(text);
        errorbox.appendChild(lst);
        msgBox("Unrecognised Ecode(s", errorbox);
        return -1
    }
    return dataFeatures;
}

function validate_rows(data) {
    try {
        check_duplicate_rows(data, "ecode");
    } catch (error) {
        if (error instanceof DuplicateRow) {
            const lst = document.createElement("ul");
            for (let r in error.rows) {
                const el = document.createElement("li");
                el.textContent = error.rows[r];
                lst.appendChild(el);
            }
            const errorbox = document.createElement("div");
            const text = document.createElement("p");
            text.textContent = "You have entered duplicate Ecodes";
            errorbox.appendChild(text);
            errorbox.appendChild(lst);
            msgBox("Duplicate Ecode", errorbox);
            return -1;
        }
    }
    return 1
}
function validate_data_level(dataLookup, la_level){
    var data_level
    try {
        data_level = get_data_level(dataLookup, la_level);
    } catch(error) {
        if (error instanceof EcodeParseError) {
            const tbl = createTable(error.ecodes);
            const errorbox = document.createElement("div");
            const text = document.createElement("p");
            text.textContent = 
                "You have entered Ecodes from both counties and districts";
            errorbox.appendChild(text);
            errorbox.appendChild(tbl);
            msgBox("Ecode Error", errorbox);
            return -1;
        }
    }
    return data_level
}

function reset_map(map, legend) {
    map.eachLayer(function(layer) {
        if (layer instanceof leaflet.GeoJSON) {
            map.removeLayer(layer)
        }
    })
    if (legend) {
        legend.remove();
        map.removeControl(legend);
    }
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
    if (colour_selected) {
        if (
            Object.keys(colours[org_list.value].light).includes(
                colour_selected.textContent
            )
        ) {
            colour = colours[org_list.value].light[colour_selected.textContent];
        } else {
            colour = colours[org_list.value].primary;
        }
    } else {
        colour = colours[org_list.value].primary;
    }

    return [data, la_level, data_year, colour];
}

export function initInteractiveMapPage() {
    function curry_interactive_map() {
        make_interactive_map_if_data(map, legend)
    }
    const org_list = document.getElementById("org_list");
    set_palette(org_list, curry_interactive_map);
    org_list.addEventListener("change", (event) => {
    set_palette(event.target, curry_interactive_map);
    });
    const map_settings = document.getElementById("map-settings");
    const ordinal_status = document.getElementById("ordinal-settings");
    var legend;


    map_settings.addEventListener("change", (event) => {
        make_interactive_map_if_data(map, legend);
    })
    ordinal_status.addEventListener("change", (event) => {
        make_interactive_map_if_data(map, legend)
    })

    add_grid(document.getElementById('grid'), curry_interactive_map)

    const map = leaflet.map('map').setView([53.422, -1.8], 6);
    var tiles = leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

}