/*
The most contentious of all of the files! This currently only contains
the MHCLG palette. If othe people want to tell me what their palettes
are they can be added in
*/

const mhclg = {
    primary: [0, 98, 94],
    black: [0, 0, 0],
    white: [255, 255, 255],
    dark: {pink: [147, 42, 114],
           red: [133, 41, 42],
           orange: [191, 74, 29],
           green: [64, 97, 31],
           blue: [33, 80, 132],
           indigo: [51, 51, 102],
           grey: [84, 84, 84]
    },
    light: {pink: [255, 93, 136],
            red: [221, 50, 48],
            orange: [250, 163, 50],
            green: [154, 184, 60],
            blue: [8, 179, 213],
            indigo: [135, 135, 192],
            grey: [153, 152, 143]
    },
    pairs_light: {pink: [154, 184, 60],
                  red: [154, 184, 60],
                  orange: [8, 179, 213],
                  green: [221, 50, 48],
                  blue: [250, 163, 50],
                  indigo: [154, 184, 60],
                  grey: [0, 0, 0]

    }
}

const analytical_function = {
    primary: [18, 67, 109],
    black: [0, 0, 0],
    white: [255, 255, 255],
    dark: {"blue": [18, 67, 109],
           "turquoise": [40, 161, 151],
           "pink": [128, 22, 80],
           "orange": [244, 106, 37],
           "grey": [61, 61, 61],
           "purple": [162, 133, 209] 
    },
    light: {"blue": [18, 67, 109],
           "turquoise": [40, 161, 151],
           "pink": [128, 22, 80],
           "orange": [244, 106, 37],
           "grey": [61, 61, 61],
           "purple": [162, 133, 209] 
    },
    pairs_light: {"blue": [244, 106, 37],
           "turquoise": [128, 22, 80],
           "pink": [40, 161, 151],
           "orange": [18, 67, 109],
           "grey": [255, 255, 255],
           "purple": [61, 61, 61] 
    }
}

const colours = {"Analytical Function": analytical_function,
                "MHCLG": mhclg}

export default colours 