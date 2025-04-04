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

export const interactiveLegendSettings = {
    width: 200
}

export const map_loc = "__urlPrefix__/assets/maps/" //replaced by rollup on build
export const map_data = {
  constituency: {
    2023: {
      file: "PCON_2024.geojson",
      nameid: "PCON24NM",
      ecodeid: "PCON24CD",
      london: [
        "E14001073",
        "E14001081",
        "E14001083",
        "E14001085",
        "E14001086",
        "E14001089",
        "E14001122",
        "E14001123",
        "E14001124",
        "E14001137",
        "E14001153",
        "E14001160",
        "E14001167",
        "E14001169",
        "E14001172",
        "E14001175",
        "E14001186",
        "E14001187",
        "E14001188",
        "E14001189",
        "E14001205",
        "E14001207",
        "E14001208",
        "E14001209",
        "E14001213",
        "E14001221",
        "E14001223",
        "E14001225",
        "E14001229",
        "E14001236",
        "E14001238",
        "E14001257",
        "E14001259",
        "E14001260",
        "E14001264",
        "E14001265",
        "E14001270",
        "E14001271",
        "E14001276",
        "E14001279",
        "E14001290",
        "E14001292",
        "E14001293",
        "E14001300",
        "E14001301",
        "E14001305",
        "E14001306",
        "E14001310",
        "E14001312",
        "E14001331",
        "E14001332",
        "E14001333",
        "E14001334",
        "E14001371",
        "E14001414",
        "E14001417",
        "E14001421",
        "E14001430",
        "E14001434",
        "E14001435",
        "E14001445",
        "E14001448",
        "E14001454",
        "E14001503",
        "E14001525",
        "E14001527",
        "E14001534",
        "E14001550",
        "E14001553",
        "E14001556",
        "E14001558",
        "E14001559",
        "E14001563",
        "E14001576",
        "E14001586",
      ],
      shetland: "S14000051"
    },
    2022: {
      file: "PCON_2022.geojson",
      nameid: "PCON22NM",
      ecodeid: "PCON22CD",
      london: ["E14000540",
      "E14000789",
      "E14000692",
      "E14000676",
      "E14000549",
      "E14000553",
      "E14000558",
      "E14000593",
      "E14000621",
      "E14000629",
      "E14000634",
      "E14000636",
      "E14000639",
      "E14000656",
      "E14000657",
      "E14000673",
      "E14000674",
      "E14000675",
      "E14000679",
      "E14000691",
      "E14000696",
      "E14000701",
      "E14000703",
      "E14000718",
      "E14000720",
      "E14000721",
      "E14000731",
      "E14000732",
      "E14000737",
      "E14000741",
      "E14000750",
      "E14000751",
      "E14000759",
      "E14000760",
      "E14000763",
      "E14000764",
      "E14000770",
      "E14000787",
      "E14000790",
      "E14000823",
      "E14000869",
      "E14000872",
      "E14000882",
      "E14000887",
      "E14000896",
      "E14000900",
      "E14000906",
      "E14000984",
      "E14000998",
      "E14001002",
      "E14001005",
      "E14001007",
      "E14001013",
      "E14001040",
      "E14000551",
      "E14000555",
      "E14000591",
      "E14000592",
      "E14000604",
      "E14000615",
      "E14000654",
      "E14000655",
      "E14000687",
      "E14000690",
      "E14000726",
      "E14000727",
      "E14000752",
      "E14000768",
      "E14000788",
      "E14000978",
      "E14001008",
      "E14001032",
      "E14001036"]
    },
    shetland: "S14000051"
  },
  district: {
    2023: { file: "LAD_2024.geojson", nameid: "LAD24NM", ecodeid: "LAD24CD", shetland: "S12000027" },
    2022: { file: "LAD_2024.geojson", nameid: "LAD24NM", ecodeid: "LAD24CD", shetland: "S12000027" },
  },
  county: {
    2023: {
      file: "CTY_2023.geojson",
      nameid: "CTYUA23NM",
      ecodeid: "CTYUA23CD",
      shetland: "S12000027"
    },
    2022: {
      file: "CTY_2023.geojson",
      nameid: "CTYUA23NM",
      ecodeid: "CTYUA23CD",
      shetland: "S12000027"
    },
  },
};

export function getMapDataAttributes(data_level, data_year) {
    const map_info = map_data[data_level][data_year];
    return {
      ...map_info,
      file: map_loc + map_info.file
    };
  }