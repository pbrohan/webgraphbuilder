export const dimensions = {
    w: 266.61 * 3,
    h: 424.52 * 2,
    marginLeft: 20,
    lineWidth: 0.2,
};

export const mapSettings = {
    default: { scale: 2800, centre: [0, 57]},
    london: { scale: 12000, centre: [-0.62, 52.15], padding: 0.1},
    shetland: {scale: 3000, centre: [-3.6, 59.5], padding: 0.1}
};

export const legendSettings = {
    //offset: [4 * dimensions.marginLeft,
    offset:[560,
            dimensions.h * 7 / 10
    ],
    dimensions: {width: 60, height: 200}
}

export const map_loc = "/assets/maps/"
export const map_data = {
    "district" : {'2023': {"file": "LAD_2024.geojson",
                    "nameid": "LAD24NM",
                    "ecodeid": "LAD24CD"},
                '2022': {"file": "LAD_2024.geojson",
                        "nameid": "LAD24NM",
                        "ecodeid": "LAD24CD"},
                },
    "county" : {'2023': {"file": "CTY_2023.geojson",
                        "nameid": "CTYUA23NM",
                        "ecodeid": "CTYUA23CD"},
                '2022': {"file": "CTY_2023.geojson",
                    "nameid": "CTYUA23NM",
                    "ecodeid": "CTYUA23CD"},
                }
}

export function getMapDataAttributes(data_level, data_year) {
    const map_info = map_data[data_level][data_year];
    return {
        file: map_loc + map_info.file,
        nameid: map_info.nameid,
        ecodeid: map_info.ecodeid
    };
}