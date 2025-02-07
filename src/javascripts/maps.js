  // Declare the chart dimensions and margins.

  // map ratio is 277.61 x 424.52

import {d3, Grid, data_check, graph_tools, msgBox, colours} from '/bundle.js';

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
    const inset = {"london": document.getElementById('london-inset').checked,
                   "shetland": document.getElementById('shetland-inset').checked,
     };
    // find out which palette is selected and use the text from that as the key
    const org_list = document.getElementById("org_list");
    const colour_selected = document.querySelector(
        ".palette-cell__selected > .palette-text")
    // Check that the colour name is valid, else pick the primary colour
    let colour;
    if ( colour_selected ) {
        if (Object.keys(colours[org_list.value].light).includes(colour_selected.textContent)) {
            colour = colours[org_list.value].light[colour_selected.textContent];
        } else {
            colour = colours[org_list.value].primary;
        }
    } else {
            colour = colours[org_list.value].primary;
        }

    return [data, la_level, data_year, inset, colour]
    }

/**
 * Function to create a table element in memory
 * @param {Object} data - The object containing the table data
 * @returns {HTMLTableElement} - The generated table element
 */
function createTable(data) {
    const table = document.createElement('table');
    
    // Create the table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(data).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Find the longest array length
    const maxRows = Math.max(...Object.values(data).map(arr => arr.length));

    // Create the table body
    const tbody = document.createElement('tbody');
    for (let i = 0; i < maxRows; i++) {
        const row = document.createElement('tr');
        Object.keys(data).forEach(key => {
        const cell = document.createElement('td');
        cell.textContent = data[key][i] !== undefined ? data[key][i] : ''; // Fill with empty string if no value
        row.appendChild(cell);
        });
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    return table; // Return the table element
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
function draw_map(container, width, height, data, la_level, data_year, inset, colour){
    const path = setupMapProjection();
    const svg = createSvgElement(width, height);
    const dataLookup = createDataLookup(data);
    let data_level
    container.innerHTML = "";
    // Find duplicate rows
    try{
        data_check.check_duplicate_rows(data, "ecode");
    } catch (error) {
        if (error instanceof data_check.DuplicateRow) {
            const lst = document.createElement("ul");
            for (let r in error.rows){
                const el = document.createElement("li");
                el.textContent = error.rows[r];
                lst.appendChild(el);
            }
            const errorbox = document.createElement('div');
            const text = document.createElement('p')
                text.textContent = "You have entered duplicate Ecodes";
            errorbox.appendChild(text);
            errorbox.appendChild(lst);
            msgBox("Duplicate Ecode", errorbox);
            container.innerHTML = "";
            return -1;
        }
    }

    try {
    data_level = getDataLevel(dataLookup, la_level);
    } catch (error) {
        if (error instanceof data_check.EcodeParseError) {
            const tbl = createTable(error.ecodes);
            const errorbox = document.createElement('div')
            const text = document.createElement('p')
                text.textContent = "You have entered Ecodes from both counties and districts"
            errorbox.appendChild(text);
            errorbox.appendChild(tbl);
            msgBox("Ecode Error", errorbox)
            container.innerHTML = "";
        }
        return 0;
    }
    const { file, nameid, ecodeid } = getMapDataAttributes(data_level, data_year)

    // create the scale (should be custom)
    const linearscale = d3.scaleSequential(get_table_range(data), d3.interpolate(
        "rbg(0,0,0)", "rgb(" + colour[0] +"," + colour[1] + "," + colour[2], ")"
    ))
    downloadAndProcessMapData(file, path, dataLookup, ecodeid, nameid, linearscale, svg, inset, container);

    svg.append("g")
        .attr("transform", `translate(${legend_offset[0]}, ${legend_offset[1]})`)
        .append(() =>  graph_tools.VerticalLegend(linearscale, legend_settings))
        .call(g => g.selectAll(".tick text")
                .style('font-size', "1rem")
                .attr("color", "0b0c0c")
                .attr("font-family", "arial"));

    // Append the SVG element.
    container.append(svg.node());

};
function setupMapProjection() {
    // Define map scale, projection and location
    return d3.geoPath(d3.geoMercator()
        .center(mapcentre)
        .scale(mapscale)
        .clipExtent([[0,0], [width, height]]));

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



function downloadAndProcessMapData(file, path, dataLookup, ecodeid, nameid, linearscale, svg, inset, container) {
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

        // Make tooltip
        const tooltip = document.createElement("div");
        tooltip.classList.add("map-tooltip");
        container.appendChild(tooltip);
        
        drawMap(dataFeatures,
                path,
                linearscale,
                svg,
                nameid,
                tooltip)

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
                svg,
                nameid,
                tooltip
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
                svg,
                nameid,
                tooltip
            );
        }
    });
}

