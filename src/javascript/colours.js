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
    }
}

const colours = {"MHCLG": mhclg}

export default colours