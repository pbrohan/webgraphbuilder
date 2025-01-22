  // Declare the chart dimensions and margins.

  // map ratio is 277.61 x 424.52

import {d3, Grid, data_check} from '/bundle.js';

// Default data
const w = 266.61*1.2;
const h = 424.52*1.2;

const width = w + 20;
const height = h + 20;
const marginTop = 200;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;

const map_loc = "/assets/maps/"
const map_data = {
    "district" : {'2024': {"file": "LAD_2024.geojson",
                    "nameid": "LAD24NM",
                    "ecodeid": "LAD24CD"},
                '2023': {"file": "LAD_2024.geojson",
                        "nameid": "LAD24NM",
                        "ecodeid": "LAD24CD"},
                },
    "county" : {'2024': {"file": "CTY_2023.geojson",
                        "nameid": "CTYUA23NM",
                        "ecodeid": "CTYUA23CD"},
                '2023': {"file": "CTY_2023.geojson",
                    "nameid": "CTYUA23NM",
                    "ecodeid": "CTYUA23CD"},
                }
}
// instance of data table
let data_table;

/**
 * Adds an input table to page as child of container
 * Probably want to move to bundle
 * @param {HTMLElement} container 
 */
function add_grid(container){
    data_table = new Grid({
        usageStatistics: false, // Don't use google analytics
        el: container,
        scrollX : false,
        scrollY : true,
        columns : [
            {
                header : 'Ecode',
                name : 'ecode',
                editor : 'text',
            },
            {
                header : 'Data',
                name : 'data',
                editor : 'text'
            },
        ],
        data: []
    });

    data_table.on('afterChange', function() {draw_map(
        document.getElementById('map'), width, height, ...get_map_page_state()
    );});
}

function get_map_page_state() {
    const data = data_table.getData();
    const la_level = document.getElementById('map-type').value;
    const data_year = document.getElementById('map-year').value;
    // Currently this isn't the value of the checkbox
    const inset = document.getElementById('london-inset').value;
    return [data, la_level, data_year, inset]
}


/**
 * Draws a map using data from the accompanying table
 * @param {HTMLElement} container 
 * @param {object} data 
 * @param {string} la_level
 * @param {number} data_year
 * @param {boolean} inset 
 * @returns {null}
 */
function draw_map(container, width, height, data, la_level, data_year, inset){
    const path = setupMapProjection();
    const svg = createSvgElement(width, height);
    const dataLookup = createDataLookup(data);
    const data_level = getDataLevel(dataLookup, la_level);
    const { file, name_id, ecodeid } = getMapDataAttributes(data_level, data_year)

    // create the scale (should be custom)
    const linearscale = d3.scaleSequential(get_table_range(data), d3.interpolateBlues)
    downloadAndProcessMapData(file, path, dataLookup, ecodeid, linearscale, svg);

    // Append the SVG element.
    container.innerHTML = "";
    container.append(svg.node());
}

function setupMapProjection() {
    // Define map scale, projection and location
    return d3.geoPath(d3.geoMercator()
        .center([9, 54])
        .scale(1700));

}

function createSvgElement(width, height) {
    return d3.create("svg")
        .attr("width", width)
        .attr("height", height)
    
}

function createDataLookup(data) {
    // Create a lookup table for data by ecode
    return Object.fromEntries(
        data.map(line => [
            line.ecode.trim(),
            Object.fromEntries(
                Object.entries(line).map(([key, value]) =>
                typeof value === 'string' ? [key, value.trim()] : [key, value])
            )
        ])
    );
}

function getDataLevel(dataLookup, la_level) {
        // Check and see what kind of data we're looking at
        var data_level = data_check.guess_region_type(dataLookup);
    
        // If the data level is null (there's no identifying data)
        // then use the user-chosen level
        if (data_level === null){
            data_level = la_level;
        // if the data level is different from the one set by the user
        // change the drop-down menu
        } else if (data_level != la_level){
            // This should probably be an event to tell the user something has change
            // but for now
            document.getElementById("map-type").value = data_level
        }

        return data_level
}

function get_table_range(data) {
    var min = 0, max = 0;
    for (let d in data) {
      let val = parseFloat(data[d].data)
      if (val < min) {
        min = val;
      }
      if (val > max) {
        max = val;
      }
    }
    return [min, max]
  }

function getMapDataAttributes(data_level, data_year) {
    const map_info = map_data[data_level][data_year];
    return {
        file: map_loc + map_info.file,
        nameid: map_info.nameid,
        ecodeid: map_info.ecodeid
    };
}

function downloadAndProcessMapData(file, path, dataLookup, ecodeid, linearscale, svg) {
    console.log(ecodeid)
    d3.json(file).then(map => {
        const validFeatures = map.features
            .filter(feature => in_bounds(path, feature))
            .flatMap(feature => {
                const matchedData = dataLookup[feature.properties[ecodeid]];
                if (matchedData) {
                    return { ...feature, data: { ...matchedData } };
                } else {
                    return feature;
                }
            });
        drawMap(validFeatures, path, linearscale, svg)
    });
}

function drawMap(features, path, linearscale, svg){
    console.log(features)
    svg.append("g")
        .selectAll("path")
        .data(features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("stroke-width", 1)
        .style("stroke", "#000")
        .style("fill", d => {
            if ('data' in d) {
                return linearscale(d.data.data);
            } else {
                return "none";
            }
        });
}


export function initMapPage() {
    add_grid(document.getElementById('grid'));
};

// Check if a feature is in bounds (this is the source of much jank and points
// to a more fundamental problem with the geojson files that I should fix later)
function in_bounds(path, feature) {
    const bounds = path.bounds(feature)
    if (bounds[0][0] < 0 | bounds[0][1] < 0) {
    return false
    }
    if (bounds[1][0] > 1024 | bounds[1][1] > 1024) {
    return false
    }
    if (!(bounds.every((point) => point.every((coordinate) => isFinite(coordinate))))) {
    return false
    }
    return true
};