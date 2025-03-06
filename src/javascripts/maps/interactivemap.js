import { leaflet, colours, data_check, msgBox, graph_tools, d3} from "/bundle.js";
// Not thrilled with the d3 import here. It's only used for d3.scaleSequential
// but tbf the entire bundle is already imported
import { get_data_level, resizeSVG} from "../common/utils.js"
import { set_palette, get_palette } from "../common/palette.js";
import { add_grid, get_grid, get_table_range } from "../common/grid.js";
import { createDataLookup } from "./maps.js";
import { createTable } from "../common/errorbox.js";
import { getMapDataAttributes} from "./config.js";

const VerticalLegend = graph_tools.VerticalLegend;
const check_duplicate_rows = data_check.check_duplicate_rows;
const DuplicateRow = data_check.DuplicateRow;
const EcodeParseError = data_check.EcodeParseError;

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
    colour
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
    const scale = map_choose_scale_function(colour, data);
    if (scale == -1) {
        reset_map(map)
        return -1
    }
    var info = leaflet.control();
    var geojson;
    geojson = leaflet.geoJson(dataFeatures, {style: leaflet_style(scale),
                                   onEachFeature: onEachFeature}).addTo(map)

    // Highlighing functions
    function highlightFeature(e){
        var layer = e.target;

        layer.setStyle({
            weight: 3,
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

export function map_choose_scale_function(colour, data){
      // create the scale
  let scale;
  let uniques;
  // In the future this should be moved to get_map_page_state
  const org_list = document.getElementById("org_list");
  const palette = get_palette(org_list);
  // For now everyone needs to use the light colours
  const palette_size = Object.keys(palette.light).length;
  const palette_elements = [...document.querySelectorAll(".palette-cell")];
  // This is very inefficient
  palette_elements.forEach((cell) => {
    cell.classList.remove("palette-cell__disabled");
  });
  switch (data_check.guess_data_type(data)) {
    case "float":
      scale = d3.scaleSequential(
        get_table_range(data),
        d3.interpolate("rgb(0,0,0)", `rgb(${colour.join(",")})`)
      );
      break;
    case "integer":
      scale = d3.scaleSequential(
        get_table_range(data),
        d3.interpolate("rgb(0,0,0)", `rgb(${colour.join(",")})`)
      );
      break;
    case "string":
      uniques = data_check.get_data_uniques(data);
      if (uniques.size <= palette_size) {
        // This is definitely discrete. Should:
        // 1 - Check if there are < 10 levels
        // 2 - If so ask if they're ordered
        // 3 - Make a scale based on the palette
        // palette scale
        // Get ordinal setting
        const ordinalSetting = document.querySelector(
          'input[name="ordinal-state"]:checked'
        ).value;
        if (ordinalSetting == "unordered") {
          scale = d3.scaleOrdinal(
            [...uniques],
            Object.values(palette.light).map(
              (colour) => `rgb(${colour.join(",")})`
            )
          );
          // soft disable the palette
          palette_elements.forEach((cell) => {
            cell.classList.add("palette-cell__disabled");
          });
        } else {
          // ordered scale
          scale = d3.scaleOrdinal(
            [...uniques],
            Array.from({ length: uniques.size }, (_, i) =>
              d3.interpolate(
                "rgb(0,0,0)",
                `rgb(${colour.join(",")})`
              )((i + 1) / (uniques.size + 1))
            )
          );
        }
      } else {
        // Message the user and tell them that they have too many levels
        const lst = document.createElement("ul");
        const unique_array = [...uniques];
        for (let r in unique_array) {
          const el = document.createElement("li");
          el.textContent = unique_array[r];
          lst.appendChild(el);
        }
        const errorbox = document.createElement("div");
        const text = document.createElement("p");
        text.textContent = `Cannot graph ordinal data with more than ${palette_size} levels. You have ${uniques.size}.`;
        errorbox.appendChild(text);
        errorbox.appendChild(lst);
        msgBox("Too many ordinal levels", errorbox);
        return -1;
      }
  }
  return scale
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
            weight: 1,
            opactity: 1,
            color: "black",
            dashArray: "0",
            fillOpacity: 0.7}
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

    add_grid(document.getElementById('grid'), curry_interactive_map)

    // Make map
    const map = leaflet.map('map').setView([53.422, -1.8], 6);
    var tiles = leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
}