function drawMap(features, path, linearscale, svg, nameid, tooltip){
    svg.append("g")
        .selectAll("path")
        .data(features)
        .enter()
        .append("path")
        .attr("d", d => {
            let p = path(d)
            if (p) p = removeExtraBox(p, width, height);
            return p;
            })
        .style("stroke-width", linewidth)
        .style("stroke", "#000")
        .style("fill", d => {
            if ('data' in d) {
                return linearscale(d.data.data);
            } else {
                return "white";
            }
        })
        .on("mouseover", (event) => la_mouseover(event, tooltip))
        .on("mouseleave", (event) => la_mouseleave(event, tooltip))
        .on("mousemove", (event) => la_mousemove(event, tooltip, nameid));
}

// Tooltip functions
function la_mouseover(event, tooltip) {
    tooltip.style.opacity = 1;
    event.target.style.strokeWidth = linewidth * 3;
}

function la_mousemove(event, tooltip, nameid) {
    let event_value = "-";
    if ('data' in event.target.__data__) {
        event_value = event.target.__data__.data.data;
    }
    tooltip.innerHTML = event.target.__data__.properties[nameid] + ": " + event_value;
    tooltip.style.left = event.pageX + 15 + "px";
    tooltip.style.top = event.pageY +  "px";
}

function la_mouseleave(event, tooltip) {
    tooltip.style.opacity = 0;
    event.target.style.strokeWidth = linewidth;
}


function addInset(features, linearscale, mapcentre, mapscale, padding, svg, nameid, tooltip){
    const path = d3.geoPath(d3.geoMercator()
            .center(mapcentre)
            .scale(mapscale)
            );
   
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
        .attr("d", d => {
            let p = path(d)
            if (p) p = removeExtraBox(p, width, height);
            return p;
            })
        .style("stroke-width", linewidth)
        .style("stroke", "#000")
        .style("fill", d => {
            if ('data' in d) {
                return linearscale(d.data.data);
            } else {
                return "white";
            }
        })
        .on("mouseover", (event) => la_mouseover(event, tooltip))
        .on("mouseleave", (event) => la_mouseleave(event, tooltip))
        .on("mousemove", (event) => la_mousemove(event, tooltip, nameid));


    // draw a square around inset
    svg.append("rect")
        .attr("x", bounds[0][0])
        .attr("y", bounds[0][1])
        .attr('width', bounds[1][0] - bounds[0][0])
        .attr('height', bounds[1][1] - bounds[0][1])
        .style("stroke", "#000")
        .style("fill", "none")
}

// remove extra bounding boxes that the transformation seems to add
function removeExtraBox(pathString, width, height){
    const pattern = new RegExp(
        `M0,0L${width},0L${width},${height}L0,${height}Z`,
        "i"
    );
    return pathString.replace(pattern, "")
}

function set_palette(el) {
    var map_colours = colours[el.value]
    // if palette is loaded successfuly, change the header tint to the correct
    // colour
    if (map_colours) {
        if (map_colours) {
            document.querySelector(".graph-header").style.setProperty("border-bottom", 
                "10px solid rgb(" + map_colours.primary + ")" // Javascript is awful
            )
        }
    }
    // Also set palette options when built
    const palette = [...document.querySelectorAll(".palette-cell")];
    let set_selected = true;
    palette.forEach(cell => {
        if (set_selected) {
            cell.classList.add("palette-cell__selected");
            set_selected = false;
        }
        cell.addEventListener("click", (event) => {
            select_palette_colour(event.currentTarget);
            make_map_if_data();
        })
    })

}

function make_map_if_data() {
    const state = get_map_page_state();
    // If user has entered data in the table, draw the map
    if (state[0].length > 0) {
        draw_map(
            document.getElementById('map'), width, height, ...state
        );
    };
}

function select_palette_colour(el) {
    // Remove element from currently selected palettes
    const selected = [...document.querySelectorAll(".palette-cell__selected")];
    selected.forEach(cell => {
        cell.classList.remove("palette-cell__selected");
    });
    el.classList.add("palette-cell__selected");
}


export function initMapPage() {
    add_grid(document.getElementById('grid'));

    const map_settings = document.getElementById("map-settings");
    const org_list = document.getElementById("org_list");

    set_palette(org_list);

    org_list.addEventListener("change", (event) => {
        set_palette(event.target);
        make_map_if_data();
    })

    map_settings.addEventListener("change", (event) => {
        make_map_if_data();
    });

    document.getElementById("map-dl").addEventListener("click", () => {
        graph_tools.download_svg(document.querySelector('#map > svg'))})
};
