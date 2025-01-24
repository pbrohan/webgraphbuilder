  // Declare the chart dimensions and margins.

  // map ratio is 277.61 x 424.52

import {d3, Grid, data_check, graph_tools, msgBox} from '/bundle.js';

// Default data
const w = 266.61*3;
const h = 424.52*2;
const mapscale = 2800;
const mapcentre = [0, 57];
const linewidth = 0.2;

const london_mapscale = 12000;
const london_mapcentre = [-0.62, 52.15];
const london_bounding_box_padding = 0.1;

const shetland_mapscale = 3000;
const shetland_mapcentre = [-3.6, 59.5];
const shetland_bounding_box_padding = 0.1;

const marginLeft = 20;
const width = w + marginLeft;
const height = h + 20;
const marginTop = 200;
const marginRight = 20;
const marginBottom = 30;


const legend_offset = [4 * marginLeft, h * 7/10]
const legend_settings = {
    height: 200,
    width: 60
  };


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
    const inset = {"london": document.getElementById('london-inset').checked,
                   "shetland": document.getElementById('shetland-inset').checked,
     };
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
    let data_level
    try {
    data_level = getDataLevel(dataLookup, la_level);
    } catch (error) {
        if (error instanceof data_check.EcodeParseError) {
            msgBox("Ecode Error", "You have entered Ecodes from both counties and districts")
        }
        return 0;
    }
    const { file, name_id, ecodeid } = getMapDataAttributes(data_level, data_year)

    // create the scale (should be custom)
    const linearscale = d3.scaleSequential(get_table_range(data), d3.interpolateBlues)
    downloadAndProcessMapData(file, path, dataLookup, ecodeid, linearscale, svg, inset);

    svg.append("g")
        .attr("transform", `translate(${legend_offset[0]}, ${legend_offset[1]})`)
        .append(() =>  graph_tools.VerticalLegend(linearscale, legend_settings))
        .call(g => g.selectAll(".tick text")
                .style('font-size', "1rem")
                .attr("color", "0b0c0c")
                .attr("font-family", "arial"));

    // Append the SVG element.
    container.innerHTML = "";
    container.append(svg.node());

};
function setupMapProjection() {
    // Define map scale, projection and location
    return d3.geoPath(d3.geoMercator()
        .center(mapcentre)
        .scale(mapscale));

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

function downloadAndProcessMapData(file, path, dataLookup, ecodeid, linearscale, svg, inset) {
    d3.json(file).then(map => {
        const dataFeatures = map.features
            .flatMap(feature => {
                const matchedData = dataLookup[feature.properties[ecodeid]];
                if (matchedData) {
                    return { ...feature, data: { ...matchedData } };
                } else {
                    return feature;
                }
            });
        drawMap(dataFeatures.filter(feature => in_bounds(path, feature)),
                path,
                linearscale,
                svg)

        if (inset.london) {
            const londonFeatures = dataFeatures.filter(feature => {
                const ecode = feature.properties[ecodeid];
                return ecode && ecode.startsWith("E090");
            })
            addInset(londonFeatures,
                linearscale,
                london_mapcentre,
                london_mapscale,
                london_bounding_box_padding,
                svg
            );
        }
        if (inset.shetland) {
            const shetlandFeatures = dataFeatures.filter(feature => {
                const ecode = feature.properties[ecodeid];
                return ecode && ecode.startsWith("S12000027");
            })
            addInset(shetlandFeatures,
                linearscale,
                shetland_mapcentre,
                shetland_mapscale,
                shetland_bounding_box_padding,
                svg
            );
        }
    });
}

function drawMap(features, path, linearscale, svg){
    svg.append("g")
        .selectAll("path")
        .data(features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("stroke-width", linewidth)
        .style("stroke", "#000")
        .style("fill", d => {
            if ('data' in d) {
                return linearscale(d.data.data);
            } else {
                return "none";
            }
        });
}




function addInset(features, linearscale, mapcentre, mapscale, padding, svg){
    const path = d3.geoPath(d3.geoMercator()
            .center(mapcentre)
            .scale(mapscale));
   
    // get bounds of inset
    var bounds = [[Infinity,Infinity],[0,0]];
    for (let feature of features) {
        const featurebounds = path.bounds(feature);
        // Surely there's some better way to write this
        if (bounds[0][0] > featurebounds[0][0]) {
            bounds[0][0] = featurebounds[0][0];
        }
        if (bounds[0][1] > featurebounds[0][1]) {
            bounds[0][1] = featurebounds[0][1];
        }
        if (bounds[1][0] < featurebounds[1][0]) {
            bounds[1][0] = featurebounds[1][0];
        }
        if (bounds[1][1] < featurebounds[1][1]) {
            bounds[1][1] = featurebounds[1][1]
        }
    }
    // Add padding
    let center = [(bounds[0][0] + bounds[1][0]) * 0.5,
                   (bounds[0][1] + bounds[1][1]) * 0.5]

    // Again, surely a better way
    bounds[0][0] = bounds[0][0] + (bounds[0][0] - center[0]) * padding;
    bounds[0][1] = bounds[0][1] + (bounds[0][1] - center[1]) * padding;
    bounds[1][0] = bounds[1][0] + (bounds[1][0] - center[0]) * padding;
    bounds[1][1] = bounds[1][1] + (bounds[1][1] - center[1]) * padding;

    // draw inset
    svg.append("g")
        .selectAll("path")
        .data(features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("stroke-width", linewidth)
        .style("stroke", "#000")
        .style("fill", d => {
            if ('data' in d) {
                return linearscale(d.data.data);
            } else {
                return "none";
            }
        });


    // draw a square around inset
    svg.append("rect")
        .attr("x", bounds[0][0])
        .attr("y", bounds[0][1])
        .attr('width', bounds[1][0] - bounds[0][0])
        .attr('height', bounds[1][1] - bounds[0][1])
        .style("stroke", "#000")
        .style("fill", "none")
}

// Check if a feature is in bounds (this is the source of much jank and points
// to a more fundamental problem with the geojson files that I should fix later)
function in_bounds(path, feature) {
    const bounds = path.bounds(feature)
    if (bounds[0][0] < 0 | bounds[0][1] < 0) {
    return false
    }
    if (bounds[1][0] > width | bounds[1][1] > height) {
    return false
    }
    if (!(bounds.every((point) => point.every((coordinate) => isFinite(coordinate))))) {
    return false
    }
    return true
};

export function initMapPage() {
    add_grid(document.getElementById('grid'));

        const map_settings = document.getElementById("map-settings");

        map_settings.addEventListener("change", (event) => {
            const state = get_map_page_state();
            // If user has entered data in the table, draw the map
            if (state[0].length > 0) {
                
                draw_map(
                    document.getElementById('map'), width, height, ...state
                );
            };

        });

        document.getElementById("map-dl").addEventListener("click", () => {
            console.log(document.querySelector('#map > svg'));
            graph_tools.download_svg(document.querySelector('#map > svg'))})
};
